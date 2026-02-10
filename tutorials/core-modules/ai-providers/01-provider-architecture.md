# AI 提供商架构

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：理解 AI 服务接入层

本教程讲解 OpenCode 如何接入不同的 AI 服务（OpenAI、Claude、Gemini 等）。

---

## 1. 提供商架构概览

### 1.1 设计目标

- **统一接口**: 不同 AI 服务使用相同 API
- **易于扩展**: 快速接入新的 AI 服务
- **灵活配置**: 支持多模型切换
- **容错处理**: 失败时自动切换

### 1.2 架构图

```
┌─────────────────────────────────────────────┐
│                Agent Layer                  │
│           (决策与消息处理)                    │
└───────────────────┬─────────────────────────┘
                    │
                    │ 统一接口
                    ▼
┌─────────────────────────────────────────────┐
│            Provider Interface               │
│  ┌──────────────────────────────────────┐  │
│  │  chat(options: ChatOptions)          │  │
│  │  stream(options: ChatOptions)        │  │
│  │  models()                            │  │
│  └──────────────────────────────────────┘  │
└───────────────────┬─────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ OpenAI    │ │ Anthropic │ │ Google    │
│ Provider  │ │ Provider  │ │ Provider  │
└───────────┘ └───────────┘ └───────────┘
        │           │           │
        ▼           ▼           ▼
    ┌───────┐   ┌───────┐   ┌───────┐
    │GPT-4  │   │Claude │   │Gemini │
    │GPT-3.5│   │Opus   │   │Pro    │
    └───────┘   └───────┘   └───────┘
```

---

## 2. Provider 接口定义

### 2.1 核心接口

```typescript
interface Provider {
  // 提供商名称
  readonly name: string

  // 支持的模型
  readonly models: Model[]

  // 非流式对话
  chat(options: ChatOptions): Promise<ChatResponse>

  // 流式对话
  stream(options: ChatOptions): AsyncIterable<ChatChunk>

  // 检查可用性
  checkAvailability(): Promise<boolean>
}

interface Model {
  id: string
  name: string
  maxTokens: number
  capabilities: ("text" | "vision" | "tools")[]
}

interface ChatOptions {
  model: string
  messages: Message[]
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
  stream?: boolean
}

interface ChatResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: {
    prompt: number
    completion: number
    total: number
  }
  model: string
}

interface ChatChunk {
  content?: string
  toolCall?: Partial<ToolCall>
  finishReason?: "stop" | "length" | "tool_calls"
}
```

### 2.2 抽象基类

```typescript
abstract class BaseProvider implements Provider {
  abstract readonly name: string
  abstract readonly models: Model[]

  protected apiKey: string
  protected baseUrl: string

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
  }

  abstract chat(options: ChatOptions): Promise<ChatResponse>
  abstract stream(options: ChatOptions): AsyncIterable<ChatChunk>

  async checkAvailability(): Promise<boolean> {
    try {
      await this.chat({
        model: this.models[0].id,
        messages: [{ role: "user", content: "test" }],
        maxTokens: 1,
      })
      return true
    } catch {
      return false
    }
  }

  // 通用工具转换
  protected convertTools(tools?: Tool[]): any[] {
    if (!tools) return []

    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      },
    }))
  }
}
```

---

## 3. OpenAI Provider 实现

### 3.1 基础实现

```typescript
export class OpenAIProvider extends BaseProvider {
  readonly name = "openai"

  readonly models: Model[] = [
    { id: "gpt-4", name: "GPT-4", maxTokens: 128000, capabilities: ["text", "vision", "tools"] },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", maxTokens: 128000, capabilities: ["text", "vision", "tools"] },
    { id: "gpt-3.5-turbo", name: "GPT-3.5", maxTokens: 16000, capabilities: ["text", "tools"] },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        tools: this.convertTools(options.tools),
        tool_choice: options.tools ? "auto" : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content || "",
      toolCalls: data.choices[0].message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
      usage: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      model: data.model,
    }
  }

  async *stream(options: ChatOptions): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        tools: this.convertTools(options.tools),
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") return

          try {
            const chunk = JSON.parse(data)
            const delta = chunk.choices[0]?.delta

            yield {
              content: delta?.content,
              toolCall: delta?.tool_calls?.[0]
                ? {
                    id: delta.tool_calls[0].id,
                    function: delta.tool_calls[0].function,
                  }
                : undefined,
              finishReason: chunk.choices[0]?.finish_reason,
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }
}
```

