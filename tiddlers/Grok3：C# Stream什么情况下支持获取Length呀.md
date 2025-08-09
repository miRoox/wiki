> # C# Stream什么情况下支持获取Length呀

在 C# 中，`Stream` 是一个抽象类，不同的派生类（如 `MemoryStream`、`FileStream`、`NetworkStream` 等）对 `Length` 属性的支持情况取决于具体实现。以下是 `Stream` 支持获取 `Length` 属性的情况总结：

### 1. **支持获取 Length 的情况**
`Length` 属性表示流的总长度（以字节为单位）。以下是常见支持获取 `Length` 的流类型：
- **`MemoryStream`**：始终支持获取 `Length`，因为数据存储在内存中，长度是明确已知的。
- **`FileStream`**：通常支持获取 `Length`，因为文件流基于磁盘上的文件，文件大小是确定的。
- **`DeflateStream` / `GZipStream`**（在某些情况下）：如果底层流（如 `MemoryStream` 或 `FileStream`）支持 `Length`，并且流是只读或已完成写入，可能会支持 `Length`。
- **自定义流**：如果自定义的 `Stream` 实现显式支持 `Length` 属性（通过重写 `CanSeek` 和 `Length`），也可以获取。

**条件**：
- 流必须支持查找操作，即 `Stream.CanSeek` 属性返回 `true`。只有支持定位（seekable）的流才能提供 `Length`，因为 `Length` 需要知道流的总大小。
- 流没有被关闭（`Dispose` 或 `Close`），否则会抛出 `ObjectDisposedException`。

### 2. **不支持获取 Length 的情况**
以下情况下，`Stream` 可能不支持获取 `Length`，通常会抛出 `NotSupportedException`：
- **`NetworkStream`**：网络流通常不支持 `Length`，因为数据是通过网络传输的，长度可能未知（例如，流式传输或未完成的数据流）。
- **`CryptoStream`**：加密流通常不支持 `Length`，因为加密过程会改变数据大小，且底层流可能不支持 `Length`。
- **只写流**：某些流（例如某些压缩流或管道流）在写入模式下可能不支持 `Length`，因为数据大小在写入完成前无法确定。
- **非可查找流**：如果 `Stream.CanSeek` 返回 `false`，则 `Length` 属性通常不可用。例如，某些基于管道或实时时钟的流。

### 3. **如何判断是否支持 Length**
在尝试访问 `Length` 属性之前，可以检查 `CanSeek` 属性：
```csharp
if (stream.CanSeek)
{
    long length = stream.Length; // 安全获取 Length
}
else
{
    // 不支持 Length，可能需要其他方式处理
    Console.WriteLine("Stream does not support Length.");
}
```

### 4. **注意事项**
- **异常处理**：访问 `Length` 时，建议用 `try-catch` 捕获可能的 `NotSupportedException` 或 `ObjectDisposedException`：
  ```csharp
  try
  {
      long length = stream.Length;
      Console.WriteLine($"Stream length: {length}");
  }
  catch (NotSupportedException)
  {
      Console.WriteLine("Stream does not support Length.");
  }
  catch (ObjectDisposedException)
  {
      Console.WriteLine("Stream is closed.");
  }
  ```
- **性能**：对于某些流（如 `FileStream`），获取 `Length` 可能涉及底层系统调用，频繁调用可能影响性能。
- **动态流**：对于动态增长的流（如 `MemoryStream`），`Length` 可能在写入过程中不断变化。

### 5. **示例代码**
以下是一个示例，展示不同流对 `Length` 的支持：
```csharp
using System;
using System.IO;
using System.Net.Sockets;

class Program
{
    static void Main()
    {
        // MemoryStream: 支持 Length
        using (var memoryStream = new MemoryStream(new byte[] { 1, 2, 3 }))
        {
            Console.WriteLine($"MemoryStream Length: {memoryStream.Length}"); // 输出 3
        }

        // FileStream: 支持 Length
        using (var fileStream = new FileStream("example.txt", FileMode.OpenOrCreate))
        {
            Console.WriteLine($"FileStream Length: {fileStream.Length}");
        }

        // NetworkStream: 不支持 Length
        try
        {
            using (var client = new TcpClient())
            using (var networkStream = client.GetStream())
            {
                Console.WriteLine($"NetworkStream Length: {networkStream.Length}");
            }
        }
        catch (NotSupportedException)
        {
            Console.WriteLine("NetworkStream does not support Length.");
        }
    }
}
```

