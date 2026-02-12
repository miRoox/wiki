在 Roslyn（.NET 编译器平台）中，C# 检查器（通常称为代码分析器，Code Analyzer）是通过实现特定的接口和类来创建的，用于静态代码分析、诊断和代码修复。以下是 Roslyn 中 C# 检查器接口的核心结构和实现方式的概述：

---

### 1. **核心接口和类**
Roslyn 的代码分析器主要基于以下核心接口和类，位于 `Microsoft.CodeAnalysis.Diagnostics` 命名空间中：

#### **DiagnosticAnalyzer**
- **描述**：这是 Roslyn 分析器的主要基类。所有自定义分析器都必须继承自 `DiagnosticAnalyzer`。
- **关键方法**：
  - `Initialize(AnalysisContext context)`：用于注册分析器要监听的代码事件（例如，语法节点、符号、操作等）。
  - `SupportedDiagnostics`：一个属性，返回分析器支持的诊断规则（`DiagnosticDescriptor` 集合）。

#### **AnalysisContext**
- **描述**：在 `Initialize` 方法中，`AnalysisContext` 提供上下文，允许分析器注册对特定代码元素的分析。
- **常用方法**：
  - `RegisterSyntaxNodeAction`：注册对特定语法节点的分析。
  - `RegisterSymbolAction`：注册对符号（如类、方法、变量等）的分析。
  - `RegisterCodeBlockAction`：注册对代码块的分析。
  - `RegisterSemanticModelAction`：注册对语义模型的分析。
  - `ReportDiagnostic`：用于报告诊断问题（如警告或错误）。

#### **DiagnosticDescriptor**
- **描述**：定义诊断的元数据，例如诊断的 ID、标题、描述、严重性等。
- **构造函数**：
  ```csharp
  public DiagnosticDescriptor(string id, string title, string messageFormat, string category, DiagnosticSeverity severity, bool isEnabledByDefault, string description = null, string helpLinkUri = null);
  ```
  - `id`：诊断的唯一标识符。
  - `title`：诊断标题。
  - `messageFormat`：诊断消息的格式化字符串。
  - `category`：诊断分类（如命名、性能等）。
  - `severity`：严重性（`Error`、`Warning`、`Info` 等）。

---

### 2. **实现一个简单的 C# 分析器**
以下是一个简单的分析器示例，用于检测方法名是否以大写字母开头，并报告警告：

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using System.Collections.Immutable;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class MethodNameAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "MethodNameAnalyzer";
    private static readonly LocalizableString Title = "Method name should start with uppercase";
    private static readonly LocalizableString MessageFormat = "Method '{0}' should start with an uppercase letter";
    private static readonly LocalizableString Description = "Method names should follow PascalCase convention.";
    private const string Category = "Naming";

    private static readonly DiagnosticDescriptor Rule = new DiagnosticDescriptor(
        DiagnosticId,
        Title,
        MessageFormat,
        Category,
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: Description);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        // 防止分析器在生成代码（如 auto-generated code）上运行
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        // 注册对方法声明的分析
        context.RegisterSymbolAction(AnalyzeSymbol, SymbolKind.Method);
    }

    private static void AnalyzeSymbol(SymbolAnalysisContext context)
    {
        // 获取方法符号
        var methodSymbol = (IMethodSymbol)context.Symbol;

        // 检查方法名是否以大写字母开头
        if (!string.IsNullOrEmpty(methodSymbol.Name) && char.IsLower(methodSymbol.Name[0]))
        {
            // 创建诊断
            var diagnostic = Diagnostic.Create(Rule, methodSymbol.Locations[0], methodSymbol.Name);
            context.ReportDiagnostic(diagnostic);
        }
    }
}
```

---

### 3. **分析器的工作流程**
1. **定义诊断规则**：
   - 使用 `DiagnosticDescriptor` 定义诊断的元数据（ID、消息、严重性等）。
   - 分析器通过 `SupportedDiagnostics` 属性声明支持的诊断。

2. **注册分析动作**：
   - 在 `Initialize` 方法中，使用 `AnalysisContext` 注册需要分析的代码元素（如语法节点、符号等）。
   - 常见的注册方法包括：
     - `RegisterSyntaxNodeAction`：分析特定语法节点（如 `MethodDeclarationSyntax`）。
     - `RegisterSymbolAction`：分析符号（如方法、类、字段等）。
     - `RegisterOperationAction`：分析操作（如方法调用、赋值等）。

3. **执行分析**：
   - 在注册的动作中，分析代码并通过 `context.ReportDiagnostic` 报告问题。
   - 使用 Roslyn 的语法树和语义模型来获取代码的详细信息（如类型、作用域等）。

4. **报告诊断**：
   - 使用 `Diagnostic.Create` 创建诊断对象，并通过 `ReportDiagnostic` 提交给 Roslyn。

---

### 4. **代码修复（Code Fix）**
分析器通常与代码修复提供程序（Code Fix Provider）配对，用于提供修复建议。代码修复通过以下接口实现：
- **CodeFixProvider**：实现 `ICodeFixProvider` 接口，定义如何修复诊断。
- **关键方法**：
  - `RegisterCodeFixesAsync`：注册修复动作。
  - 使用 `Document` 和 `SyntaxNode` 修改代码。

示例代码修复（将方法名首字母改为大写）：
```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CodeFixes;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Threading.Tasks;