---

## 4. 多提供商管理

### 4.1 Provider 注册表

```typescript
class ProviderRegistry {
  private providers: Map<string, Provider> = new Map()
  private defaultProvider: string = "openai"

  // 注册提供商
  register(name: string, provider: Provider): void {
    this.providers.set(name, provider)
  }

  // 获取提供商
  get(name?: string): Provider {
    const providerName = name || this.defaultProvider
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    return provider
  }

  // 列出所有提供商
  list(): Provider[] {
    return Array.from(this.providers.values())
  }

  // 设置默认提供商
  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`)
    }
    this.defaultProvider = name
  }

  // 自动选择提供商
  async autoSelect(): Promise<Provider> {
    for (const [name, provider] of this.providers) {
      if (await provider.checkAvailability()) {
        return provider
      }
    }
    throw new Error("No available provider")
  }
}

// 全局注册表
export const providerRegistry = new ProviderRegistry()
```

### 4.2 初始化所有提供商

```typescript
export async function initializeProviders(): Promise<void> {
  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    providerRegistry.register(
      "openai",
      new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    )
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    providerRegistry.register(
      "anthropic",
      new AnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY,
      }),
    )
  }

  // Google
  if (process.env.GOOGLE_API_KEY) {
    providerRegistry.register(
      "google",
      new GoogleProvider({
        apiKey: process.env.GOOGLE_API_KEY,
      }),
    )
  }

  // 检查可用性
  const available = await Promise.all(providerRegistry.list().map((p) => p.checkAvailability()))

  console.log(`Initialized ${available.filter(Boolean).length} providers`)
}
```

---

## 5. 故障转移

### 5.1 自动切换

```typescript
class FailoverProvider implements Provider {
  private providers: Provider[]
  private currentIndex: number = 0

  constructor(providers: Provider[]) {
    this.providers = providers
  }

  get name(): string {
    return `failover(${this.providers.map((p) => p.name).join(", ")})`
  }

  get models(): Model[] {
    return this.providers.flatMap((p) => p.models)
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    let lastError: Error

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[(this.currentIndex + i) % this.providers.length]

      try {
        const response = await provider.chat(options)
        this.currentIndex = (this.currentIndex + i) % this.providers.length
        return response
      } catch (err) {
        lastError = err as Error
        console.warn(`Provider ${provider.name} failed:`, err)
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError!.message}`)
  }

  async *stream(options: ChatOptions): AsyncIterable<ChatChunk> {
    // 类似实现
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[(this.currentIndex + i) % this.providers.length]

      try {
        yield* provider.stream(options)
        return
      } catch (err) {
        console.warn(`Provider ${provider.name} failed in stream:`, err)
      }
    }
  }
}
```

---

## 6. 本章总结

### 核心概念

1. **统一接口**: Provider 抽象层
2. **具体实现**: OpenAI, Anthropic, Google 等
3. **注册表**: 管理和切换提供商
4. **故障转移**: 自动切换可用服务

### 关键 API

```typescript
Provider.chat(options) // 非流式对话
Provider.stream(options) // 流式对话
ProviderRegistry.register() // 注册提供商
ProviderRegistry.get() // 获取提供商
```

### 检查清单

- [ ] 理解 Provider 接口设计
- [ ] 掌握流式响应实现
- [ ] 会注册多个提供商
- [ ] 理解故障转移机制

---

**掌握 Provider 架构，你可以接入任意 AI 服务！**
