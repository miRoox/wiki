在 Forgejo 中创建新的 OAuth2 应用程序的流程如下：

1. **启用 OAuth2 提供程序**
   - Forgejo 可以作为一个 OAuth2 提供程序，允许第三方应用程序在用户授权后访问其资源 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)[5](https://forgejo.org/docs/v1.21/admin/oauth2-provider/)。
   - 如果你想让 Forgejo 作为一个实例范围的 OAuth2 提供者，你需要在 `/admin/applications` 页面创建 OAuth2 应用 [5](https://forgejo.org/docs/v1.21/admin/oauth2-provider/)。

2. **注册新的应用程序**
   - 访问 Forgejo 实例的 "Settings"（`/user/settings/applications`）部分来注册一个新的应用程序 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。

3. **配置应用程序**
   - **客户端类型：** Forgejo 支持 confidential 和 public 两种客户端类型 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。
   - **重定向 URI：** 对于 public 客户端，建议使用 loopback IP 地址（例如 `http://127.0.0.1/`）作为重定向 URI，并允许任何端口。避免使用 `localhost` [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。

4. **获取 Client ID 和 Client Secret**
   - 注册应用程序后，你将获得一个 Client ID。对于 confidential 客户端，还会生成一个 Client Secret [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。请注意，Client Secret 只会显示一次，如果丢失，你必须重新生成它 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。

5. **授权流程**
   - **重定向到授权端点：** 将用户重定向到 Forgejo 的授权端点，以获取用户授权 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)：
     ```
     https://[YOUR-FORGEJO-URL]/login/oauth/authorize?client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&response_type=code&state=STATE
     ```
     - `CLIENT_ID`：你注册应用程序后获得的 Client ID。
     - `REDIRECT_URI`：用户授权后重定向到的 URI。
     - `response_type`：设置为 `code`。
     - `state`：一个随机字符串，用于防止 CSRF 攻击（可选，但推荐使用）。
   - **用户授权：** 用户将被要求授权你的应用程序。
   - **接收授权码：** 如果用户授权，他们将被重定向到 `REDIRECT_URI`，并附带一个授权码 `code` 和 `state` 参数 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。

6. **获取访问令牌**
   - 使用授权码，向 Forgejo 的访问令牌端点发送 POST 请求，以获取访问令牌 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)：
     ```
     POST https://[YOUR-FORGEJO-URL]/login/oauth/access_token
     {
       "client_id" : "YOUR_CLIENT_ID",
       "client_secret" : "YOUR_CLIENT_SECRET",
       "code" : "RETURNED_CODE",
       "grant_type" : "authorization_code",
       "redirect_uri" : "REDIRECT_URI"
     }
     ```
     - `client_id`：你的 Client ID。
     - `client_secret`：你的 Client Secret。
     - `code`：从重定向 URI 中获得的授权码。
     - `grant_type`：设置为 `authorization_code`。
     - `redirect_uri`：必须与授权请求中的 `REDIRECT_URI` 匹配。
   - **响应：** 访问令牌端点将返回一个 JSON 响应，其中包含 `access_token`、`token_type`、`expires_in` 和 `refresh_token` [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。

7. **使用访问令牌**
   - 使用 `access_token` 向 Forgejo API 发出请求，以访问用户的资源 [1](https://forgejo.org/docs/v1.19/user/oauth2-provider/)。
   - 你可以通过以下方式传递访问令牌 [3](https://forgejo.org/docs/latest/user/api-usage/)：
     - 在 HTTP 头部中使用 `Authorization: Bearer ...`。
     - 在 URL 查询字符串中使用 `token=...` 或 `access_token=...`。

**示例 (curl)**

以下是一个使用 curl 命令创建 API token 的示例 [3](https://forgejo.org/docs/latest/user/api-usage/)：

```bash
curl -H "Content-Type: application/json" -d '{"name":"test","scopes":["write:package"]}' -u username:password https://forgejo.your.host/api/v1/users/<username>/tokens
```

**注意:**

*   Forgejo API 的不同版本可能存在兼容性问题，主要版本号更改时可能会有 breaking changes [3](https://forgejo.org/docs/latest/user/api-usage/)。
*   如果启用了双因素认证，则需要在 header 中添加一次性密码 (OTP) [3](https://forgejo.org/docs/latest/user/api-usage/)。
