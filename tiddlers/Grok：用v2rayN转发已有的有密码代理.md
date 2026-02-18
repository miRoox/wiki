是的，你想用 v2rayN 把公司的带用户名/密码的 HTTP 代理（或 HTTPS 代理）作为 **上游（upstream/forward proxy）**，然后 v2rayN 自己再对外提供本地 SOCKS/HTTP 代理，让浏览器、winget、python 等程序连 v2rayN 的本地端口，就能间接走公司代理。

v2rayN（基于 Xray/V2Ray 核心）支持这种**链式代理**，但 GUI 里没有直接的“上游代理”输入框。你需要手动编辑订阅或自定义配置的 JSON 来实现。

### 推荐做法：添加一个“自定义服务器” + HTTP outbound

1. **先确认公司代理信息**  
   - 代理类型：HTTP（最常见）还是 HTTPS（较少）？  
   - 地址：例如 proxy.company.com:8080  
   - 用户名：user123  
   - 密码：pass456  
   - 如果是 HTTPS 代理，端口通常 443 或 8443，需要注意 TLS 设置。

2. **在 v2rayN 里添加自定义配置**（最简单方式）

   - 打开 v2rayN → 服务器 → 添加 [自定义服务器]（或 “Add [Config]”）
   - 核心类型选 **Xray**（推荐，功能更全）
   - 然后点“编辑 config.json” 或直接新建一个 config.json 文件导入。

   用下面这个**极简链式配置**（只做转发，不加密，不伪装）：

   ```json
   {
     "log": {
       "loglevel": "warning"
     },
     "inbounds": [
       {
         "listen": "127.0.0.1",
         "port": 10808,          // 本地 SOCKS 端口（v2rayN 默认常用这个）
         "protocol": "socks",
         "settings": {
           "auth": "noauth",
           "udp": true
         },
         "sniffing": {
           "enabled": true,
           "destOverride": ["http", "tls"]
         }
       },
       {
         "listen": "127.0.0.1",
         "port": 10809,          // 本地 HTTP 端口（给 winget/python 等用）
         "protocol": "http"
       }
     ],
     "outbounds": [
       {
         "protocol": "http",     // 关键：用 http outbound 连公司代理
         "settings": {
           "servers": [
             {
               "address": "proxy.company.com",   // 改成公司代理 IP 或域名
               "port": 8080,                     // 改成公司端口
               "users": [
                 {
                   "user": "user123",            // 公司用户名
                   "pass": "pass456"             // 公司密码
                 }
               ]
             }
           ]
         },
         "tag": "company-proxy"
       },
       {
         "protocol": "freedom",    // 直连备用（可选）
         "tag": "direct"
       }
     ],
     "routing": {
       "domainStrategy": "IPIfNonMatch",
       "rules": [
         {
           "type": "field",
           "outboundTag": "company-proxy",
           "network": "tcp,udp"
         }
       ]
     }
   }
   ```

   - 保存后 → 选这个服务器 → 启动。
   - v2rayN 会显示本地监听：SOCKS 10808 / HTTP 10809。

3. **让程序走这个本地代理**

   - **浏览器**：系统代理设成自动（v2rayN → 系统代理 → 设置系统代理 → 全局模式），或手动设 HTTP 127.0.0.1:10809 / SOCKS5 127.0.0.1:10808。
   - **winget**（命令行）：
     ```cmd
     winget install --proxy http://127.0.0.1:10809 vscode
     ```
     或永久环境变量（管理员 PowerShell）：
     ```powershell
     [Environment]::SetEnvironmentVariable("HTTP_PROXY",  "http://127.0.0.1:10809", "Machine")
     [Environment]::SetEnvironmentVariable("HTTPS_PROXY", "http://127.0.0.1:10809", "Machine")
     ```
   - **Python (requests 等)**：自动读环境变量，或代码里写：
     ```python
     proxies = {
         'http':  'http://127.0.0.1:10809',
         'https': 'http://127.0.0.1:10809'
     }
     requests.get('https://www.google.com', proxies=proxies)
     ```

4. **如果公司代理是 HTTPS（比较少见）**

   把 outbound 改成这样（加 streamSettings）：

   ```json
   "outbounds": [
     {
       "protocol": "http",
       "settings": { ... 同上 ... },
       "streamSettings": {
         "security": "tls",
         "tlsSettings": {
           "allowInsecure": true   // 如果公司证书自签或有问题，临时开 true
         }
       },
       "tag": "company-proxy"
     }
   ]
   ```

### 常见问题处理

- 连不上 → 检查公司代理是否支持 HTTP CONNECT 方法（大部分支持），日志里看是否有 407 Proxy Authentication Required（认证失败就改用户名/密码）。
- WebSocket / TLS 节点想链 → outbound tag 设成 company-proxy 后，在你原来的 VMess/VLESS/Trojan 配置里加 `"proxySettings": {"tag": "company-proxy"}`。
- 想 GUI 里快速开关 → 可以做两个服务器：一个直连、一个链公司代理，切换用。

这样 v2rayN 就只负责转发，不需要自己连外网节点，公司代理的用户名密码只出现在这个 config 里（注意安全，别共享 config）。
