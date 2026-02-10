# MCP 服务器开发

> 📚 难度：高级 | ⏱️ 预计时间：3-5 天 | 🎯 目标：开发 MCP 服务端

本教程讲解如何开发 MCP 服务器，暴露资源和工具给客户端。

---

## 1. 服务器基础

### 1.1 创建服务器

```typescript
// mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio"

const server = new Server(
  {
    name: "my-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  },
)

// 列出资源
server.setRequestHandler("resources/list", async () => {
  return {
    resources: [
      {
        uri: "file:///readme.md",
        name: "README",
        mimeType: "text/markdown",
      },
    ],
  }
})

// 读取资源
server.setRequestHandler("resources/read", async (request) => {
  const { uri } = request.params

  if (uri === "file:///readme.md") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: await Bun.file("./readme.md").text(),
        },
      ],
    }
  }

  throw new Error(`Resource not found: ${uri}`)
})

// 列出工具
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "calculate",
        description: "Perform calculation",
        inputSchema: {
          type: "object",
          properties: {
            expression: { type: "string" },
          },
          required: ["expression"],
        },
      },
    ],
  }
})

// 调用工具
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params

  if (name === "calculate") {
    try {
      const result = eval(args.expression) // 注意：实际使用需要安全检查
      return {
        content: [
          {
            type: "text",
            text: `Result: ${result}`,
          },
        ],
      }
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err.message}`,
          },
        ],
        isError: true,
      }
    }
  }

  throw new Error(`Unknown tool: ${name}`)
})

// 启动
const transport = new StdioServerTransport()
await server.connect(transport)
console.log("MCP Server running on stdio")
```

---

## 2. 资源管理

### 2.1 动态资源

```typescript
// 资源模板
server.setRequestHandler("resources/list", async () => {
  const files = await Array.fromAsync(new Bun.Glob("docs/**/*.{md,txt}").scan())

  return {
    resources: files.map((file) => ({
      uri: `file:///${file}`,
      name: file.split("/").pop(),
      mimeType: file.endsWith(".md") ? "text/markdown" : "text/plain",
    })),
  }
})

// 读取任意文件
server.setRequestHandler("resources/read", async (request) => {
  const { uri } = request.params
  const path = uri.replace("file:///", "")

  try {
    const content = await Bun.file(path).text()
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: content,
        },
      ],
    }
  } catch (err) {
    throw new Error(`Cannot read file: ${path}`)
  }
})
```

---

## 3. 认证授权

### 3.1 简单认证

```typescript
const VALID_TOKENS = new Set(["token1", "token2"])

server.setRequestHandler("initialize", async (request) => {
  const token = request.params._meta?.authToken

  if (!VALID_TOKENS.has(token)) {
    throw new Error("Unauthorized")
  }

  return {
    protocolVersion: "2024-11-05",
    capabilities: {},
    serverInfo: { name: "server", version: "1.0" },
  }
})
```

---

## 4. 本章总结

### 核心能力

- **Resources**: 暴露数据和文件
- **Tools**: 提供可执行操作
- **Prompts**: 预设提示词模板

### 最佳实践

1. 详细描述工具用途
2. 验证所有输入
3. 提供清晰的错误信息
4. 考虑安全性

---

**开发 MCP 服务器，让你的服务被 AI 调用！**
