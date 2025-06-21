在 [[Docker Compose]] 中，`depends_on` 仅控制容器的**启动顺序**，而**不保证服务已完全就绪**。这是许多开发者误解的关键点。以下是详细解释：

---

## 1. `depends_on` 的核心行为
- **顺序控制**：确保被依赖的服务（如 `db`）**先于**依赖服务（如 `app`）启动容器。
- **不检查就绪状态**：它只等待被依赖服务的容器进入 `running` 状态（即 Docker 守护进程已启动容器），**不检查容器内应用是否已初始化完成**（如数据库是否可连接）。

---

## 2. 为何出现“被依赖服务未就绪”？
- **容器状态 vs 应用状态**：
  - 容器 `running` ≠ 应用已就绪（例如：MySQL 容器启动了，但初始化脚本仍在运行）。
- **Compose 的默认行为**：
  ```yaml
  services:
    app:
      depends_on:
        - db  # 仅等待 db 容器进入 running 状态
    db: ...
  ```

---

## 3. 确保服务真正就绪的解决方案

### ✅ 方案 1：使用健康检查（Healthcheck） + `condition`
为被依赖的服务添加健康检查，并指定依赖条件：
```yaml
services:
  db:
    image: postgres
    healthcheck:  # 定义健康检查
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10

  app:
    image: your-app
    depends_on:
      db:
        condition: service_healthy  # 关键：等待 db 健康状态
```

### ✅ 方案 2：应用层重试逻辑
在应用程序代码中实现重试机制（推荐）：
```python
# Python 伪示例
import time
import psycopg2

def connect_db():
    for _ in range(30):  # 重试 30 次
        try:
            conn = psycopg2.connect("dbname=test user=postgres")
            return conn
        except Exception:
            time.sleep(5)  # 等待 5 秒后重试
    raise Exception("Failed to connect to DB")
```

### ✅ 方案 3：启动脚本轮询
在容器的启动脚本中检测依赖服务：
```bash
#!/bin/bash
# 等待 db:5432 可连接
until nc -z db 5432; do
  echo "Waiting for db..."
  sleep 2
done

# 启动真实应用
exec ./your-app
```

---

## 4. 常见误区
- **`depends_on` 无法解决网络延迟**：即使容器启动了，端口可能尚未监听。
- **Compose 版本差异**：
  - V2：支持 `condition`（如 `service_healthy`）。
  - V3：移除了 `condition`，需显式使用健康检查 + `depends_on` 组合。

---

## 总结
| 机制               | 控制顺序 | 保证就绪 | 推荐场景         |
|--------------------|----------|----------|------------------|
| 纯 `depends_on`     | ✅        | ❌        | 简单依赖         |
| `depends_on` + 健康检查 | ✅        | ✅        | 数据库等关键依赖 |
| 应用重试逻辑       | ❌        | ✅        | 所有生产环境     |

**最佳实践**：  
**始终在应用层添加就绪重试逻辑**，并结合健康检查作为第二层保障。不要依赖 `depends_on` 检测服务可用性。
