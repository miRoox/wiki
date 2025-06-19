在 `git clone` 之后，你需要单独拉取 submodules 的内容。以下是几种方法：

1.  **使用 `git submodule update` 命令** [3](https://phoenixnap.com/kb/git-clone-submodule)

    这是最常用的方法。首先，你需要初始化 submodules，然后更新它们：

    ```bash
    git submodule init
    git submodule update --recursive
    ```

    或者，你可以将这两步合并成一步：

    ```bash
    git submodule update --init --recursive
    ```

    `--init` 确保 submodules 被正确初始化，`--recursive` 确保所有嵌套的 submodules 也被更新 [3](https://phoenixnap.com/kb/git-clone-submodule)。

2.  **在 `git clone` 时使用 `--recurse-submodules` 选项** [3](https://phoenixnap.com/kb/git-clone-submodule)

    如果你在克隆仓库时就知道它包含 submodules，可以使用 `--recurse-submodules` 选项：

    ```bash
    git clone --recurse-submodules <repository-url>
    ```

    对于较新的 Git 版本（1.9 及更高版本），这会自动初始化并更新 submodules [3](https://phoenixnap.com/kb/git-clone-submodule)。

    如果你使用的是旧版本的 Git（1.6.5 到 1.9），可以使用 `--recursive` 标志：

    ```bash
    git clone --recursive <repository-url>
    ```

3.  **使用 `git clone` 命令和 `-j<n>` 选项并行拉取** [3](https://phoenixnap.com/kb/git-clone-submodule)

    对于 Git 2.8 及更高版本，你可以使用 `-j<n>` 选项来并行拉取 submodules，从而加快 checkout 过程：

    ```bash
    git clone --recurse-submodules -j8 <repository-url>
    ```

    这里的 `8` 代表并行拉取的数量。

**总结**

通常，在克隆后，最简单的方法是使用：

```bash
git submodule update --init --recursive
```

这会确保所有 submodules 都被正确地拉取和初始化 [3](https://phoenixnap.com/kb/git-clone-submodule)。
