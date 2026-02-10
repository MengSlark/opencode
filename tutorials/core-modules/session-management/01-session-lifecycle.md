# 会话生命周期

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：理解会话的完整生命周期

本教程深入讲解 OpenCode 的会话管理机制，帮助你理解对话是如何创建、运行和结束的。

---

## 1. 会话基础概念

### 1.1 什么是会话？

**会话（Session）** 是一次完整的 AI 对话过程，包含：

- 唯一的会话 ID
- 消息历史记录
- 当前状态（活跃/暂停/结束）
- 相关元数据

### 1.2 会话状态机

```
┌─────────┐     创建      ┌─────────┐
│  初始   │ ────────────► │  活跃   │
└─────────┘               └────┬────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
     ┌───────────┐      ┌───────────┐      ┌───────────┐
     │  等待输入  │      │  处理中   │      │  出错     │
     └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
           │                  │                   │
           └──────────────────┼───────────────────┘
                              │
                              ▼
                        ┌───────────┐
                        │   结束    │
                        └───────────┘
```

---

## 2. 会话创建

### 2.1 创建流程

```typescript
// 创建新会话
const session = await Session.create({
  projectId: "project-123",
  model: "gpt-4",
  metadata: {
    createdAt: new Date(),
    title: "新会话",
  },
})

console.log(session.id) // 生成唯一 ID
```

### 2.2 会话数据结构

```typescript
interface Session {
  id: string // 唯一标识
  projectId: string // 所属项目

  // 消息历史
  messages: Message[] // 所有消息

  // 状态
  status: "active" | "paused" | "error" | "completed"

  // 上下文
  context: {
    systemPrompt: string // 系统提示词
    variables: Record<string, any> // 变量
  }

  // 元数据
  metadata: {
    model: string // 使用的模型
    createdAt: Date
    updatedAt: Date
    messageCount: number
    tokenCount: number
  }
}

type Message =
  | { role: "user"; content: string; timestamp: Date }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }
  | { role: "system"; content: string }
```

---

## 3. 会话运行

### 3.1 消息处理流程

```
用户发送消息
      │
      ▼
┌─────────────────┐
│ 1. 添加到历史    │
│ 保存 user 消息   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Agent 处理    │
│ 构建上下文       │
│ 调用 AI         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 解析响应      │
│ 判断响应类型     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  纯文本    工具调用
    │         │
    │    ┌────┴────┐
    │    │         │
    │    ▼         ▼
    │  请求权限   直接执行
    │    │         │
    │    └────┬────┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ 4. 返回给用户    │
│ 显示结果        │
└─────────────────┘
```

### 3.2 代码实现示例

```typescript
class Session {
  async sendMessage(content: string): Promise<void> {
    // 1. 添加用户消息
    this.messages.push({
      role: "user",
      content,
      timestamp: new Date(),
    })

    // 2. 更新状态
    this.status = "processing"

    // 3. 调用 Agent 处理
    const response = await this.agent.process({
      messages: this.messages,
      tools: this.availableTools,
      context: this.context,
    })

    // 4. 处理响应
    if (response.type === "text") {
      this.messages.push({
        role: "assistant",
        content: response.content,
      })
    } else if (response.type === "tool_calls") {
      await this.handleToolCalls(response.toolCalls)
    }

    // 5. 保存会话
    await this.save()
  }

  private async handleToolCalls(toolCalls: ToolCall[]): Promise<void> {
    for (const call of toolCalls) {
      // 执行工具
      const result = await this.executeTool(call)

      // 添加工具结果到历史
      this.messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.output,
      })
    }

    // 让 AI 继续处理
    await this.continueProcessing()
  }
}
```

---

## 4. 会话存储

### 4.1 持久化机制

```typescript
// 存储路径
const SESSION_DIR = `${CONFIG_DIR}/sessions`

// 保存会话
async saveSession(session: Session): Promise<void> {
  const filePath = `${SESSION_DIR}/${session.id}.json`
  await Bun.write(filePath, JSON.stringify(session, null, 2))
}

// 加载会话
async loadSession(sessionId: string): Promise<Session> {
  const filePath = `${SESSION_DIR}/${sessionId}.json`
  const content = await Bun.file(filePath).text()
  return JSON.parse(content)
}
```

### 4.2 会话文件示例

```json
{
  "id": "sess_abc123",
  "projectId": "proj_xyz789",
  "status": "active",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful coding assistant..."
    },
    {
      "role": "user",
      "content": "帮我查找所有 TODO",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "我来帮你查找...",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "grep",
            "arguments": "{\"pattern\": \"TODO\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_1",
      "content": "找到 5 个 TODO..."
    }
  ],
  "metadata": {
    "model": "gpt-4",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:31:00Z",
    "messageCount": 4
  }
}
```