### 6. **总结**
- `Stream` 支持 `Length` 的前提是 `CanSeek` 为 `true`，常见于 `MemoryStream` 和 `FileStream`。
- 不支持 `Length` 的情况通常涉及 `NetworkStream`、某些压缩流或非可查找流。
- 使用时检查 `CanSeek` 或用异常处理确保代码健壮性。

如果你有具体场景或流类型需要进一步分析，可以提供更多细节，我可以帮你深入探讨！

> # `CanSeek` 为`true`一定支持`Length`吗

不，`CanSeek` 为 `true` **不一定**保证 `Stream` 支持获取 `Length` 属性。虽然 `CanSeek` 为 `true` 表示流支持定位操作（seekable），但 `Length` 属性的可用性还取决于流的实现。以下是详细分析：

### 1. **CanSeek 和 Length 的关系**
- `CanSeek` 属性表示流是否支持定位操作（如 `Seek` 方法）。只有当 `CanSeek` 为 `true` 时，`Length` 属性才有**可能**被支持，因为获取流的长度通常需要流具有确定的边界或大小。
- 但是，`CanSeek` 为 `true` 并不意味着 `Length` 一定可用。流的实现可能在支持定位的同时，仍然无法提供确切的长度信息。

### 2. **支持 CanSeek 但不支持 Length 的情况**
某些流可能支持定位操作（`CanSeek` 为 `true`），但由于底层实现限制，尝试访问 `Length` 属性会抛出 `NotSupportedException`。以下是一些可能的情况：
- **部分自定义流**：某些自定义实现的 `Stream` 类可能支持定位（例如通过 `Seek` 方法移动指针），但由于流的长度未知或动态变化，`Length` 属性未被实现。
- **某些压缩流**：例如，`DeflateStream` 或 `GZipStream` 在某些情况下可能支持 `Seek`（如果底层流支持），但由于压缩数据的长度在解压前无法确定，`Length` 属性可能不可用。
- **稀疏文件或特殊文件流**：某些文件系统中的稀疏文件（sparse file）可能支持定位，但获取总长度可能受限于文件系统的实现。

### 3. **常见支持 CanSeek 和 Length 的流**
以下流的 `CanSeek` 为 `true` 时，通常也支持 `Length`：
- **`MemoryStream`**：内存流始终支持 `Length`，因为数据大小在内存中是明确的。
- **`FileStream`**：文件流通常支持 `Length`，因为文件大小可以从文件系统中获取。
- **某些包装流**：如果底层流支持 `Length` 和 `CanSeek`，包装流（如 `BufferedStream`）通常也支持。

### 4. **如何安全检查 Length 是否可用**
由于 `CanSeek` 为 `true` 不保证 `Length` 可用，建议通过以下方式检查：
```csharp
if (stream.CanSeek)
{
    try
    {
        long length = stream.Length;
        Console.WriteLine($"Stream Length: {length}");
    }
    catch (NotSupportedException)
    {
        Console.WriteLine("Stream supports seeking but does not support Length.");
    }
}
else
{
    Console.WriteLine("Stream does not support seeking or Length.");
}
```

### 5. **示例：可能不支持 Length 的流**
以下是一个自定义流的示例，展示 `CanSeek` 为 `true` 但 `Length` 不支持的情况：
```csharp
using System;
using System.IO;

class CustomStream : Stream
{
    public override bool CanRead => true;
    public override bool CanSeek => true; // 支持定位
    public override bool CanWrite => true;
    public override long Position { get; set; }

    public override long Seek(long offset, SeekOrigin origin) => Position = offset;
    public override void Flush() { }
    public override int Read(byte[] buffer, int offset, int count) => 0;
    public override void Write(byte[] buffer, int offset, int count) { }

    public override long Length
    {
        get => throw new NotSupportedException("Length not supported."); // 显式不支持 Length
    }

    public override void SetLength(long value) => throw new NotSupportedException();
}

class Program
{
    static void Main()
    {
        using (var stream = new CustomStream())
        {
            Console.WriteLine($"CanSeek: {stream.CanSeek}"); // 输出 true
            try
            {
                Console.WriteLine($"Length: {stream.Length}");
            }
            catch (NotSupportedException ex)
            {
                Console.WriteLine(ex.Message); // 输出 "Length not supported."
            }
        }
    }
}
```

### 6. **结论**
- `CanSeek` 为 `true` 是支持 `Length` 的**必要条件**，但**不是充分条件**。
- 某些流（尤其是自定义流或特殊流）可能支持定位但不提供长度信息，访问 `Length` 会抛出异常。
- 实际使用时，始终建议通过 `try-catch` 检查 `Length` 是否可用，以确保代码健壮性。

如果你有具体的流类型或场景需要分析，可以提供更多细节，我可以进一步帮你确认！

