# WebSocket 实时通信

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握 WebSocket 通信机制

本教程讲解 OpenCode 的 WebSocket 实时通信实现，用于流式消息推送。

---

## 1. 为什么需要 WebSocket？

### 1.1 传统 HTTP 的问题

```
HTTP 轮询：
客户端 → 有消息吗？ → 服务器
客户端 ← 没有 ← 服务器
（等待 5 秒）
客户端 → 有消息吗？ → 服务器
客户端 ← 有了！ ← 服务器

缺点：
- 延迟高
- 资源浪费
- 不实时
```

### 1.2 WebSocket 优势

```
WebSocket：
客户端 ←────────→ 服务器
         ↑
    持久连接，双向通信
    服务器可主动推送

优点：
- 实时性
- 低延迟
- 高效
```

---

## 2. WebSocket 基础

### 2.1 建立连接

```typescript
// 客户端
const ws = new WebSocket("ws://localhost:4096/ws")

ws.onopen = () => {
  console.log("Connected")
  ws.send(JSON.stringify({ type: "join", sessionId: "xxx" }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log("Received:", data)
}

ws.onclose = () => {
  console.log("Disconnected")
}
```

### 2.2 服务器实现

```typescript
// src/server/websocket.ts
import { createBunWebSocket } from "hono/bun"

const { upgradeWebSocket, websocket } = createBunWebSocket()

// 存储连接
const connections = new Map<string, WebSocket>()

const app = new Hono()

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen: (evt, ws) => {
        console.log("Client connected")
      },

      onMessage: async (evt, ws) => {
        const data = JSON.parse(evt.data as string)

        switch (data.type) {
          case "join":
            // 加入会话
            connections.set(data.sessionId, ws)
            ws.send(JSON.stringify({ type: "joined", sessionId: data.sessionId }))
            break

          case "message":
            // 处理消息
            await handleMessage(data.sessionId, data.content, ws)
            break

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }))
            break
        }
      },

      onClose: (evt, ws) => {
        console.log("Client disconnected")
        // 清理连接
        for (const [id, conn] of connections) {
          if (conn === ws) {
            connections.delete(id)
            break
          }
        }
      },
    }
  }),
)

export { app, websocket }
```

---

## 3. 消息推送

### 3.1 流式消息推送

```typescript
// 向客户端推送流式消息
async function streamMessage(sessionId: string, messageStream: AsyncIterable<string>) {
  const ws = connections.get(sessionId)
  if (!ws) return

  for await (const chunk of messageStream) {
    ws.send(
      JSON.stringify({
        type: "chunk",
        content: chunk,
      }),
    )
  }

  // 发送完成标记
  ws.send(
    JSON.stringify({
      type: "done",
    }),
  )
}

// 使用示例
async function handleMessage(sessionId: string, content: string, ws: WebSocket) {
  const session = await Session.load(sessionId)

  // 获取 AI 流式响应
  const stream = session.sendMessageStream(content)

  // 推送给客户端
  await streamMessage(sessionId, stream)
}
```

### 3.2 工具调用通知

```typescript
// 通知客户端工具调用
function notifyToolCall(sessionId: string, toolCall: ToolCall) {
  const ws = connections.get(sessionId)
  if (!ws) return

  ws.send(
    JSON.stringify({
      type: "tool_call",
      data: {
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      },
    }),
  )
}

// 通知工具结果
function notifyToolResult(sessionId: string, toolCallId: string, result: any) {
  const ws = connections.get(sessionId)
  if (!ws) return

  ws.send(
    JSON.stringify({
      type: "tool_result",
      data: {
        toolCallId,
        result,
      },
    }),
  )
}
```

---

## 4. 连接管理

### 4.1 心跳机制

```typescript
// 心跳检测
function startHeartbeat(ws: WebSocket, interval: number = 30000) {
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }))
    } else {
      clearInterval(ping)
    }
  }, interval)

  return ping
}

// 超时检测
function setupTimeout(ws: WebSocket, timeout: number = 60000) {
  let lastPong = Date.now()

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === "pong") {
      lastPong = Date.now()
    }
  }

  const check = setInterval(() => {
    if (Date.now() - lastPong > timeout) {
      console.log("Connection timeout, closing")
      ws.close()
      clearInterval(check)
    }
  }, 10000)
}
```

### 4.2 房间管理

```typescript
// 按会话组织连接
const rooms = new Map<string, Set<WebSocket>>()

function joinRoom(sessionId: string, ws: WebSocket) {
  if (!rooms.has(sessionId)) {
    rooms.set(sessionId, new Set())
  }
  rooms.get(sessionId)!.add(ws)
}

function leaveRoom(sessionId: string, ws: WebSocket) {
  const room = rooms.get(sessionId)
  if (room) {
    room.delete(ws)
    if (room.size === 0) {
      rooms.delete(sessionId)
    }
  }
}

function broadcastToRoom(sessionId: string, message: any, exclude?: WebSocket) {
  const room = rooms.get(sessionId)
  if (!room) return

  const data = JSON.stringify(message)

  for (const ws of room) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}
```

---

## 5. 本章总结

### 核心概念

1. **连接建立**: 客户端-服务器握手
2. **消息类型**: join, message, chunk, tool_call, done
3. **流式推送**: 实时传输 AI 响应
4. **连接管理**: 心跳、超时、房间

### 消息协议

```typescript
// 客户端 → 服务器
{ type: 'join', sessionId: string }
{ type: 'message', content: string }
{ type: 'ping' }

// 服务器 → 客户端
{ type: 'chunk', content: string }
{ type: 'tool_call', data: {...} }
{ type: 'tool_result', data: {...} }
{ type: 'done' }
{ type: 'pong' }
```

### 检查清单

- [ ] 理解 WebSocket 原理
- [ ] 掌握连接建立和关闭
- [ ] 会实现消息推送
- [ ] 理解连接管理

---

**WebSocket 是实现实时 AI 对话的关键技术！**
