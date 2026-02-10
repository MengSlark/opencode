# HTTP API 设计

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：理解服务端 API 设计

本教程讲解 OpenCode 的 HTTP API 设计，包括路由、中间件和错误处理。

---

## 1. API 架构

### 1.1 技术栈

- **框架**: Hono (轻量级 Web 框架)
- **验证**: Zod (Schema 验证)
- **文档**: OpenAPI / Swagger
- **认证**: Bearer Token + OpenAuth

### 1.2 目录结构

```
src/server/
├── index.ts           # 服务器入口
├── routes/
│   ├── sessions.ts    # 会话路由
│   ├── tools.ts       # 工具路由
│   ├── files.ts       # 文件路由
│   └── health.ts      # 健康检查
├── middleware/
│   ├── auth.ts        # 认证中间件
│   ├── cors.ts        # 跨域中间件
│   └── error.ts       # 错误处理
└── types.ts           # 类型定义
```

---

## 2. 基础路由

### 2.1 创建服务器

```typescript
// src/server/index.ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

// 创建应用
const app = new Hono()

// 全局中间件
app.use("*", cors())
app.use("*", logger())

// 路由
app.route("/sessions", sessionsRouter)
app.route("/tools", toolsRouter)
app.route("/files", filesRouter)

// 健康检查
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// 启动服务器
const port = 4096
console.log(`Server running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
```

### 2.2 会话路由

```typescript
// src/server/routes/sessions.ts
import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"

const app = new Hono()

// GET /sessions - 列出现有会话
app.get("/", async (c) => {
  const sessions = await Session.list({
    limit: parseInt(c.req.query("limit") || "10"),
    offset: parseInt(c.req.query("offset") || "0"),
  })

  return c.json({
    data: sessions,
    total: await Session.count(),
  })
})

// POST /sessions - 创建新会话
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      projectId: z.string(),
      model: z.string().optional(),
      title: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json")

    const session = await Session.create({
      projectId: body.projectId,
      model: body.model || "gpt-4",
      title: body.title || "New Session",
    })

    return c.json(session, 201)
  },
)

// GET /sessions/:id - 获取会话详情
app.get("/:id", async (c) => {
  const id = c.req.param("id")
  const session = await Session.load(id)

  if (!session) {
    return c.json({ error: "Session not found" }, 404)
  }

  return c.json(session)
})

// DELETE /sessions/:id - 删除会话
app.delete("/:id", async (c) => {
  const id = c.req.param("id")
  await Session.delete(id)

  return c.json({ success: true })
})

// POST /sessions/:id/messages - 发送消息
app.post(
  "/:id/messages",
  zValidator(
    "json",
    z.object({
      content: z.string().min(1),
      attachments: z.array(z.any()).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param("id")
    const body = c.req.valid("json")

    const session = await Session.load(id)
    if (!session) {
      return c.json({ error: "Session not found" }, 404)
    }

    await session.sendMessage(body.content)

    return c.json({ success: true })
  },
)

export default app
```

---

## 3. 工具路由

```typescript
// src/server/routes/tools.ts
import { Hono } from "hono"

const app = new Hono()

// GET /tools - 列出所有工具
app.get("/", async (c) => {
  const tools = await registry.list()

  return c.json({
    data: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  })
})

// POST /tools/:name/execute - 执行工具
app.post("/:name/execute", async (c) => {
  const name = c.req.param("name")
  const params = await c.req.json()
  const sessionId = c.req.header("X-Session-ID")

  const tool = await registry.get(name)
  if (!tool) {
    return c.json({ error: "Tool not found" }, 404)
  }

  // 构建上下文
  const ctx = {
    sessionID: sessionId || "anonymous",
    messageID: "",
    callID: generateId(),
    agent: "api",
    abort: AbortSignal.timeout(30000),
    ask: async () => {}, // API 调用时自动允许
    metadata: () => {},
  }

  try {
    const result = await tool.execute(params, ctx)
    return c.json(result)
  } catch (err) {
    return c.json(
      {
        error: "Tool execution failed",
        message: err.message,
      },
      500,
    )
  }
})

export default app
```

---

## 4. 中间件

### 4.1 认证中间件

```typescript
// src/server/middleware/auth.ts
import { createMiddleware } from "hono/factory"

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization")

  if (!authHeader) {
    return c.json({ error: "Missing authorization header" }, 401)
  }

  const [scheme, token] = authHeader.split(" ")

  if (scheme !== "Bearer" || !token) {
    return c.json({ error: "Invalid authorization format" }, 401)
  }

  // 验证 token
  const user = await verifyToken(token)
  if (!user) {
    return c.json({ error: "Invalid token" }, 401)
  }

  // 将用户信息附加到上下文
  c.set("user", user)

  await next()
})

// 使用
app.use("/sessions/*", authMiddleware)
```

### 4.2 错误处理中间件

```typescript
// src/server/middleware/error.ts
import { HTTPException } from "hono/http-exception"

app.onError((err, c) => {
  console.error("API Error:", err)

  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  )
})
```

### 4.3 请求日志

```typescript
// src/server/middleware/logger.ts
import { createMiddleware } from "hono/factory"

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now()

  console.log(`→ ${c.req.method} ${c.req.url}`)

  await next()

  const duration = Date.now() - start
  console.log(`← ${c.res.status} (${duration}ms)`)
})
```

---

## 5. API 文档

### 5.1 OpenAPI 规范

```typescript
// src/server/openapi.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"

const app = new OpenAPIHono()

// 定义路由
const listSessionsRoute = createRoute({
  method: "get",
  path: "/sessions",
  request: {
    query: z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(z.any()),
            total: z.number(),
          }),
        },
      },
      description: "List of sessions",
    },
  },
})

// 应用路由
app.openapi(listSessionsRoute, async (c) => {
  // 处理逻辑
})

// Swagger UI
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "OpenCode API",
  },
})
```

---

## 6. 本章总结

### 核心概念

1. **路由**: RESTful API 设计
2. **中间件**: 认证、日志、错误处理
3. **验证**: Zod Schema 验证
4. **文档**: OpenAPI 自动生成

### 关键 API

```typescript
app.get("/", handler) // GET 路由
app.post("/", handler) // POST 路由
app.use("*", middleware) // 中间件
app.route("/path", router) // 子路由
```

### 检查清单

- [ ] 理解 RESTful 设计
- [ ] 掌握 Hono 框架
- [ ] 会使用 Zod 验证
- [ ] 理解中间件机制

---

**良好的 API 设计是前后端协作的基础！**
