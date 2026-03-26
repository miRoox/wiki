六个月前，我开始钻研 Roslyn 的源代码，以理解什么是红绿树。下面是我精简后的总结——正是我当时希望能读到的那篇文章。

有一篇微软的文章《[持久化、外观模式与 Roslyn 的红绿树](https://learn.microsoft.com/ru-ru/archive/blogs/ericlippert/persistence-facades-and-roslyns-red-green-trees)》，它对这个概念做了简洁明了的解释。但即使读完之后，我仍有许多地方不清楚，于是我亲自深入研究了 Roslyn 的源码。

## Roslyn 的整体架构

首先需要澄清一点：Roslyn 被设计为同时支持 C# 和 Visual Basic 两种语言，因此它引入了抽象的 `SyntaxNode`。如果 Roslyn 只服务于 C#，那么 `RawKind` 这样的属性和 `CreateSeparator` 这样的方法很可能就不需要了。

**语法相关的主要抽象：**

- **SyntaxTree** —— 入口点，提供根节点 `CompilationUnitSyntax`。
- **SyntaxNode** —— 语法树中的任意节点（语句、表达式、声明等）。
- **SyntaxToken** —— 叶子节点，保存实际的文本（如 `if`、`{`、标识符）。
- **SyntaxTrivia** —— 空白、注释、`#region` 指令等一切不影响语义的内容。
- **SyntaxList<T> / SeparatedSyntaxList<T>** —— 子节点的集合，通常中间穿插分隔符。

这些抽象都不绑定于特定的语言（C# 或 VB）。

## 什么是红节点（Red Node）？

红节点本身是不可变的，只携带最少的语法信息。本质上，红节点只是一个包装器，包含：
- 它所属的 `SyntaxTree`；
- 指向父节点的引用（如果有）；
- 在源文本中的绝对位置；
- 对应的绿节点（Green Node）。

所有详细的语法信息都存放在绿节点中，而非红节点。红节点只是“发布”这些数据，因此红节点占用的内存明显少于对应的绿节点。

红节点和绿节点一样都是**不可变的**，但红节点的不可变性主要不是为了缓存，而是为了**线程安全**：任何 `SyntaxNode` 都可以安全地被多个线程读取。

需要注意的是：红节点**本身不被缓存或复用**。即使只修改源代码中的一个字符，也会触发整个红树的重新构建。这听起来很激进，但正如后面会看到的，其实并没有那么可怕。

任何“修改”红节点的方法，实际上都会创建一个**新的实例**，并带上更新后的参数；原始节点保持不变。

例如下面这段代码：

```csharp
var left  = SyntaxFactory.IdentifierName("a");
var right = SyntaxFactory.IdentifierName("b");
var sum   = SyntaxFactory.BinaryExpression(
    SyntaxKind.AddExpression,
    left,
    SyntaxFactory.Token(SyntaxKind.PlusToken),
    right);
```

此时 `left != sum.Left` —— 它们是两个完全不同的对象：拥有不同的父节点、不同的位置，甚至属于不同的语法树。

## SyntaxToken 和 SyntaxTrivia

从本质上讲，这两个结构也属于红节点家族，但有一个区别：单个实例可能“知道”也可能“不知道”它所属的红树。

### SyntaxToken 有两种形式：

- **带树链接** —— 携带：
  1. 父红节点的引用；
  2. 在文本中的绝对位置；
  3. 一个索引（后面会解释）；
  4. 对应的绿节点。
- **不带树链接** —— 只保存绿节点。

### SyntaxTrivia 的结构类似：

一个 `SyntaxToken` 加上它自己的绿节点、位置和索引（索引细节稍后说明）。

### 为什么需要这些单独的结构？

每个红节点都持有对语法树的引用。如果你用 `SyntaxFactory.BinaryExpression` 创建一个节点，它已经拥有一个树。为每一个逗号都创建一个完整的树会非常浪费——同样的道理也适用于 `SyntaxTrivia`。

出于效率考虑，树是**懒加载**的：如果一个节点没有缓存的树引用，Roslyn 会向上查找父节点，直到找到一个已有树的父节点；如果都没找到，则当场创建一个新树。

## 绿节点（Green Nodes）

这里才是真正发生“魔法”的地方：红节点只是围绕绿节点的便捷“包装器”，因此绿节点知道的一切，最终都可以通过它的红节点访问到。

**绿节点包含什么？** 其实列出它**不包含**什么会更容易。

绿节点同样是**不可变的**。与红节点不同的是，你只能**向下**导航绿节点：绿节点完全不知道自己的父节点。它也不存储**绝对位置**，只存储自己的**宽度**（即它在源代码中占用的字符数，例如关键字 `if` 的宽度为 2）。

**绿节点会被缓存和复用。**

以极高的概率（约 95%），同一个关键字（如 `for`、`if`、`var`、`int`、`async`、`await` 等）的每次出现，都指向**完全相同的绿节点**。

对于那些文本在编译时已知的 *TokenWithWellKnownText*（引号、`+`、`-`、关键字等），Roslyn 会预先创建**五种缓存的绿节点变体**：
- **无 Trivia**：例如 `if` 存放在 `s_tokensWithNoTrivia`
- **单个尾随空格**：例如 `if␠` 存放在 `s_tokensWithSingleTrailingSpace`
- **Elastic Trivia**：例如 `if{elastic}` 存放在 `s_tokensWithElasticTrivia`
- **尾随 CRLF**：例如 `if⏎` 存放在 `s_tokensWithSingleTrailingCRLF`
- **“缺失”Token**：例如缺失的分号 `;` 存放在 `s_missingTokensWithNoTrivia`

> **什么是 Elastic Trivia？**  
> 它是一个特殊的“橡皮”占位符，IDE 的格式化器之后可以将其替换为合适的缩进或换行。这对代码生成器非常有用：生成器可以发出不带多余空白的 AST，然后让 Roslyn 负责后续的美化打印。

因此，当你写一个普通的 `if` 时：

```csharp
if ( ... )
```

解析器只需直接取出已缓存的“带单个尾随空格”的 `if` 绿节点即可。

但如果你写成这样：

```csharp
if   // run, I’m crazy
( ... )
// 或者
for /* Fredie, are you OK? */ ( ... )
```

由于周围的 Trivia 不同，解析器就必须创建一个全新的绿节点，而无法复用缓存的那个。

与红树不同——红树中修改哪怕一个字符都会导致整棵红树重建——绿树的处理要温和得多：虽然仍会生成一棵新的绿树，但它会**复用大约 99% 的原有绿节点**。

### 绿节点生成红节点

每个绿节点都实现了抽象方法：`abstract RedNode CreateRed(RedNode? parent, int position);`（这里的 `RedNode` 就是 `SyntaxNode`，我用这个名字只是为了更清晰）。

绿节点工厂（源码中简称为 `SyntaxFactory`）的逻辑是：
1. 检查是否存在已缓存的节点；
2. 如果存在，则直接返回缓存实例；
3. 如果不存在，则创建新绿节点并尝试缓存它。

红节点工厂的逻辑则是：
1. 对传入数据进行验证；
2. 从红对象（`SyntaxNode`、`SyntaxToken`、`SyntaxTrivia`）中提取底层的绿节点；
3. 调用绿工厂获取（或创建）合适的绿节点；
4. 用该绿节点包装成一个新的红节点并返回。