[ExportCodeFixProvider(LanguageNames.CSharp, Name = nameof(MethodNameCodeFixProvider))]
public class MethodNameCodeFixProvider : CodeFixProvider
{
    public sealed override ImmutableArray<string> FixableDiagnosticIds => ImmutableArray.Create(MethodNameAnalyzer.DiagnosticId);

    public sealed override FixAllProvider GetFixAllProvider() => WellKnownFixAllProviders.BatchFixer;

    public sealed override async Task RegisterCodeFixesAsync(CodeFixContext context)
    {
        var root = await context.Document.GetSyntaxRootAsync(context.CancellationToken).ConfigureAwait(false);
        var diagnostic = context.Diagnostics.First();
        var diagnosticSpan = diagnostic.Location.SourceSpan;

        // 找到方法声明
        var methodDeclaration = root.FindToken(diagnosticSpan.Start).Parent.AncestorsAndSelf().OfType<MethodDeclarationSyntax>().First();

        context.RegisterCodeFix(
            CodeAction.Create(
                title: "Make method name PascalCase",
                createChangedDocument: c => MakeUppercaseAsync(context.Document, methodDeclaration, c),
                equivalenceKey: nameof(MethodNameCodeFixProvider)),
            diagnostic);
    }

    private async Task<Document> MakeUppercaseAsync(Document document, MethodDeclarationSyntax methodDecl, CancellationToken cancellationToken)
    {
        var oldName = methodDecl.Identifier.Text;
        var newName = char.ToUpper(oldName[0]) + oldName.Substring(1);

        var newMethodDecl = methodDecl.WithIdentifier(SyntaxFactory.Identifier(newName));
        var oldRoot = await document.GetSyntaxRootAsync(cancellationToken).ConfigureAwait(false);
        var newRoot = oldRoot.ReplaceNode(methodDecl, newMethodDecl);

        return document.WithSyntaxRoot(newRoot);
    }
}
```

---

### 5. **如何集成和测试**
- **NuGet 包**：
  - 确保项目引用 `Microsoft.CodeAnalysis.CSharp.Workspaces` 和 `Microsoft.CodeAnalysis.Analyzers`。
- **项目结构**：
  - 分析器项目通常是一个类库，需设置为 `Analyzer` 项目类型（在 `.csproj` 中设置 `<IncludeInVSIX>true</IncludeInVSIX>`）。
- **测试**：
  - 使用 `Microsoft.CodeAnalysis.Testing` 包编写单元测试，模拟代码并验证诊断和修复。
- **部署**：
  - 打包为 VSIX 扩展或 NuGet 包，供 Visual Studio 或其他 IDE 使用。

---

### 6. **注意事项**
- **性能**：分析器运行在编译期间，需优化以避免性能问题。例如，使用 `ConfigureGeneratedCodeAnalysis` 忽略生成代码。
- **并发**：通过 `context.EnableConcurrentExecution()` 启用并发执行以提高效率。
- **兼容性**：确保分析器支持目标 C# 语言版本。

---

### 7. **参考资源**
- **官方文档**：Microsoft Docs 上的 Roslyn 分析器文档（https://docs.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/）。
- **GitHub 示例**：Roslyn 的 GitHub 仓库（https://github.com/dotnet/roslyn）提供大量示例。
- **NuGet 包**：`Microsoft.CodeAnalysis.CSharp` 和 `Microsoft.CodeAnalysis.Analyzers`。

如果你有具体的需求（如分析特定代码模式或实现复杂修复），可以提供更多细节，我可以为你定制更具体的代码示例！
