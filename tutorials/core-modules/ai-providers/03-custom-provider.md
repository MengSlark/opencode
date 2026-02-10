# 自定义 AI 提供商

> 📚 难度：高级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：接入任意 AI 服务

本教程讲解如何接入自定义的 AI 服务，包括国内大模型、私有化部署等。

---

## 1. 需求场景

### 1.1 常见需求

- **国内大模型**: 文心一言、通义千问、智谱 AI
- **私有化部署**: 企业内部模型
- **垂直领域模型**: 法律、医疗等专业模型
- **实验性模型**: 测试新模型

### 1.2 接入前提

- 有 API 文档
- 支持 HTTP 调用
- 返回格式可解析

---

## 2. 自定义 Provider 模板

### 2.1 基础模板

```typescript
import { BaseProvider } from "./base"
import { ChatOptions, ChatResponse, ChatChunk } from "./types"

export class CustomProvider extends BaseProvider {
  readonly name = "custom"

  readonly models = [
    {
      id: "model-name",
      name: "Model Display Name",
      maxTokens: 8192,
      capabilities: ["text", "tools"],
    },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = config.baseUrl || "https://api.example.com"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    // 1. 构建请求
    const request = this.buildRequest(options)

    // 2. 发送请求
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    // 3. 检查错误
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${error}`)
    }

    // 4. 解析响应
    const data = await response.json()
    return this.parseResponse(data)
  }

  async *stream(options: ChatOptions): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...this.buildRequest(options),
        stream: true,
      }),
    })

    yield* this.parseStream(response)
  }

  // 子类需要实现的方法
  protected abstract buildRequest(options: ChatOptions): object
  protected abstract parseResponse(data: any): ChatResponse
  protected abstract parseStream(response: Response): AsyncIterable<ChatChunk>
}
```

### 2.2 快速实现示例

```typescript
// 假设要接入 "ExampleAI"
// API 文档：https://api.example.com/docs

export class ExampleAIProvider extends BaseProvider {
  readonly name = "exampleai"

  readonly models = [
    {
      id: "example-7b",
      name: "Example 7B",
      maxTokens: 4096,
      capabilities: ["text"],
    },
    {
      id: "example-70b",
      name: "Example 70B",
      maxTokens: 8192,
      capabilities: ["text", "tools"],
    },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = config.baseUrl || "https://api.example.com/v1"
  }

  protected buildRequest(options: ChatOptions): object {
    // 根据 API 文档构建请求体
    return {
      model: options.model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      // 如果支持工具
      functions: options.tools ? this.convertTools(options.tools) : undefined,
    }
  }

  protected parseResponse(data: any): ChatResponse {
    // 根据实际响应格式解析
    return {
      content: data.choices[0].message.content,
      toolCalls: data.choices[0].message.function_call
        ? [
            {
              id: "call_" + Date.now(),
              type: "function",
              function: {
                name: data.choices[0].message.function_call.name,
                arguments: data.choices[0].message.function_call.arguments,
              },
            },
          ]
        : undefined,
      usage: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      model: data.model,
    }
  }

  protected async *parseStream(response: Response): AsyncIterable<ChatChunk> {
    const reader = response.body!.getReader()
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
            yield {
              content: chunk.choices[0]?.delta?.content,
              finishReason: chunk.choices[0]?.finish_reason,
            }
          } catch {
            // 忽略
          }
        }
      }
    }
  }
}
```

---

## 3. 国内大模型接入示例

### 3.1 文心一言 (百度)

```typescript
export class WenxinProvider extends BaseProvider {
  readonly name = "wenxin"

  readonly models = [
    { id: "ernie-bot-4", name: "文心一言 4", maxTokens: 8192, capabilities: ["text"] },
    { id: "ernie-bot", name: "文心一言", maxTokens: 4096, capabilities: ["text"] },
  ]

  private accessToken: string

