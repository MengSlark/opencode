# 中级项目：自定义 AI 提供商

> 🎯 难度：中级 | ⏱️ 预计时间：1 周 | 📦 目标：接入新的 AI 服务

本项目将带你接入一个新的 AI 服务（以示例 API 为例），学会 Provider 开发。

---

## 1. 项目目标

### 1.1 需求背景

假设你要接入一个国内 AI 服务，它：

- 有自己的 API 格式
- 支持流式响应
- 支持工具调用

### 1.2 学习目标

- 理解 Provider 接口
- 实现消息格式转换
- 处理流式响应
- 支持工具调用

---

## 2. 准备工作

### 2.1 API 文档分析

假设 API 文档如下：

**基础信息**:

- Base URL: `https://api.example-ai.com/v1`
- 认证: `Authorization: Bearer {api_key}`

**对话接口**:

```http
POST /chat/completions
Content-Type: application/json
Authorization: Bearer xxx

{
  "model": "example-model",
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "temperature": 0.7,
  "stream": false
}
```

**响应格式**:

```json
{
  "id": "chat-xxx",
  "object": "chat.completion",
  "model": "example-model",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### 2.2 环境配置

```bash
# 环境变量
export EXAMPLE_API_KEY="your-api-key"
export EXAMPLE_BASE_URL="https://api.example-ai.com/v1"
```

---

## 3. 开发步骤

### 步骤 1: 创建 Provider 文件

```bash
touch packages/opencode/src/provider/example.ts
touch packages/opencode/test/provider/example.test.ts
```

### 步骤 2: 实现 Provider

```typescript
// packages/opencode/src/provider/example.ts

import { BaseProvider } from "./base"
import { ChatOptions, ChatResponse, ChatChunk } from "./types"

export class ExampleProvider extends BaseProvider {
  readonly name = "example"

