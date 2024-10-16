要在 [Git](#Git) 中配置 [GPG](#GPG) 程序，您需要确保 Git 知道您要使用的 GPG 可执行文件的路径。以下是配置 GPG 程序的步骤：

1. **安装 GPG**：首先，确保您已经安装了 GPG。对于 Windows 用户，可以下载并安装 [Gpg4Win](https://gpg4win.org/)。

2. **找到 GPG 可执行文件的路径**：安装完成后，您需要找到 `gpg.exe` 的路径。通常情况下，它位于 `C:\Program Files (x86)\GnuPG\bin\gpg.exe`。

3. **配置 Git 使用 GPG**：打开终端或 Git Bash，运行以下命令来配置 Git 使用 GPG：

   ```bash
   git config --global gpg.program "C:/Program Files (x86)/GnuPG/bin/gpg.exe"
   ```

   请根据您的实际安装路径调整命令中的路径。

4. **设置 GPG 签名密钥**：接下来，您需要设置 GPG 签名密钥。首先，使用以下命令列出您的 GPG 密钥：

   ```bash
   gpg --list-secret-keys --keyid-format LONG
   ```

   找到您想要使用的密钥 ID，然后运行以下命令：

   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   ```

   将 `YOUR_KEY_ID` 替换为您找到的密钥 ID。

5. **默认签名所有提交**：如果您希望 Git 默认签名所有提交，可以运行以下命令：

   ```bash
   git config --global commit.gpgsign true
   ```

6. **配置 GPG 代理**（可选）：如果您希望在一定时间内不需要输入密码，可以配置 GPG 代理。在 `C:\Users\username\.gnupg\gpg-agent.conf` 文件中添加以下内容（如果文件不存在，请创建它）：

   ```plaintext
   default-cache-ttl 34560000
   max-cache-ttl 34560000
   ```

   这将设置缓存时间为 40 天（以秒为单位）。完成后，重启 GPG 代理：

   ```bash
   gpgconf --kill gpg-agent
   ```

通过以上步骤，您就可以成功配置 Git 使用 GPG 程序进行签名了。如果在配置过程中遇到问题，可以参考 [GitHub 文档](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key) 以获取更多信息。
