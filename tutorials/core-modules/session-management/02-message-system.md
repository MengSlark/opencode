# 消息系统

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：理解消息格式和流转机制

本教程详细讲解 OpenCode 的消息系统，包括消息格式、转换和提示词构建。

---

## 1. 消息格式

### 1.1 基础消息类型

```typescript
// 系统消息 - 设置 AI 行为
type SystemMessage = {
  role: "system"
  content: string // 系统提示词
}

// 用户消息 - 用户输入
type UserMessage = {
  role: "user"
  content: string // 用户输入内容
  timestamp?: Date // 发送时间
  attachments?: Attachment[] // 附件
}

// AI 消息 - 助手回复
type AssistantMessage = {
  role: "assistant"
  content: string // 回复内容
  tool_calls?: ToolCall[] // 工具调用请求
  model?: string // 使用的模型
}

// 工具消息 - 工具执行结果
type ToolMessage = {
  role: "tool"
  tool_call_id: string // 对应的工具调用 ID
  content: string // 工具输出
  metadata?: object // 执行元数据
}

type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage
```

### 1.2 工具调用格式

```typescript
interface ToolCall {
  id: string               // 唯一标识
  type: 'function'         // 固定值
  function: {
    name: string           // 工具名
    arguments: string      // JSON 格式的参数
  }
}

// 示例
{
  id: "call_abc123",
  type: "function",
  function: {
    name: "grep",
    arguments: '{"pattern": "TODO", "path": "./src"}'
  }
}
```

---

## 2. 消息流转

### 2.1 完整对话流程

```
系统初始化
    │
    ▼
┌────────────────────────────────────────────┐
│  System Message                             │
│  "You are a coding assistant..."            │
└────────────────────────────────────────────┘
    │
    ▼
用户输入
    │
    ▼
┌────────────────────────────────────────────┐
│  User Message                               │
│  "帮我查找所有的 TODO"                       │
└────────────────────────────────────────────┘
    │
    ▼
AI 处理
    │
    ▼
┌────────────────────────────────────────────┐
│  Assistant Message                          │
│  content: "我来帮你查找..."                  │
│  tool_calls: [{                             │
│    name: "grep",                            │
│    arguments: '{"pattern": "TODO"}'         │
│  }]                                         │
└────────────────────────────────────────────┘
    │
    ▼
执行工具
    │
    ▼
┌────────────────────────────────────────────┐
│  Tool Message                               │
│  tool_call_id: "call_abc123"                │
│  content: "找到 5 个 TODO..."                │
└────────────────────────────────────────────┘
    │
    ▼
AI 继续处理
    │
    ▼
┌────────────────────────────────────────────┐
│  Assistant Message                          │
│  "我在以下位置找到了 5 个 TODO..."            │
│  （纯文本，无 tool_calls）                   │
└────────────────────────────────────────────┘
    │
    ▼
  结束
```

---

## 3. 提示词构建

### 3.1 系统提示词

```typescript
function buildSystemPrompt(options: { tools: Tool[]; projectContext: ProjectContext }): string {
  return `
    你是一个智能编程助手，可以帮助用户完成各种开发任务。
    
    当前项目: ${options.projectContext.name}
    技术栈: ${options.projectContext.techStack.join(", ")}
    
    你可以使用以下工具：
    ${options.tools
      .map(
        (tool) => `
      - ${tool.name}: ${tool.description}
    `,
      )
      .join("\n")}
    
    使用工具时请遵循以下规则：
    1. 每次只能调用一个工具
    2. 等待工具返回结果后再继续
    3. 如果工具需要权限，会先询问用户
    
    回复风格：
    - 简洁明了
    - 提供代码时附带解释
    - 不确定时主动询问
  `.trim()
}
```

### 3.2 工具描述生成

```typescript
function buildToolDescription(tool: Tool): string {
  const params = Object.entries(tool.parameters.shape)
    .map(([key, schema]) => {
      const desc = schema.description || ""
      const optional = schema.isOptional() ? " (可选)" : ""
      return `  - ${key}${optional}: ${desc}`
    })
    .join("\n")

  return `
    ${tool.name}: ${tool.description}
    参数:
    ${params}
  `.trim()
}
```

### 3.3 消息格式化

```typescript
// 转换为 OpenAI 格式
function toOpenAIMessages(messages: Message[]): OpenAIMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "system":
        return { role: "system", content: msg.content }

      case "user":
        return {
          role: "user",
          content: formatUserContent(msg),
        }

      case "assistant":
        return {
          role: "assistant",
          content: msg.content,
          tool_calls: msg.tool_calls?.map((tc) => ({
            id: tc.id,
            type: tc.type,
            function: tc.function,
          })),
        }

      case "tool":
        return {
          role: "tool",
          tool_call_id: msg.tool_call_id,
          content: msg.content,
        }
    }
  })
}
```

---

## 4. 消息转换

### 4.1 不同 AI 提供商的格式

```typescript
// OpenAI 格式
{
  "role": "assistant",
  "content": "我来帮你",
  "tool_calls": [{
    "id": "call_1",
    "type": "function",
    "function": {
      "name": "grep",
      "arguments": "{\"pattern\": \"TODO\"}"
    }
  }]
}

// Anthropic Claude 格式
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "我来帮你" },
    {
      "type": "tool_use",
      "id": "call_1",
      "name": "grep",
      "input": { "pattern": "TODO" }
    }
  ]
}

// Google Gemini 格式
{
  "role": "model",
  "parts": [{
    "functionCall": {
      "name": "grep",
      "args": { "pattern": "TODO" }
    }
  }]
}
```

