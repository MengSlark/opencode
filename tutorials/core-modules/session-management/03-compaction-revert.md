# 会话压缩与回滚

> 📚 难度：高级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握长对话管理技术

本教程讲解如何处理长对话的压缩和状态回滚，这是构建可靠 AI 系统的关键技术。

---

## 1. 为什么需要压缩？

### 1.1 Token 限制问题

```
GPT-4:        128K tokens 上限
GPT-3.5:      16K tokens 上限
Claude 3:     200K tokens 上限

实际对话中：
- 系统提示：~500 tokens
- 工具描述：~2000 tokens
- 每条消息：平均 ~200 tokens

50 条消息后可能就接近上限！
```

### 1.2 压缩的好处

1. **节省成本**: Token 越少，API 费用越低
2. **提高速度**: 短上下文处理更快
3. **避免截断**: 保留重要信息
4. **保持连贯**: 不会丢失对话主题

---

## 2. 压缩策略

### 2.1 策略对比

| 策略     | 优点         | 缺点         | 适用场景 |
| -------- | ------------ | ------------ | -------- |
| 截断     | 简单快速     | 丢失信息     | 临时处理 |
| 摘要     | 保留关键信息 | 可能遗漏细节 | 通用场景 |
| 归档     | 完整保留     | 需要额外存储 | 重要对话 |
| 智能选择 | 保留重要消息 | 复杂         | 高级场景 |

### 2.2 截断策略

```typescript
function truncateMessages(messages: Message[], maxTokens: number): Message[] {
  // 保留系统消息和最近的消息
  const systemMessages = messages.filter((m) => m.role === "system")
  const recentMessages = messages.slice(-10) // 保留最近 10 条

  let result = [...systemMessages, ...recentMessages]
  let tokens = estimateTokens(result)

  // 如果还超，继续截断
  while (tokens > maxTokens && result.length > systemMessages.length + 1) {
    result.splice(systemMessages.length, 1) // 删除最旧的用户消息
    tokens = estimateTokens(result)
  }

  return result
}
```

### 2.3 摘要策略

```typescript
interface SummaryStrategy {
  // 保留最近 N 条原消息
  keepRecent: number

  // 摘要的旧消息数量
  summarizeCount: number

  // 摘要生成方式
  method: "ai" | "rule-based"
}

async function summarizeMessages(messages: Message[], strategy: SummaryStrategy): Promise<Session> {
  // 1. 分离消息
  const recent = messages.slice(-strategy.keepRecent)
  const toSummarize = messages.slice(0, -strategy.keepRecent)

  // 2. 生成摘要
  let summary: string
  if (strategy.method === "ai") {
    summary = await generateAISummary(toSummarize)
  } else {
    summary = generateRuleBasedSummary(toSummarize)
  }

  // 3. 构建新消息列表
  const systemMsg = messages.find((m) => m.role === "system")
  const summaryMsg: SystemMessage = {
    role: "system",
    content: `[对话摘要] ${summary}`,
  }

  return {
    ...session,
    messages: [systemMsg, summaryMsg, ...recent],
  }
}
```

### 2.4 AI 摘要生成

```typescript
async function generateAISummary(messages: Message[]): Promise<string> {
  const conversation = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const content = m.content.slice(0, 500) // 限制单条长度
      return `${m.role}: ${content}`
    })
    .join("\n\n")

  const prompt = `
请总结以下对话的关键信息，保留：
1. 用户的原始需求
2. 已完成的任务
3. 正在进行的任务
4. 重要的决策或结论
5. 相关文件和代码

用 300 字以内概括：

${conversation}

摘要：
  `.trim()

  const response = await ai.complete(prompt, {
    model: "gpt-3.5-turbo", // 使用便宜的模型
    maxTokens: 500,
  })

  return response.content
}
```

### 2.5 规则摘要

```typescript
function generateRuleBasedSummary(messages: Message[]): string {
  const summary = {
    topics: new Set<string>(),
    files: new Set<string>(),
    tools: new Set<string>(),
    decisions: [] as string[],
  }

  for (const msg of messages) {
    if (msg.role === "user") {
      // 提取主题（简单关键词匹配）
      const topics = extractTopics(msg.content)
      topics.forEach((t) => summary.topics.add(t))
    }

    if (msg.role === "assistant" && msg.tool_calls) {
      // 记录使用的工具
      msg.tool_calls.forEach((tc) => {
        summary.tools.add(tc.function.name)

        // 提取文件路径
        const args = JSON.parse(tc.function.arguments)
        if (args.path) summary.files.add(args.path)
      })
    }
  }

  return `
主题: ${Array.from(summary.topics).join(", ")}
涉及文件: ${Array.from(summary.files).slice(0, 5).join(", ")}
使用工具: ${Array.from(summary.tools).join(", ")}
  `.trim()
}
```

