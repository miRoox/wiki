本文详细解释了 Roslyn C# 编译器中增量解析（Incremental Parsing）的工作原理。本文面向正在开发或使用 Roslyn 解析器的开发者，假设读者已熟悉基本的编译器概念。

如需更多背景知识，Neal Gafter 的 [Toy-Incremental-Parser](https://github.com/gafter/Toy-Incremental-Parser/blob/main/README.md) 提供了一个教育性的参考实现。Roslyn 与其共享许多核心思想，但拥有自己的生产级实现。

## 为什么增量解析如此重要

在 IDE 中，用户期望在输入代码时获得即时反馈。每次按键都可能改变语法树，而 IntelliSense、错误波浪线、括号匹配等功能都依赖于最新的解析结果。对于小型文件，从头重新解析足够快，几乎感觉不到延迟。但如果是一个 10 万行的测试文件，或者一个庞大的 API 客户端，每次按键都完整重新解析整个文件就会带来明显的延迟。

增量解析通过尽可能复用上一次解析得到的语法树来解决这个问题。当用户在一个方法内部输入一个字符时，我们不需要重新解析它前后成千上万的其他方法。

## 基础知识：Roslyn 解析器

在深入了解增量机制之前，需要先理解 Roslyn 解析 C# 的几个核心设计。

### 主要是上下文无关的递归下降解析器

Roslyn 使用手写的**递归下降解析器**（recursive descent parser）。该解析器**大部分是上下文无关**的，这意味着语言产生式如 `ClassDeclaration`、`MethodDeclaration`、`Statement`、`Expression` 等，都直接对应于 [`LanguageParser.cs`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/LanguageParser.cs) 中的解析函数。

“大部分”这个限定词很重要。C# 存在一些上下文敏感的结构，例如 `await` 仅在 `async` 方法内部才被视为关键字。解析器通过标志位来跟踪这些上下文，这对增量解析也有影响。但整体设计尽量减少上下文敏感性，以最大化增量复用的可能性。

### Green 节点：无位置、无父指针

关于 “Green 节点” 的完整详细说明，请参阅 [[Roslyn 语法模型内部原理：红/绿树（Red/Green Trees）]]。

Roslyn 采用 **Red-Green 树** 模式。解析器生成的是 **Green 节点**，这些是不可变的节点，仅存储其 **种类（Kind）** 和 **子节点**。关键在于，Green 节点**不存储**：

- 绝对文本位置（Span）
- 父节点指针

Green 节点只存储它们的 **宽度（Width）**（即它们在源代码中占用的字符数）。这一设计对增量解析至关重要：因为 Green 节点不编码绝对位置，即使文件前面的编辑导致其位置发生偏移，它们仍然可以被复用。一个在旧树中位于第 10,000 位的方法声明，在新树中位于第 10,050 位时，Green 节点仍然是完全相同的对象。

更重要的是，**复用意味着对象级别的复用**。当我们说一个节点被“复用”时，指的是新语法树直接指向内存中完全相同的对象。一个庞大的子树可以原封不动地被下一棵树使用，而无需任何复制。唯一需要新分配的，是从根节点到编辑位置路径上的父节点。

这正是增量解析如此高效的原因。一棵语法树可能占用几十兆字节的内存。如果没有增量解析，每次按键都要分配几十 MB；有了增量解析，一次典型编辑只需分配少量字节：几个新的父节点和指针。解析成本与编辑的**影响范围**成正比（通常非常小），而不是与文件大小成正比。

**Red 节点** 是按需构造的包装器，提供包含 Span 和父节点导航的熟悉公共 API。它们在用户代码遍历树时，从 Green 节点懒加载生成。

### 全保真具体语法树（Full-Fidelity Concrete Syntax Tree）

关于 “Full-Fidelity” 的完整说明，请参阅 [[Roslyn 语法模型内部原理：红/绿树（Red/Green Trees）]]。

Roslyn 生成的是**全保真**语法树。源文件中的每一个字符（包括空白、注释，甚至语法错误）都在树中有所体现。如果你按顺序将树中所有 Token（含其 Trivia）拼接起来，会精确得到原始源代码，一字不差。

这一特性对增量解析至关重要。因为语法树完整地表示了源文本，节点和 Token 与它们所解析的文本片段在结构上是同构的。这意味着它们可以安全地作为原始文本的代理被复用。只有在无法复用旧节点或 Token 时，才需要查阅新文本。

### 列表模式（The List Pattern）

解析树是层次化的，节点包含子节点列表：

- `CompilationUnit` 包含成员列表（命名空间、类型等）
- `NamespaceDeclaration` 包含成员列表
- `ClassDeclaration` 包含类型成员列表（方法、属性、字段等）
- `BlockStatement` 包含语句列表

这种“父节点包含子节点列表”的重复模式非常重要，它创造了自然的边界，使得增量复用可以在这些边界处高效发生。

## 增量解析的工作原理

### 增量解析函数

普通的（非增量）解析是一个从文本到语法树的函数：

```
Parse: Text → SyntaxTree
```

增量解析则接受**新文本**、**旧语法树**以及**将旧文本转换为新文本的变更**：

```
IncrementalParse: (NewText, OldTree, TextChange) → NewSyntaxTree
```

`TextChange` 描述了旧文本中哪个区域被替换成了什么内容。有了这些信息，增量解析器就能判断旧语法树中哪些部分仍然有效，可以被复用。

### 通过 Blender 实现 Token 复用

增量解析的核心组件是 **Blender**（搅拌器）（对应代码：[Blender.cs](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/Blender.cs) 和 [Blender.Reader.cs](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/Blender.Reader.cs)）。

Blender 的职责是向解析器提供 Token：当安全时从旧树中取出，否则从词法分析器（Lexer）中获取。

可以把 Blender 想象成一个指向旧树的**游标**，它跟踪新文本中的当前位置对应旧树中的哪个位置。随着解析器消耗 Token，Blender 会推进这个游标。

#### 位置同步与变更增量（Change Delta）

Blender 维护一个 [`_changeDelta`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/Blender.Reader.cs#L30)，它是到当前位置为止，新旧文本长度差异的累积值。在编辑位置之前，新旧文本位置相同，因此 `_changeDelta` 为 0。在编辑位置之后，旧树中的位置需要加上这个 delta 才能对应到新文本中的位置。

例如，如果用户在位置 100 把字符 `1` 替换为 `true`，则 delta 为 +3（4 个字符替换 1 个）。位置 0~99 不变，但旧树中的位置 100 现在对应新文本中的位置 103。

这种簿记机制让 Blender 知道何时“同步”——即当前位置（在新文本中）经过调整后，与旧树中某个 Token 或节点的边界对齐。

#### 解析器如何知道自己的位置

尽管 Green 节点不存储绝对位置，但解析器始终精确知道自己在**新文本**中的位置。它从位置 0 开始，每处理一个 Token 或节点，就累加其宽度。因此，解析器随时都知道自己精确的位置。

将这个位置映射回旧文本非常简单：如果在编辑位置之前，位置完全相同；如果在编辑位置之后，只需加上 delta 即可。

#### Blender 的同步机制

解析器根据新文本中的位置向 Blender 请求数据。Blender 内部会将其转换为旧文本中的对应位置。

Blender 同时也始终知道自己在旧树中的位置。它从 0 开始，每经过一个节点或 Token，就根据其宽度更新位置。

Blender 正是通过这种方式判断是否可以返回旧的 Token 或节点：如果当前游标经过调整后，与旧树中某个节点或 Token 的起始位置对齐，就可以复用；否则位置不同步，必须回退到对新文本进行词法分析。

词法分析会持续进行，直到 Blender 再次到达新旧位置对齐的点，此时复用可以恢复。

对于典型的编辑，重新同步通常在编辑区域之后很快就发生。但一些影响较大的编辑（如插入 `/*`）可能会导致更多内容在重新同步前被重新处理。

#### 何时可以复用 Token

当解析器请求下一个 Token 时，Blender 会检查：

1. 游标是否与旧树中的某个 Token 同步？
2. 该 Token 是否完全位于编辑区域之外？
3. 该 Token 是否通过可复用性检查（详见下文）？

如果所有条件都满足，Blender 就会直接返回旧 Token，无需进行词法分析。这既节省了 CPU 时间（跳过词法分析逻辑），也节省了内存（复用已有对象）。

#### 混合（Blending）与粉碎（Crumbling）

“Blending”（有时称为 “Crumbling”）描述了旧树如何被逐步分解以供复用的过程。Blender 维护一个来自旧树的队列，队列前端的节点会逐步被分解成子节点，直到露出 Token 为止。

过程如下：

1. 从旧树的根节点开始
2. 当一个节点与编辑区域相交（或因其他原因无法复用）时，对其进行**粉碎（Crumble）**：从队列中移除该节点，并将其子节点压入队列
3. 持续此过程，直到队列前端出现 Token
4. 将 Token 返回给解析器

这种懒惰的粉碎机制意味着我们只分解实际需要检查的部分。完全位于编辑区域之前或之后的巨大子树可以保持完整。

这一过程的结果封装在 [`BlendedNode`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/BlendedNode.cs) 结构中，它可能携带复用的节点、复用的 Token，或新词法分析得到的 Token。

### 在策略性位置进行节点复用

Token 复用很有价值，但增量解析的真正威力在于**节点复用**。解析器可以直接从旧树中取出整个 `MethodDeclarationSyntax` 节点，而无需逐个 Token 重新解析。

这种复用发生在解析器中**策略性位置**的列表解析循环中：

- **编译单元成员**：命名空间、顶层类型、全局语句
- **类型成员**：方法、属性、字段、嵌套类型等
- **语句**：方法体和代码块中的内容

这些位置不仅代表了自然的列表边界，还因为它们不受前瞻（lookahead）问题的影响（详见下文 [为什么不复用表达式？](#为什么不复用表达式)）。

典型例子包括：
- [`TryReuseStatement`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/LanguageParser.cs#L8334)（在 `ParseStatementCore` 中调用）
- [`CanReuseMemberDeclaration`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/LanguageParser.cs#L2442)（解析类型成员时调用）

在这些位置，解析器会检查 [`IsIncrementalAndFactoryContextMatches`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/LanguageParser.cs#L14289)，该属性会验证当前是否处于增量解析模式，并且解析器的当前上下文与候选节点当初被解析时的上下文一致。

### 为什么不复用表达式？

你可能会注意到，表达式（Expression）明显不在可复用构造的列表中。这是刻意设计的，与解析器中的**前瞻**有关。

C# 的表达式解析涉及大量前瞻、后顾和上下文敏感性：

- `<` 是泛型参数列表的开始，还是小于运算符？
- `(` 是类型转换、括号表达式、元组、Lambda，还是解构赋值（未来可能更多）？
- 运算符优先级如何影响分组？

由于这些复杂性，判断一个表达式节点在编辑后是否仍然可以安全复用非常困难。一个编辑**发生在表达式之后**，都可能导致该表达式原本的解析方式发生变化。与其构建复杂且易出错的逻辑来检测这些情况，Roslyn 选择了保守的做法：表达式总是重新解析。

相比之下，成员和语句这些策略性复用点被选中，正是因为它们**不会**受到这类前瞻问题的影响。如果一个语句之前能无错误地解析（因此可复用），那么它后面的编辑通常不会让它变成另一种不同的结构。这一结论是通过理解语法和解析器实现，并进行非正式验证后得出的。

表达式总是重新解析是一个实用的权衡。表达式通常较小，重新解析成本很低。而真正的大赢家是复用语句和成员声明——它们可以任意大。（参见 [注意事项](#注意事项) 中关于假设失效的边缘情况。）

## 实际示例

### 一个典型的编辑

假设有一个很大的类：

```csharp
class HugeClass
{
    // ... 方法 0-499 ...

    void Method500()
    {
        // ... 语句 0-99 ...
        
        var x = 1;  // ← 用户把 "1" 改成 "true"
        
        // ... 语句 101-200 ...
    }

    // ... 方法 501-1000 ...
}
```

用户将 `1`（1 个字符）替换为 `true`（4 个字符），变更增量 delta = +3。

解析过程如下：

1. **初始遍历**：Blender 从根节点开始，发现 `CompilationUnitSyntax` 包含编辑区域，于是将其粉碎成子节点。
2. **复用未受影响的成员**：方法 0~499 不包含编辑区域，在解析类型成员的循环中，`CanReuseMemberDeclaration` 判断它们可以整体复用，无需重新解析其内容。
3. **粉碎受影响的方法**：Method500 包含编辑区域，无法整体复用，于是被粉碎成其子节点（修饰符、返回类型、名称、参数、方法体等）。
4. **复用未受影响的语句**：方法体内语句 0~99 不包含编辑区域，通过 `TryReuseStatement` 被全部复用。
5. **重新解析受影响的语句**：包含 `var x = 1` 的语句与编辑区域相交，被逐 Token 重新解析（语句内编辑位置之前的 Token 可能仍被复用）。
6. **复用剩余语句**：语句 101~200 位于编辑之后，Blender 通过 delta 调整位置，重新同步后复用这些语句。
7. **复用剩余成员**：方法 501~1000 同样被复用。

结果：在可能包含成千上万个节点和数万个 Token 的文件中，只有极少数被真正重新解析。新树几乎复用了旧树中所有的 Green 节点（内存中的实际对象）。

### 一个影响更大的编辑

并非所有编辑都如此局部化。假设用户在 Method250 内部输入 `/*`，而 Method750 内部恰好有一个 `*/`：

```csharp
class HugeClass
{
    // ... 方法 0-249 ...

    void Method250() 
    { 
        /*  // ← 用户输入此内容

    // ... 方法 251-749（现在处于注释中！）...

    void Method750() 
    {
        var s = "*/";  // ← 这会结束注释
        // ...
    }

    // ... 方法 751-1000 ...
}
```

此时，`/*` 会使后续大量 Token 失效。词法分析器会生成一个巨大的多行注释 Token，从 Method250 一直延伸到 Method750。方法 251~749 现在处于注释内部，无法作为成员被复用。Method750 中的 `}` 现在实际上关闭的是 Method250。

尽管如此，系统仍能正确工作。Blender 会跳过旧树中被注释 Token 吞噬的大片区域，在 `*/` 之后重新同步，然后继续正常的增量解析。方法 751~1000 仍然可以被复用。

这说明了一个重要观点：增量解析的成本与编辑的**语法影响范围**成正比，而不仅仅是编辑的大小。一个简单的 `1 → true` 编辑语法影响极小，因此复用率极高；把半个文件注释掉的编辑语法影响巨大，成本自然更高。

对于绝大多数真实世界的低影响编辑，增量解析可以在**微秒级**完成，内存复用率接近 99.99%。影响较大的编辑成本更高，但即使在最坏情况下（把整个文件变成注释），其成本也不会超过完整解析。增量解析永远不会明显比完整解析更差，而在通常情况下要好得多。

## 正确性约束

增量解析器非常保守。只有在**确定**节点仍然有效时才会复用它。以下检查确保了这一点：

### 被跳过的 Token（Skipped Tokens）

被跳过的 Token（解析器无法将其纳入有效结构，但为了保持全保真而放入树中的 Token）永远不会被复用。它们的出现表明解析器遇到了意外情况，而这次编辑可能已经改变了这种情况。

例如，文件中有两个方法，M1 包含因语法错误产生的跳过 Token，用户在 M2 中进行编辑。即使编辑完全在 M2 中，M1 也不可复用，会被粉碎并重新解析。

这种保守做法会导致少量额外的重新解析和内存分配。但语法错误在实际代码中较为罕见，因此对整体解析成本的影响很小。

### 缺失的节点和 Token（Missing Nodes/Tokens）

缺失的节点和 Token（解析器在错误恢复时插入的合成内容）同样不会被复用。理由与跳过 Token 相同。

### 其他诊断

解析器可能产生其他类型的诊断（虽较少见），处理方式相同：包含任何诊断的节点都不会被复用。

### 上下文敏感性：解析器标志位

由于 C# 的上下文敏感特性（如 `await`、`field` 等），解析器会在节点上记录上下文标志位。在考虑复用时，会通过 `IsIncrementalAndFactoryContextMatches` 检查当前上下文是否与节点当初解析时的上下文一致。若不匹配，则必须重新解析。

### 合成 Token

某些 Token 是由解析器合成而非词法分析器生成的（如 `>>` 可能表示右移运算符或嵌套泛型的两个右尖括号）。这些 Token 无法简单复用，因为它们的解释依赖于解析上下文。

## 注意事项（Caveats）

增量解析器针对开发者实时编辑真实 C# 文件这一场景进行了优化。某些边缘情况可能会降低性能。

### 巨型表达式

“表达式通常很小”这一假设并非总是成立。如果用户有一个包含百万元素的数组初始化器，或一个巨大的插值字符串，编辑该表达式时将只能进行 Token 复用，无法进行节点复用。

这种情况虽不常见，但确实存在。建议将巨型表达式拆分成更小的部分，以提升增量解析的效果。

### 充满错误的代码文件

增量解析假设树的大部分是格式良好的。散布着大量语法错误的文件会导致许多节点包含诊断或跳过 Token，从而无法复用。在极端情况下（随机文本、二进制文件被误当作 C# 打开），几乎所有内容都无法复用。

这些场景远非正常使用场景。我们针对的是真实 C# 代码。

### 生成的文件

源生成器、T4 模板等生成的文件通常不会被实时编辑，因此不会收到增量编辑请求。对生成文件的完整解析是可以接受的，因为它们不频繁。

Razor 文件是个例外。虽然 Razor 使用源生成，但生成的 C# 代码会在用户每次按键时重新生成。目前 Razor 文件每次都是完整重新解析。对于大型 Razor 文件，这可能成为性能瓶颈。未来可考虑先快速 diff 找出变更区域，再进行增量解析。

### 深度嵌套结构

不经过策略性复用点的深度嵌套结构（如大量无大括号的嵌套 `if`，或深度嵌套的三元表达式）无法受益于节点复用。这类情况较为病态，在实践中很少出现。

## 关键代码位置

想要深入研究实现的开发者可参考以下位置：

### 核心文件

- [`LanguageParser.cs`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/LanguageParser.cs)：主递归下降解析器
- [`Blender.cs`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/Blender.cs)：协调 Token/节点供应
- [`Blender.Reader.cs`](https://github.com/dotnet/roslyn/blob/b2cfaaf967aaad26cd58e7b2cc3f2d9fcede96f4/src/Compilers/CSharp/Portable/Parser/Blender.Reader.cs)：实现游标逻辑和复用检查

### 关键方法

- `TryReuseStatement`：尝试复用语句节点
- `CanReuseMemberDeclaration`：尝试复用类型成员声明
- `IsIncrementalAndFactoryContextMatches`：上下文匹配检查
- `CanReuse`（Blender.Reader 中）：所有可复用性检查的总入口
- `_changeDelta`：位置漂移跟踪

### 相关文档

- [解析器设计指南](#Roslyn 解析器设计指南)：解析器设计指南
- [红/绿树](#Roslyn 语法模型内部原理：红/绿树（Red/Green Trees）)：Red/Green 语法树详细说明
