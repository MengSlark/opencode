# MCP 协议详解

> 📚 难度：高级 | ⏱️ 预计时间：3-5 天 | 🎯 目标：理解 Model Context Protocol

本教程深入讲解 MCP (Model Context Protocol) 协议，这是 AI 与外部系统通信的标准协议。

---

## 1. 什么是 MCP？

### 1.1 背景

MCP 是由 Anthropic 提出的开放协议，旨在标准化 AI 助手与外部数据源、工具之间的集成方式。

### 1.2 核心概念

- **Server**: 提供资源或工具的服务端
- **Client**: 使用资源的客户端
- **Resources**: 数据（文件、数据库记录等）
- **Tools**: 可执行的操作
- **Prompts**: 可复用的提示词模板

---

## 2. 协议架构

### 2.1 通信方式

```
┌─────────────────────────────────────┐
│              Client                 │
│  ┌─────────┐      ┌──────────────┐ │
│  │  Agent  │◄────►│ MCP Client   │ │
│  └─────────┘      └──────┬───────┘ │
└──────────────────────────┼─────────┘
                           │ JSON-RPC
                           │ over stdio/sse
┌──────────────────────────┼─────────┐
│              Server      │         │
│  ┌───────────────────────┴──────┐  │
│  │         MCP Server            │  │
│  │  ┌─────────┐  ┌───────────┐   │  │
│  │  │Resources│  │   Tools   │   │  │
│  │  └─────────┘  └───────────┘   │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### 2.2 消息格式

```typescript
// 请求
interface JSONRPCRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: object
}

// 响应
interface JSONRPCResponse {
  jsonrpc: "2.0"
  id: string | number
  result?: object
  error?: {
    code: number
    message: string
    data?: unknown
  }
}
```

---

## 3. 核心功能

### 3.1 工具 (Tools)

```typescript
// 定义工具
interface Tool {
  name: string
  description: string
  inputSchema: JSONSchema
}

// 调用工具
interface CallToolRequest {
  method: "tools/call"
  params: {
    name: string
    arguments: object
  }
}

// 工具结果
interface CallToolResult {
  content: Array<{
    type: "text" | "image" | "resource"
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}
```

### 3.2 资源 (Resources)

```typescript
// 资源定义
interface Resource {
  uri: string // 唯一标识
  name: string // 名称
  description?: string // 描述
  mimeType?: string // MIME 类型
}

// 读取资源
interface ReadResourceRequest {
  method: "resources/read"
  params: {
    uri: string
  }
}
```

### 3.3 提示词 (Prompts)

```typescript
// 提示词定义
interface Prompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

// 获取提示词
interface GetPromptRequest {
  method: "prompts/get"
  params: {
    name: string
    arguments?: object
  }
}
```

---

## 4. 实现 MCP Server

### 4.1 基础 Server

```typescript
import { Server } from "@modelcontextprotocol/sdk/server"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio"

const server = new Server(
  {
    name: "example-server",
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

// 处理工具调用
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case "search":
      return {
        content: [
          {
            type: "text",
            text: await performSearch(args.query),
          },
        ],
      }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

// 处理资源读取
server.setRequestHandler("resources/read", async (request) => {
  const { uri } = request.params
  const content = await readResource(uri)

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text: content,
      },
    ],
  }
})

// 启动服务器
const transport = new StdioServerTransport()
await server.connect(transport)
```

### 4.2 实现 MCP Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio"

const client = new Client({
  name: "example-client",
  version: "1.0.0",
})

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
})

await client.connect(transport)

// 列出工具
const tools = await client.listTools()
console.log("Available tools:", tools)

// 调用工具
const result = await client.callTool("search", {
  query: "example",
})

// 读取资源
const resource = await client.readResource("file:///path/to/file")
```

---

## 5. OpenCode 中的 MCP

### 5.1 架构集成

```
OpenCode
├── MCP Client (packages/opencode/src/mcp/client.ts)
│   ├── 连接管理
│   ├── 工具调用
│   └── 资源读取
├── MCP Server Support
│   └── 可以连接外部 MCP Server
└── Tool Integration
    └── MCP 工具包装为内部工具
```

### 5.2 使用示例

```typescript
// 连接到 MCP Server
const mcpClient = new MCPClient()
await mcpClient.connect({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
})

// 获取可用工具
const tools = await mcpClient.listTools()

// 转换为内部工具
const wrappedTools = tools.map((tool) => ({
  ...tool,
  execute: async (params, ctx) => {
    return mcpClient.callTool(tool.name, params)
  },
}))

// 注册到工具系统
wrappedTools.forEach((tool) => registry.register(tool))
```

---

## 6. 安全考虑

### 6.1 认证

```typescript
// Server 端认证
server.setRequestHandler("initialize", async (request) => {
  const token = request.params._meta?.authToken

  if (!validateToken(token)) {
    throw new Error("Unauthorized")
  }

  return {
    protocolVersion: "2024-11-05",
    capabilities: {},
    serverInfo: { name: "server", version: "1.0" },
  }
})
```

### 6.2 权限控制

```typescript
// 工具权限检查
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params

  // 检查权限
  if (!hasPermission(request.clientId, name)) {
    throw new Error("Permission denied")
  }

  // 执行工具
  return executeTool(name, args)
})
```

---

## 7. 本章总结

### 核心概念

1. **MCP**: 标准化 AI 集成协议
2. **Server**: 提供资源和工具
3. **Client**: 消费资源和工具
4. **Capabilities**: 能力协商

### 关键接口

- `tools/call`: 调用工具
- `resources/read`: 读取资源
- `prompts/get`: 获取提示词

### 检查清单

- [ ] 理解 MCP 协议概念
- [ ] 掌握 Server 实现
- [ ] 掌握 Client 实现
- [ ] 理解安全机制

---

**MCP 是 AI 集成的未来标准，掌握它将让你领先一步！**
