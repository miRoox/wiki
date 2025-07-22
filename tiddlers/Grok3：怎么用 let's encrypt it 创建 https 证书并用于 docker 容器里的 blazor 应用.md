使用 Let's Encrypt 创建 HTTPS 证书并将其用于 Docker 容器中的 Blazor 应用需要以下步骤。以下是一个清晰的指南，假设你的 Blazor 应用运行在 Docker 容器中，并且你使用 Nginx 作为反向代理来处理 HTTPS 请求。

---

### 环境准备
1. **域名**：你需要一个有效的域名（Let's Encrypt 不支持 IP 地址）。
2. **Docker 和 Docker Compose**：确保已安装 Docker 和 Docker Compose。
3. **服务器**：确保你的服务器已开放 80 和 443 端口，且域名已解析到服务器的公网 IP。
4. **Certbot**：使用 Certbot 作为 Let's Encrypt 的 ACME 客户端来获取证书。

---

### 步骤 1：安装和配置 Docker 环境
确保你的服务器上已安装 Docker 和 Docker Compose。如果尚未安装，可以参考以下命令（以 Ubuntu 为例）：

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

---

### 步骤 2：创建 Docker Compose 配置
创建一个 `docker-compose.yml` 文件，用于运行 Blazor 应用、Nginx 和 Certbot 容器。以下是一个示例配置：

```yaml
version: '3.8'

services:
  blazor-app:
    image: mcr.microsoft.com/dotnet/aspnet:6.0
    container_name: blazor-app
    volumes:
      - ./blazor-app:/app
    working_dir: /app
    command: dotnet YourBlazorApp.dll
    expose:
      - "80"
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs
      - ./certbot/www:/var/www/html
    depends_on:
      - blazor-app
    networks:
      - app-network

  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./certs:/etc/letsencrypt
      - ./certbot/www:/var/www/html
    depends_on:
      - nginx
    networks:
      - app-network
    command: certonly --webroot --webroot-path=/var/www/html --email your-email@example.com --agree-tos --no-eff-email -d your-domain.com -d www.your-domain.com

networks:
  app-network:
    driver: bridge
```

**说明**：
- `blazor-app`：运行你的 Blazor 应用，假设已构建并发布到 `./blazor-app` 目录。
- `nginx`：作为反向代理，处理 HTTP 和 HTTPS 请求。
- `certbot`：用于获取和续订 Let's Encrypt 证书。
- 替换 `your-domain.com` 为你的实际域名，`your-email@example.com` 为你的邮箱。
- `./certs` 用于存储证书，`./certbot/www` 用于 Let's Encrypt 的验证。

---

### 步骤 3：配置 Nginx
创建 `nginx.conf` 文件，用于配置 Nginx 反向代理和 HTTPS。示例内容如下：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 用于 Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # 重定向 HTTP 到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/certs/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://blazor-app:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**说明**：
- 替换 `your-domain.com` 为你的实际域名。
- 第一个 `server` 块处理 HTTP 请求，用于 Let's Encrypt 验证并重定向到 HTTPS。
- 第二个 `server` 块处理 HTTPS 请求，代理到 Blazor 应用。

将 `nginx.conf` 保存在项目根目录下。

---

### 步骤 4：获取 Let's Encrypt 证书
1. **创建必要目录**：
   ```bash
   mkdir -p ./certs ./certbot/www
   ```

2. **启动 Docker Compose**：
   ```bash
   docker-compose up -d
   ```
   这将启动 Blazor 应用、Nginx 和 Certbot 容器。Certbot 会自动通过 HTTP-01 验证获取证书，并存储在 `./certs` 目录。

3. **检查证书**：
   证书生成后，检查 `./certs/live/your-domain.com/` 目录，确认包含以下文件：
   - `fullchain.pem`：完整的证书链。
   - `privkey.pem`：私钥。

---

### 步骤 5：配置证书自动续订
Let's Encrypt 证书有效期为 90 天，需要定期续订。可以通过以下方式设置自动续订：

1. **创建续订脚本**：
   创建一个 `renewal.sh` 脚本：
   ```bash
   #!/bin/bash
   docker-compose run --rm certbot renew
   docker-compose restart nginx
   ```
   保存到 `./renewal.sh`，并赋予执行权限：
   ```bash
   chmod +x renewal.sh
   ```

2. **设置 Crontab 定时任务**：
   编辑 Crontab：
   ```bash
   crontab -e
   ```
   添加以下行，每月 1 号执行续订：
   ```bash
   0 0 1 * * /path/to/your/project/renewal.sh >> /tmp/cron_log.txt 2>& 1
   ```

---

### 步骤 6：测试和验证
1. **启动服务**：
   ```bash
   docker-compose up -d
   ```

2. **访问站点**：
   打开浏览器，访问 `https://your-domain.com`，确认是否成功加载 Blazor 应用，并显示安全的 HTTPS 连接。

3. **检查证书**：
   使用以下命令检查证书状态：
   ```bash
   docker-compose exec certbot certbot certificates
   ```

---

### 注意事项
1. **域名解析**：确保你的域名已正确解析到服务器的公网 IP。
2. **防火墙和端口**：确保服务器的 80 和 443 端口已开放。
3. **调试问题**：
   - 如果证书获取失败，检查 Certbot 日志：
     ```bash
     docker-compose logs certbot
     ```
   - 确保域名解析正确，且 Nginx 配置文件中的 `server_name` 与域名一致。
4. **Blazor 应用的 HTTPS 配置**：
   - 如果 Blazor 应用需要直接处理 HTTPS（不使用 Nginx 反向代理），需要在 `Program.cs` 中配置 Kestrel 使用证书：
     ```csharp
     builder.WebHost.ConfigureKestrel(options =>
     {
         options.ListenAnyIP(80);
         options.ListenAnyIP(443, listenOptions =>
         {
             listenOptions.UseHttps("/path/to/fullchain.pem", "/path/to/privkey.pem");
         });
     });
     ```
     然后将证书挂载到 Blazor 容器中。

---

### 参考资料
- Let's Encrypt 官方文档：https://letsencrypt.org/getting-started/[](https://letsencrypt.org/zh-cn/getting-started/)
- Certbot 官方文档：https://certbot.eff.org/
- 使用 Docker 和 Let's Encrypt 配置 HTTPS：https://blog.csdn.net/qq_14981137/article/details/137672054[](https://blog.csdn.net/baidu_39340547/article/details/136909673)

通过以上步骤，你可以成功为 Docker 容器中的 Blazor 应用配置 Let's Encrypt HTTPS 证书，并实现自动续订。