### 4.2 格式转换器

```typescript
class MessageTransformer {
  // 转换为 Claude 格式
  static toClaude(messages: Message[]): ClaudeMessage[] {
    return messages.map((msg) => {
      if (msg.role === "assistant" && msg.tool_calls) {
        return {
          role: "assistant",
          content: [
            { type: "text", text: msg.content },
            ...msg.tool_calls.map((tc) => ({
              type: "tool_use" as const,
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            })),
          ],
        }
      }
      // ... 其他角色
    })
  }

  // 转换为 Gemini 格式
  static toGemini(messages: Message[]): GeminiMessage[] {
    return messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }))
  }

  // 从 Claude 格式转换回来
  static fromClaude(message: ClaudeMessage): AssistantMessage {
    const toolCalls = message.content
      .filter((c) => c.type === "tool_use")
      .map((c) => ({
        id: c.id,
        type: "function" as const,
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input),
        },
      }))

    return {
      role: "assistant",
      content: message.content.find((c) => c.type === "text")?.text || "",
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}
```

---

## 5. 上下文管理

### 5.1 上下文窗口

```typescript
interface ContextWindow {
  maxTokens: number // 最大 token 数
  usedTokens: number // 已使用 token 数
  reservedTokens: number // 保留 token 数（用于回复）
}

class ContextManager {
  private window: ContextWindow = {
    maxTokens: 128000, // GPT-4 上限
    usedTokens: 0,
    reservedTokens: 4000,
  }

  canAddMessage(message: Message): boolean {
    const tokens = this.estimateTokens(message)
    return this.window.usedTokens + tokens <= this.window.maxTokens - this.window.reservedTokens
  }

  estimateTokens(message: Message): number {
    // 简单估算：4 字符 ≈ 1 token
    const text = JSON.stringify(message)
    return Math.ceil(text.length / 4)
  }
}
```

### 5.2 消息优先级

```typescript
interface PrioritizedMessage extends Message {
  priority: number // 优先级（1-10，10 最高）
  timestamp: Date
}

function selectMessagesByPriority(messages: PrioritizedMessage[], maxTokens: number): Message[] {
  // 按优先级和时间排序
  const sorted = messages.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    return b.timestamp.getTime() - a.timestamp.getTime()
  })

  const result: Message[] = []
  let tokens = 0

  for (const msg of sorted) {
    const msgTokens = estimateTokens(msg)
    if (tokens + msgTokens <= maxTokens) {
      result.push(msg)
      tokens += msgTokens
    }
  }

  return result
}
```

---

## 6. 消息增强

### 6.1 添加上下文

```typescript
function enrichMessage(message: UserMessage, context: MessageContext): UserMessage {
  const enriched = { ...message }

  // 添加文件上下文
  if (context.currentFile) {
    enriched.content = `
当前文件: ${context.currentFile.path}
\`\`\`${context.currentFile.extension}
${context.currentFile.content}
\`\`\`

用户问题: ${message.content}
    `.trim()
  }

  // 添加项目上下文
  if (context.projectInfo) {
    enriched.content = `
项目: ${context.projectInfo.name}
技术栈: ${context.projectInfo.techStack.join(", ")}

${enriched.content}
    `.trim()
  }

  return enriched
}
```

### 6.2 消息摘要

```typescript
async function summarizeMessages(messages: Message[], maxLength: number = 500): Promise<string> {
  const conversation = messages.map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join("\n")

  const prompt = `
请总结以下对话的关键信息（不超过 ${maxLength} 字符）：

${conversation}

摘要：
  `.trim()

  const response = await ai.complete(prompt)
  return response.content
}
```

---

## 7. 最佳实践

### 7.1 消息验证

```typescript
function validateMessage(message: unknown): Message {
  const schema = z.object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.string().min(1),
  })

  return schema.parse(message)
}

function sanitizeMessage(message: Message): Message {
  return {
    ...message,
    content: message.content
      .slice(0, 100000) // 限制长度
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""), // 移除控制字符
  }
}
```

### 7.2 错误处理

```typescript
async function safeAddMessage(session: Session, message: Message): Promise<Result<void, Error>> {
  try {
    // 验证
    const validated = validateMessage(message)

    // 清理
    const sanitized = sanitizeMessage(validated)

    // 检查上下文长度
    if (!contextManager.canAddMessage(sanitized)) {
      // 压缩或截断
      await session.compact()
    }

    // 添加
    session.messages.push(sanitized)
    await session.save()

    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}
```

---

## 8. 本章总结

### 核心概念

1. **消息类型**: system, user, assistant, tool
2. **工具调用**: id, name, arguments
3. **提示词构建**: 系统提示 + 工具描述
4. **格式转换**: 不同 AI 提供商的适配
5. **上下文管理**: Token 限制和优先级

### 关键 API

```typescript
buildSystemPrompt(tools) // 构建系统提示
toOpenAIMessages(messages) // 格式转换
estimateTokens(message) // Token 估算
enrichMessage(msg, context) // 消息增强
```

### 检查清单

- [ ] 理解四种消息类型
- [ ] 掌握工具调用格式
- [ ] 会构建系统提示词
- [ ] 理解格式转换原理

---

**消息系统是 AI 对话的核心，深入理解它将帮助你开发更复杂的功能！**