  readonly models = [
    {
      id: "example-lite",
      name: "Example Lite",
      maxTokens: 4096,
      capabilities: ["text"],
    },
    {
      id: "example-pro",
      name: "Example Pro",
      maxTokens: 8192,
      capabilities: ["text", "tools"],
    },
    {
      id: "example-max",
      name: "Example Max",
      maxTokens: 32768,
      capabilities: ["text", "tools", "vision"],
    },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = config.baseUrl || "https://api.example-ai.com/v1"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.buildRequest(options)),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ExampleAI API error: ${error}`)
    }

    return this.parseResponse(await response.json())
  }

  async *stream(options: ChatOptions): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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

    if (!response.ok) {
      throw new Error(`ExampleAI API error: ${response.status}`)
    }

    yield* this.parseStream(response)
  }

  protected buildRequest(options: ChatOptions): object {
    return {
      model: options.model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      tools: options.tools ? this.convertTools(options.tools) : undefined,
    }
  }

  protected convertTools(tools: Tool[]): any[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      },
    }))
  }

  protected parseResponse(data: any): ChatResponse {
    const choice = data.choices[0]

    return {
      content: choice.message?.content || "",
      toolCalls: choice.message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
      usage: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
      model: data.model,
    }
  }

  protected async *parseStream(response: Response): AsyncIterable<ChatChunk> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
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
                      function: {
                        name: delta.tool_calls[0].function?.name,
                        arguments: delta.tool_calls[0].function?.arguments,
                      },
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
    } finally {
      reader.releaseLock()
    }
  }
}
```

### 步骤 3: 注册 Provider

```typescript
// packages/opencode/src/provider/index.ts

import { providerRegistry } from "./registry"
import { ExampleProvider } from "./example"

export function initializeProviders() {
  // ... 其他 provider

  // 注册 Example Provider
  if (process.env.EXAMPLE_API_KEY) {
    providerRegistry.register(
      "example",
      new ExampleProvider({
        apiKey: process.env.EXAMPLE_API_KEY,
        baseUrl: process.env.EXAMPLE_BASE_URL,
      }),
    )
  }
}
```

### 步骤 4: 编写测试

```typescript
// packages/opencode/test/provider/example.test.ts

import { describe, expect, test } from "bun:test"
import { ExampleProvider } from "../../src/provider/example"

describe("ExampleProvider", () => {
  const provider = new ExampleProvider({
    apiKey: "test-key",
  })

  test("should list models", () => {
    expect(provider.models.length).toBe(3)
    expect(provider.models[0].id).toBe("example-lite")
  })

  test("should build request correctly", () => {
    const request = provider.buildRequest({
      model: "example-pro",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.5,
      maxTokens: 100,
    })

    expect(request.model).toBe("example-pro")
    expect(request.temperature).toBe(0.5)
    expect(request.max_tokens).toBe(100)
    expect(request.messages).toHaveLength(1)
  })

  test("should parse response correctly", () => {
    const mockResponse = {
      id: "chat-xxx",
      model: "example-pro",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello!",
          },
          finish_reason: "stop",
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
    expect(parsed.model).toBe("example-pro")
  })

  test("should parse tool calls", () => {
    const mockResponse = {
      id: "chat-xxx",
      model: "example-pro",
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "grep",
                  arguments: '{"pattern": "TODO"}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }

    const parsed = provider.parseResponse(mockResponse)

    expect(parsed.toolCalls).toHaveLength(1)
    expect(parsed.toolCalls![0].function.name).toBe("grep")
  })
})
```

### 步骤 5: 集成测试

```typescript
// packages/opencode/test/provider/example-integration.test.ts

describe("ExampleProvider Integration", () => {
  test(
    "should actually call API",
    async () => {
      if (!process.env.EXAMPLE_API_KEY) {
        console.log("跳过测试：未配置 EXAMPLE_API_KEY")
        return
      }

      const provider = new ExampleProvider({
        apiKey: process.env.EXAMPLE_API_KEY,
      })

      const response = await provider.chat({
        model: "example-lite",
        messages: [{ role: "user", content: "Say hello" }],
      })

      expect(response.content).toBeTruthy()
      expect(response.usage.total).toBeGreaterThan(0)
    },
    { timeout: 30000 },
  )

  test(
    "should stream response",
    async () => {
      if (!process.env.EXAMPLE_API_KEY) {
        console.log("跳过测试：未配置 EXAMPLE_API_KEY")
        return
      }

      const provider = new ExampleProvider({
        apiKey: process.env.EXAMPLE_API_KEY,
      })

      const chunks: string[] = []

      for await (const chunk of provider.stream({
        model: "example-lite",
        messages: [{ role: "user", content: "Count 1 to 5" }],
      })) {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }

      expect(chunks.length).toBeGreaterThan(0)
    },
    { timeout: 60000 },
  )
})
```

---

## 4. 高级功能

### 4.1 添加重试机制

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

      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
        await sleep(delay)
      }
    }
  }

  throw lastError
}
```

### 4.2 添加缓存

```typescript
const responseCache = new Map<string, ChatResponse>()

async chat(options: ChatOptions): Promise<ChatResponse> {
  const cacheKey = JSON.stringify(options)

  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)!
  }

  const response = await this.doChat(options)
  responseCache.set(cacheKey, response)

  return response
}
```

---

## 5. 项目总结

### 学到的技能

✅ **Provider 架构**: 统一接口设计
✅ **API 集成**: HTTP 请求和响应处理
✅ **流式响应**: 实现 stream 接口
✅ **工具支持**: 工具调用转换
✅ **错误处理**: 重试和容错机制

### 检查清单

- [ ] Provider 实现完整
- [ ] 支持非流式和流式
- [ ] 支持工具调用
- [ ] 有完善的测试
- [ ] 实际 API 调用成功

---

## 6. 常见问题

### Q: API 返回格式不匹配？

**A:** 调整 `parseResponse` 方法，映射字段名。

### Q: 流式响应有问题？

**A:** 检查 SSE 格式，确保正确处理 data: 前缀。

### Q: 工具调用不工作？

**A:** 检查 `convertTools` 是否正确转换了工具定义。

---

**恭喜！你成功接入了自定义 AI 提供商！** 🎉
