# MCP 客户端实现

> 📚 难度：高级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握 MCP 客户端开发

本教程讲解如何实现 MCP 客户端，连接和使用 MCP 服务器。

---

## 1. 客户端架构

### 1.1 核心组件

```
MCP Client
├── Transport Layer          # 传输层
│   ├── StdioTransport      # 标准输入输出
│   └── SSETransport        # Server-Sent Events
├── Protocol Handler         # 协议处理器
│   ├── Message Parser      # 消息解析
│   └── Request Manager     # 请求管理
└── Capability Manager       # 能力管理
    ├── Tool Registry       # 工具注册表
    └── Resource Cache      # 资源缓存
```

---

## 2. 基础客户端实现

### 2.1 创建客户端

```typescript
// mcp/client.ts
import { EventEmitter } from "events"

interface MCPClientOptions {
  name: string
  version: string
}

export class MCPClient extends EventEmitter {
  private transport: Transport | null = null
  private capabilities: ServerCapabilities = {}
  private requestId = 0
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void
      reject: (error: Error) => void
    }
  >()

  constructor(private options: MCPClientOptions) {
    super()
  }

  async connect(transport: Transport): Promise<void> {
    this.transport = transport

    // 设置消息处理器
    transport.onMessage((message) => {
      this.handleMessage(message)
    })

    // 初始化连接
    const result = await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: this.options.name,
        version: this.options.version,
      },
    })

    this.capabilities = result.capabilities
    this.emit("connected", result)
  }

  private async request(method: string, params?: any): Promise<any> {
    if (!this.transport) {
      throw new Error("Not connected")
    }

    const id = `${++this.requestId}`

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      this.transport!.send({
        jsonrpc: "2.0",
        id,
        method,
        params,
      })

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error("Request timeout"))
        }
      }, 30000)
    })
  }

  private handleMessage(message: JSONRPCMessage): void {
    if ("id" in message && message.id !== undefined) {
      // 响应消息
      const request = this.pendingRequests.get(String(message.id))
      if (request) {
        this.pendingRequests.delete(String(message.id))
        if ("error" in message) {
          request.reject(new Error(message.error.message))
        } else {
          request.resolve(message.result)
        }
      }
    } else if ("method" in message) {
      // 通知消息
      this.emit("notification", message)
    }
  }

  // 公共 API
  async listTools(): Promise<Tool[]> {
    const result = await this.request("tools/list")
    return result.tools
  }

  async callTool(name: string, args: any): Promise<ToolResult> {
    return this.request("tools/call", { name, arguments: args })
  }

  async listResources(): Promise<Resource[]> {
    const result = await this.request("resources/list")
    return result.resources
  }

  async readResource(uri: string): Promise<ResourceContent> {
    return this.request("resources/read", { uri })
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close()
      this.transport = null
    }
  }
}
```

### 2.2 传输层实现

```typescript
// mcp/transports/stdio.ts
import { spawn, ChildProcess } from "child_process"

export class StdioTransport implements Transport {
  private process: ChildProcess | null = null
  private buffer = ""

  constructor(
    private command: string,
    private args: string[],
  ) {}

  async connect(): Promise<void> {
    this.process = spawn(this.command, this.args, {
      stdio: ["pipe", "pipe", "pipe"],
    })

    this.process.stdout?.on("data", (data) => {
      this.buffer += data.toString()
      this.processBuffer()
    })

    this.process.stderr?.on("data", (data) => {
      console.error("Server stderr:", data.toString())
    })

    return new Promise((resolve, reject) => {
      this.process?.on("error", reject)
      setTimeout(resolve, 100) // 简单等待
    })
  }

  send(message: JSONRPCMessage): void {
    if (this.process?.stdin) {
      this.process.stdin.write(JSON.stringify(message) + "\n")
    }
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandler = handler
  }

  private messageHandler?: (message: JSONRPCMessage) => void

  private processBuffer(): void {
    const lines = this.buffer.split("\n")
    this.buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line)
          this.messageHandler?.(message)
        } catch (e) {
          console.error("Failed to parse message:", line)
        }
      }
    }
  }

  async close(): Promise<void> {
    this.process?.kill()
  }
}
```

---

## 3. 工具集成

### 3.1 包装为 OpenCode 工具

```typescript
// mcp/tool-adapter.ts
import { Tool } from "@opencode-ai/core"

export function adaptMCPTool(mcpTool: MCPTool, client: MCPClient): Tool {
  return {
    name: `mcp_${mcpTool.name}`,
    description: `
      ${mcpTool.description}
      
      (MCP Tool from ${client.name})
    `,
    parameters: mcpTool.inputSchema,

    async execute(params, ctx) {
      // 调用 MCP 工具
      const result = await client.callTool(mcpTool.name, params)

      // 转换结果格式
      const content = result.content.map((c) => c.text || c.data || "").join("\n")

      return {
        title: mcpTool.name,
        output: content,
        metadata: { isError: result.isError },
      }
    },
  }
}

// 使用
async function integrateMCPServer(client: MCPClient) {
  const mcpTools = await client.listTools()

  for (const tool of mcpTools) {
    const adaptedTool = adaptMCPTool(tool, client)
    toolRegistry.register(adaptedTool)
  }
}
```

---

## 4. 本章总结

### 核心要点

- **Client**: 管理连接和请求
- **Transport**: 处理底层通信
- **Adapter**: 转换为内部工具

### 关键流程

```
连接 → 初始化 → 发现工具 → 调用工具 → 断开
```

---

**掌握 MCP 客户端，你可以接入任意 MCP 服务！**
