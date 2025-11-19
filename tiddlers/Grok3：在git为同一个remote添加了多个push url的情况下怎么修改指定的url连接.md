在 Git 中，一个 remote（比如 `origin`）可以配置多个 `pushurl`，常见于同时推送到 GitHub + Gitee/GitLab 等镜像，或者公司内部有多个备份仓库的情况。

你可以用以下方式**查看当前 remote 的所有配置**：

```bash
# 查看详细的 remote 配置（推荐）
git remote -v

# 或者更详细地看所有 url（包括多个 pushurl）
git config --get-regexp ^remote.origin.
```

输出可能是这样的：

```text
remote.origin.url git@github.com:username/repo.git
remote.origin.pushurl git@github.com:username/repo.git
remote.origin.pushurl git@git.company.com:username/repo.git
remote.origin.pushurl git@gitee.com:username/repo.git
```

### 目标：只修改其中某一个特定的 pushurl

Git 本身没有直接的 `git remote set-pushurl <old> <new>` 这种命令来替换指定的某一行，但可以通过以下几种方式精确地修改或删除再添加来实现：

#### 方法一：先删除要改的那一个，再添加新的（推荐，最干净）

```bash
# 1. 删除你想修改的那一个 pushurl
# 比如你要改掉 gitee 的那个
git remote remove-pushurl origin git@gitee.com:username/repo.git

# 2. 添加新的地址
git remote add-pushurl origin git@gitee.com:username/new-repo.git

# 或者如果你想完全替换成另一个仓库
git remote set-url --push origin git@new-company.com:username/repo.git --add
```

> `remove-pushurl` 和 `add-pushurl` 是 Git 2.39+ 才正式加入的子命令（之前叫 --add/--delete），如果你 Git 版本较老可以用下面方法二。

#### 方法二：用 git config 直接编辑（适用于所有 Git 版本）

```bash
# 先列出所有 pushurl，看看顺序
git config --get-all remote.origin.pushurl

# 假设输出是：
# git@github.com:username/repo.git
# git@git.company.com:username/repo.git
# git@gitee.com:username/repo.git

# 你想把第三个（gitee那个）改掉，可以先删掉再加
git config --unset-all remote.origin.pushurl   # 慎用！会删光所有 pushurl
# 更好的做法：只删掉匹配的那一行
git config --unset remote.origin.pushurl git@gitee.com:username/repo.git

# 然后重新添加新的
git config --add remote.origin.pushurl git@gitee.com:username/newname/repo.git
```

如果有多行相同的前缀，可以用正则删（小心使用）：

```bash
# 删除包含 gitee.com 的那一行（Git 2.33+ 支持）
git config --unset remote.origin.pushurl --regexp gitee\.com
```

#### 方法三：直接手动编辑 .git/config（最直观）

打开项目下的 `.git/config` 文件，找到类似这一段：

```ini
[remote "origin"]
    url = git@github.com:username/repo.git
    fetch = +refs/heads/*:refs/remotes/origin/*
    pushurl = git@github.com:username/repo.git
    pushurl = git@git.company.com:username/repo.git
    pushurl = git@gitee.com:username/repo.git
```

直接把你要改的那一行 `pushurl = ...` 改成新的地址保存即可。

### 总结：推荐操作流程（最安全）

```bash
# 1. 先确认当前所有 pushurl
git remote -v
git config --get-all remote.origin.pushurl

# 2. 删除你要改的那一个（精确匹配）
git remote remove-pushurl origin git@gitee.com:old/repo.git
# 或者旧版本 Git 用：
git config --unset remote.origin.pushurl git@gitee.com:old/repo.git

# 3. 添加新的
git remote add-pushurl origin git@gitee.com:new/repo.git
# 或者旧版本：
git config --add remote.origin.pushurl git@gitee.com:new/repo.git

# 4. 再次验证
git remote -v
git config --get-all remote.origin.pushurl
```

这样就能精确地只修改你指定的那一个 push URL，而不影响其他地址了。