  async initialize(): Promise<void> {
    // 百度需要获取 access token
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.apiSecret}`,
    )
    const data = await response.json()
    this.accessToken = data.access_token
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${options.model}?access_token=${this.accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: options.messages,
        }),
      },
    )

    const data = await response.json()
    return {
      content: data.result,
      usage: { prompt: 0, completion: 0, total: 0 },
      model: options.model,
    }
  }
}
```

### 3.2 通义千问 (阿里)

```typescript
export class QwenProvider extends BaseProvider {
  readonly name = "qwen"

  readonly models = [
    { id: "qwen-max", name: "通义千问 Max", maxTokens: 8192, capabilities: ["text"] },
    { id: "qwen-plus", name: "通义千问 Plus", maxTokens: 8192, capabilities: ["text"] },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = "https://dashscope.aliyuncs.com/api/v1"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model,
        input: {
          messages: options.messages,
        },
        parameters: {
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        },
      }),
    })

    const data = await response.json()
    return {
      content: data.output.text,
      usage: {
        prompt: data.usage.input_tokens,
        completion: data.usage.output_tokens,
        total: data.usage.total_tokens,
      },
      model: options.model,
    }
  }
}
```

---

## 4. 高级技巧

### 4.1 请求转换

```typescript
// 转换消息格式
function convertMessagesToOpenAIFormat(messages: Message[]): any[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

// 转换工具格式
function convertToolsToOpenAIFormat(tools: Tool[]): any[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters),
    },
  }))
}
```

### 4.2 错误处理

```typescript
async chat(options: ChatOptions): Promise<ChatResponse> {
  try {
    return await this.doChat(options)
  } catch (err) {
    // 特定错误处理
    if (err.message.includes('rate limit')) {
      // 等待后重试
      await sleep(1000)
      return this.chat(options)
    }

    if (err.message.includes('authentication')) {
      throw new Error(`API Key 无效: ${err.message}`)
    }

    throw err
  }
}
```

### 4.3 重试机制

```typescript
async chatWithRetry(
  options: ChatOptions,
  maxRetries: number = 3
): Promise<ChatResponse> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.chat(options)
    } catch (err) {
      lastError = err as Error

      // 指数退避
      const delay = Math.pow(2, i) * 1000
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
      await sleep(delay)
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError!.message}`)
}
```

---

## 5. 测试与验证

### 5.1 单元测试

```typescript
import { describe, expect, test } from "bun:test"
import { ExampleAIProvider } from "./example-ai"

describe("ExampleAIProvider", () => {
  const provider = new ExampleAIProvider({
    apiKey: "test-key",
  })

  test("should list models", () => {
    expect(provider.models.length).toBeGreaterThan(0)
  })

  test("should convert request correctly", () => {
    const request = provider.buildRequest({
      model: "example-7b",
      messages: [{ role: "user", content: "Hello" }],
    })

    expect(request.model).toBe("example-7b")
    expect(request.messages).toHaveLength(1)
  })

  test("should parse response correctly", () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: "Hello!",
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    }

    const parsed = provider.parseResponse(mockResponse)
    expect(parsed.content).toBe("Hello!")
    expect(parsed.usage.total).toBe(15)
  })
})
```

### 5.2 集成测试

```typescript
test(
  "should actually call API",
  async () => {
    const provider = new ExampleAIProvider({
      apiKey: process.env.EXAMPLE_API_KEY!,
    })

    const response = await provider.chat({
      model: "example-7b",
      messages: [{ role: "user", content: "Say hello" }],
    })

    expect(response.content).toBeTruthy()
    expect(response.usage.total).toBeGreaterThan(0)
  },
  { timeout: 30000 },
)
```

---

## 6. 注册自定义 Provider

```typescript
// 初始化时注册
import { providerRegistry } from "./provider-registry"
import { ExampleAIProvider } from "./example-ai"

export function initializeCustomProviders() {
  // 检查环境变量
  if (process.env.EXAMPLE_API_KEY) {
    providerRegistry.register(
      "exampleai",
      new ExampleAIProvider({
        apiKey: process.env.EXAMPLE_API_KEY,
        baseUrl: process.env.EXAMPLE_BASE_URL,
      }),
    )

    console.log("✓ Registered ExampleAI provider")
  }
}
```

---

## 7. 本章总结

### 核心步骤

1. **阅读文档** → 理解 API 格式
2. **继承基类** → 实现必要方法
3. **转换格式** → 适配消息和工具
4. **测试验证** → 确保正常工作
5. **注册使用** → 集成到系统

### 常见问题

- **认证问题**: 检查 API Key 格式和权限
- **格式不匹配**: 使用转换函数
- **缺少功能**: 文档中查找或联系服务商
- **网络问题**: 检查代理和防火墙

---

**现在你可以接入任意 AI 服务了！**