---

## 3. 压缩时机

### 3.1 触发条件

```typescript
interface CompactionTrigger {
  // 消息数量阈值
  messageCount: number

  // Token 数量阈值（相对于上限的百分比）
  tokenRatio: number

  // 时间阈值（长时间运行的会话）
  duration: number // 毫秒
}

const DEFAULT_TRIGGER: CompactionTrigger = {
  messageCount: 50,
  tokenRatio: 0.7, // 达到 70% 时触发
  duration: 30 * 60 * 1000, // 30 分钟
}

function shouldCompact(session: Session): boolean {
  const tokens = estimateSessionTokens(session)
  const maxTokens = session.modelConfig.maxTokens

  return (
    session.messages.length > DEFAULT_TRIGGER.messageCount ||
    tokens / maxTokens > DEFAULT_TRIGGER.tokenRatio ||
    Date.now() - session.createdAt.getTime() > DEFAULT_TRIGGER.duration
  )
}
```

### 3.2 自动压缩

```typescript
class AutoCompactSession extends Session {
  async sendMessage(content: string): Promise<void> {
    // 检查是否需要压缩
    if (shouldCompact(this)) {
      await this.compact()
    }

    // 正常发送消息
    return super.sendMessage(content)
  }

  async compact(): Promise<void> {
    console.log(`[压缩] 会话 ${this.id} 从 ${this.messages.length} 条消息开始压缩`)

    const before = estimateSessionTokens(this)

    // 执行压缩
    this.messages = await this.compressMessages(this.messages)

    const after = estimateSessionTokens(this)

    console.log(`[压缩] 完成: ${before} → ${after} tokens`)

    // 保存压缩历史
    await this.saveCompactHistory(before, after)
  }
}
```

---

## 4. 状态回滚

### 4.1 为什么需要回滚？

- **错误操作**: AI 调用了错误的工具
- **用户后悔**: 想撤销某次对话
- **分支探索**: 尝试不同方案后回到原点
- **调试**: 重现问题需要特定状态

### 4.2 回滚机制设计

```typescript
interface SessionSnapshot {
  id: string
  timestamp: Date
  messages: Message[]
  metadata: object
}

class RollbackManager {
  private snapshots: Map<string, SessionSnapshot[]> = new Map()
  private maxSnapshots: number = 10

  // 创建快照
  async createSnapshot(session: Session): Promise<string> {
    const snapshot: SessionSnapshot = {
      id: generateId(),
      timestamp: new Date(),
      messages: deepClone(session.messages),
      metadata: deepClone(session.metadata),
    }

    const sessionSnapshots = this.snapshots.get(session.id) || []
    sessionSnapshots.push(snapshot)

    // 只保留最近 N 个快照
    if (sessionSnapshots.length > this.maxSnapshots) {
      sessionSnapshots.shift()
    }

    this.snapshots.set(session.id, sessionSnapshots)

    return snapshot.id
  }

  // 回滚到指定快照
  async rollback(session: Session, snapshotId: string): Promise<Session> {
    const sessionSnapshots = this.snapshots.get(session.id) || []
    const snapshot = sessionSnapshots.find((s) => s.id === snapshotId)

    if (!snapshot) {
      throw new Error(`快照 ${snapshotId} 不存在`)
    }

    // 恢复状态
    session.messages = deepClone(snapshot.messages)
    session.metadata = deepClone(snapshot.metadata)
    session.updatedAt = new Date()

    await session.save()

    return session
  }

  // 列出可用快照
  listSnapshots(sessionId: string): SessionSnapshot[] {
    return this.snapshots.get(sessionId) || []
  }
}
```

### 4.3 自动快照

```typescript
class SmartSession extends Session {
  private rollbackManager = new RollbackManager()

  async sendMessage(content: string): Promise<void> {
    // 关键操作前创建快照
    if (this.isCriticalOperation(content)) {
      await this.rollbackManager.createSnapshot(this)
    }

    try {
      return await super.sendMessage(content)
    } catch (err) {
      // 操作失败，询问是否回滚
      const shouldRollback = await this.ask({
        type: "confirm",
        question: "操作失败，是否回滚到之前的状态？",
      })

      if (shouldRollback) {
        const snapshots = this.rollbackManager.listSnapshots(this.id)
        if (snapshots.length > 0) {
          await this.rollbackManager.rollback(this, snapshots[snapshots.length - 1].id)
        }
      }

      throw err
    }
  }

  private isCriticalOperation(content: string): boolean {
    // 检测关键操作关键词
    const keywords = ["删除", "修改", "覆盖", "rm", "write", "edit"]
    return keywords.some((k) => content.includes(k))
  }
}
```

---

## 5. 压缩与回滚实战

### 5.1 完整示例

