要将 GPG 密钥迁移到另一台机器上，可以按照以下步骤进行操作：

1. **查找密钥 ID**：首先，在源机器上查找你要迁移的密钥 ID。可以使用以下命令：
   ```bash
   gpg --list-secret-keys --keyid-format LONG
   ```
   这将返回类似于 `/home/user/.gnupg/pubring.kbx` 的输出，其中包含你的密钥 ID。

2. **导出公钥和私钥**：使用以下命令导出公钥和私钥：
   ```bash
   gpg --export -a [your key] > gpg-pub.asc
   gpg --export-secret-keys -a [your key] > gpg-sc.asc
   ```
   将 `[your key]` 替换为你的密钥 ID。这将生成两个文件：`gpg-pub.asc` 和 `gpg-sc.asc`，分别包含公钥和私钥。

3. **传输密钥文件**：将这两个文件传输到目标机器。可以使用 USB 驱动器、scp 命令或其他安全的文件传输方法。例如，使用 scp：
   ```bash
   scp gpg-pub.asc user@targetmachine:/path/to/destination
   scp gpg-sc.asc user@targetmachine:/path/to/destination
   ```

4. **在目标机器上导入密钥**：在目标机器上，使用以下命令导入公钥和私钥：
   ```bash
   gpg --import gpg-pub.asc
   gpg --import gpg-sc.asc
   ```
   如果私钥是密码保护的，你会被提示输入密码。

5. **调整信任级别（可选）**：如果需要，可以使用以下命令调整密钥的信任级别：
   ```bash
   gpg --edit-key [your key]
   ```

6. **重启 gpg-agent（可选）**：在某些情况下，导入密钥后可能需要重启 gpg-agent：
   ```bash
   sudo gpgconf --kill gpg-agent
   ```

通过以上步骤，你可以安全地将 GPG 密钥从一台机器迁移到另一台机器上。确保在整个过程中保护好你的私钥，以防止未授权访问[1](https://gist.github.com/angela-d/8b27670bac26e4bf7c431715fef5cc51)[2](https://blog.ridaeh.com/migrate-you-gpg-keys-from-one-machine-to-another-3341e980dfac)。