---

## 5. 会话管理

### 5.1 常用操作

```typescript
// 列出所有会话
const sessions = await Session.list({
  projectId: "proj_xyz789",
  limit: 10,
  offset: 0,
})

// 删除会话
await Session.delete("sess_abc123")

// 复制会话
const newSession = await Session.duplicate("sess_abc123")

// 导出会话
const exported = await Session.export("sess_abc123", {
  format: "json" | "markdown",
})
```

### 5.2 会话查询

```typescript
// 搜索会话
const results = await Session.search({
  query: "TODO",
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date("2024-01-31"),
  },
})
```

---

## 6. 会话压缩

### 6.1 为什么需要压缩？

- **Token 限制**: AI 有最大上下文限制
- **性能**: 长对话处理变慢
- **成本**: Token 数量影响 API 费用

### 6.2 压缩策略

```typescript
interface CompactionStrategy {
  // 保留最近 N 条消息
  keepRecent: number

  // 压缩阈值（消息数）
  threshold: number

  // 压缩方法
  method: "summarize" | "truncate" | "archive"
}

const DEFAULT_STRATEGY: CompactionStrategy = {
  keepRecent: 10,
  threshold: 50,
  method: "summarize",
}
```

### 6.3 压缩实现

```typescript
async compactSession(session: Session): Promise<void> {
  // 1. 检查是否需要压缩
  if (session.messages.length < COMPACTION_THRESHOLD) {
    return
  }

  // 2. 分离消息
  const recentMessages = session.messages.slice(-KEEP_RECENT)
  const oldMessages = session.messages.slice(0, -KEEP_RECENT)

  // 3. 生成摘要
  const summary = await generateSummary(oldMessages)

  // 4. 替换旧消息
  session.messages = [
    { role: 'system', content: `[对话摘要] ${summary}` },
    ...recentMessages
  ]

  // 5. 保存
  await session.save()
}

async function generateSummary(messages: Message[]): Promise<string> {
  // 使用 AI 生成摘要
  const prompt = `请总结以下对话的关键信息：\n\n${
    messages.map(m => `${m.role}: ${m.content}`).join('\n')
  }`

  const response = await ai.complete(prompt)
  return response.content
}
```

---

## 7. 多会话管理

### 7.1 会话切换

```typescript
// 活跃会话管理
class SessionManager {
  private activeSessions: Map<string, Session> = new Map()

  async switchSession(sessionId: string): Promise<Session> {
    // 保存当前会话
    if (this.currentSession) {
      await this.currentSession.save()
    }

    // 加载新会话
    const session = await Session.load(sessionId)
    this.currentSession = session

    return session
  }

  async createNewSession(projectId: string): Promise<Session> {
    const session = await Session.create({ projectId })
    this.activeSessions.set(session.id, session)
    this.currentSession = session
    return session
  }
}
```

### 7.2 会话状态同步

```typescript
// WebSocket 实时同步
class SessionSync {
  private ws: WebSocket

  constructor(session: Session) {
    this.ws = new WebSocket(SESSION_SYNC_URL)

    this.ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      this.applyUpdate(update)
    }
  }

  async sendUpdate(update: SessionUpdate): Promise<void> {
    this.ws.send(JSON.stringify(update))
  }
}
```

---

## 8. 最佳实践

### 8.1 会话组织

```typescript
// 按项目组织
project/
├── sessions/
│   ├── feature-auth-2024-01-15.json
│   ├── bugfix-login-2024-01-14.json
│   └── refactor-db-2024-01-13.json
```

### 8.2 会话命名

```typescript
// 自动命名
function generateSessionTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user")
  if (firstUserMessage) {
    // 取前 20 个字符
    return firstUserMessage.content.slice(0, 20) + "..."
  }
  return "新会话"
}
```

### 8.3 定期清理

```typescript
// 清理旧会话
async cleanupOldSessions(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const oldSessions = await Session.find({
    updatedAt: { $lt: thirtyDaysAgo }
  })

  for (const session of oldSessions) {
    // 归档而非删除
    await Session.archive(session.id)
  }
}
```

---

## 9. 本章总结

### 核心概念

1. **会话创建**: 初始化会话数据和状态
2. **消息流转**: user → agent → tool → response
3. **持久化**: JSON 文件存储
4. **压缩**: 管理上下文长度
5. **多会话**: 切换和同步

### 关键 API

```typescript
Session.create(options) // 创建
session.sendMessage(content) // 发送消息
session.save() // 保存
Session.load(id) // 加载
Session.delete(id) // 删除
```

### 检查清单

- [ ] 理解会话状态机
- [ ] 掌握消息处理流程
- [ ] 理解压缩机制
- [ ] 会管理多个会话

---

**理解会话生命周期是开发高级功能的基础！**