```typescript
class ProductionSession extends Session {
  private compactionStrategy: CompactionStrategy = {
    keepRecent: 10,
    summarizeCount: 40,
    method: "ai",
  }

  private rollbackManager = new RollbackManager()

  async sendMessage(content: string): Promise<void> {
    // 1. 创建快照（如果消息数较多）
    if (this.messages.length > 20) {
      await this.rollbackManager.createSnapshot(this)
    }

    // 2. 检查是否需要压缩
    if (shouldCompact(this)) {
      await this.compact()
    }

    // 3. 发送消息
    try {
      await super.sendMessage(content)
    } catch (err) {
      // 4. 失败时提供回滚选项
      await this.handleError(err)
    }
  }

  async compact(): Promise<void> {
    console.log(`[会话 ${this.id}] 开始压缩...`)

    const originalLength = this.messages.length
    const originalTokens = estimateSessionTokens(this)

    // 执行压缩
    this.messages = await summarizeMessages(this.messages, this.compactionStrategy)

    const newTokens = estimateSessionTokens(this)

    // 记录压缩历史
    this.metadata.compactionHistory = [
      ...(this.metadata.compactionHistory || []),
      {
        timestamp: new Date(),
        originalMessages: originalLength,
        originalTokens,
        newTokens,
        savedTokens: originalTokens - newTokens,
      },
    ]

    console.log(`[会话 ${this.id}] 压缩完成: ${originalTokens} → ${newTokens} tokens`)
  }

  async rollbackTo(snapshotId?: string): Promise<void> {
    if (snapshotId) {
      await this.rollbackManager.rollback(this, snapshotId)
    } else {
      // 回滚到最后一个快照
      const snapshots = this.rollbackManager.listSnapshots(this.id)
      if (snapshots.length === 0) {
        throw new Error("没有可用的快照")
      }
      await this.rollbackManager.rollback(this, snapshots[snapshots.length - 1].id)
    }
  }

  private async handleError(err: Error): Promise<void> {
    console.error("消息处理失败:", err)

    // 检查是否有快照可以回滚
    const snapshots = this.rollbackManager.listSnapshots(this.id)
    if (snapshots.length > 0) {
      console.log(`可以回滚到 ${snapshots.length} 个之前的快照`)
    }

    throw err
  }
}
```

### 5.2 使用示例

```typescript
// 创建会话
const session = new ProductionSession({
  projectId: "my-project",
  model: "gpt-4",
})

// 进行多轮对话
await session.sendMessage("帮我分析这个项目")
await session.sendMessage("修改 src/index.ts")
// ... 更多对话 ...

// 手动触发压缩
await session.compact()

// 查看压缩历史
console.log(session.metadata.compactionHistory)

// 回滚到之前的状态
await session.rollbackTo()
```

---

## 6. 最佳实践

### 6.1 压缩建议

```typescript
// 1. 不要压缩系统消息
function shouldIncludeInSummary(msg: Message): boolean {
  return msg.role !== "system"
}

// 2. 保留工具调用的关键信息
function extractToolContext(msg: ToolMessage): string {
  const data = JSON.parse(msg.content)
  return data.output || data.result || "操作完成"
}

// 3. 渐进式压缩
async function progressiveCompact(session: Session): Promise<void> {
  // 第一次：轻度压缩，保留更多细节
  if (session.messages.length < 100) {
    await session.compact({ keepRecent: 20, method: "rule-based" })
  }
  // 第二次：深度压缩
  else {
    await session.compact({ keepRecent: 10, method: "ai" })
  }
}
```

### 6.2 回滚建议

```typescript
// 1. 关键操作前自动快照
const CRITICAL_TOOLS = ["write", "edit", "bash"]

// 2. 限制快照数量，避免内存溢出
const MAX_SNAPSHOTS = 5

// 3. 快照持久化
async function persistSnapshot(snapshot: SessionSnapshot): Promise<void> {
  await Bun.write(`.snapshots/${snapshot.id}.json`, JSON.stringify(snapshot))
}
```

---

## 7. 本章总结

### 核心概念

1. **压缩必要性**: Token 限制、成本控制
2. **压缩策略**: 截断、摘要、归档、智能选择
3. **触发时机**: 消息数、Token 比例、时间
4. **状态回滚**: 快照、恢复、分支管理

### 关键 API

```typescript
shouldCompact(session) // 检查是否需要压缩
summarizeMessages(messages) // 生成摘要
createSnapshot(session) // 创建快照
rollback(session, snapshotId) // 回滚状态
```

### 检查清单

- [ ] 理解压缩的必要性
- [ ] 掌握不同压缩策略
- [ ] 会实现自动压缩
- [ ] 理解回滚机制
- [ ] 能处理压缩和回滚的边界情况

---

**掌握压缩和回滚技术，你的 AI 系统将能处理任意长度的对话！**
