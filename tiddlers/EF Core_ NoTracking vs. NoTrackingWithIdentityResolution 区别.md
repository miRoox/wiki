`QueryTrackingBehavior` 在 [[Entity Framework Core]] (EF Core) 中用于控制查询结果的跟踪行为。`NoTracking` 和 `NoTrackingWithIdentityResolution` 的主要区别在于是否进行身份解析（Identity Resolution）。

### NoTracking

使用 `NoTracking` 时，EF Core 不会跟踪查询返回的实体 [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking). 这意味着：

*   **不跟踪更改：** 对返回的实体所做的任何更改都不会被 EF Core 自动检测到，并且在调用 `SaveChanges` 时不会持久化到数据库 [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking)[6](https://www.c-sharpcorner.com/article/maximizing-performance-in-entity-framework-co-tracking-vs-no-tracking/).
*   **不进行身份解析：** 即使查询结果中包含多次相同的实体，每次都会返回一个新的实例 [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking).
*   **性能优势：** 由于不需要设置更改跟踪信息，通常执行速度更快，内存消耗更少 [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking)[3](https://medium.com/@anyanwuraphaelc/benefits-of-asnotracking-in-entity-framework-core-a-guide-to-improved-performance-186ed44a5eb7).
*   **适用于只读场景：** 当你只需要显示数据而不需要修改时，`NoTracking` 非常有用 [4](https://www.woodruff.dev/no-tracking-queries-speed-up-your-ef-core-like-a-pro/).

### NoTrackingWithIdentityResolution

使用 `NoTrackingWithIdentityResolution` 时：

*   **不跟踪更改：** 类似于 `NoTracking`，查询返回的实体不被 EF Core 上下文跟踪 [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking).
*   **进行身份解析：** 如果结果集中包含多次相同的实体，EF Core 会返回相同的实例。这是通过在后台使用一个独立的更改跟踪器来实现的 [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking).
*   **用途：** 当你需要确保结果集中相同实体只有一个实例，但又不想跟踪这些实体时，可以使用 `NoTrackingWithIdentityResolution` [1](https://learn.microsoft.com/en-us/ef/core/querying/tracking).

### 示例代码

以下是一些示例代码，展示了如何在 EF Core 中使用这两种 `QueryTrackingBehavior`：

```csharp project="EFCoreExample" file="Program.cs" version=1
using Microsoft.EntityFrameworkCore;
using System.Linq;

public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }
}

public class BloggingContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseInMemoryDatabase("MyDatabase");
    }
}

public class Example
{
    public static void Main()
    {
        using (var context = new BloggingContext())
        {
            context.Database.EnsureDeleted();
            context.Database.EnsureCreated();

            context.Blogs.Add(new Blog { BlogId = 1, Url = "http://example.com/blog1" });
            context.Blogs.Add(new Blog { BlogId = 2, Url = "http://example.com/blog2" });
            context.SaveChanges();
        }

        // NoTracking 示例
        using (var context = new BloggingContext())
        {
            var blogs = context.Blogs
                .AsNoTracking()
                .ToList();

            Console.WriteLine("NoTracking:");
            foreach (var blog in blogs)
            {
                Console.WriteLine($"BlogId: {blog.BlogId}, URL: {blog.Url}, Instance: {blog.GetHashCode()}");
            }
        }

        // NoTrackingWithIdentityResolution 示例
        using (var context = new BloggingContext())
        {
            var blogs = context.Blogs
                .AsNoTrackingWithIdentityResolution()
                .ToList();

            Console.WriteLine("\nNoTrackingWithIdentityResolution:");
            foreach (var blog in blogs)
            {
                Console.WriteLine($"BlogId: {blog.BlogId}, URL: {blog.Url}, Instance: {blog.GetHashCode()}");
            }
        }
    }
}
```

### 总结

*   `NoTracking`：不跟踪实体，每次都返回新的实例，适用于只读场景。
*   `NoTrackingWithIdentityResolution`：不跟踪实体，但对结果集中的相同实体进行身份解析，确保每个实体只有一个实例。

选择哪种方式取决于你的具体需求。如果你不需要跟踪实体并且希望获得最佳性能，`NoTracking` 是一个不错的选择。如果你需要确保结果集中相同实体只有一个实例，那么 `NoTrackingWithIdentityResolution` 更适合。
