# 主流 AI 提供商接入

> 📚 难度：中级 | ⏱️ 预计时间：3-4 天 | 🎯 目标：掌握主流 AI 服务的接入方法

本教程详细讲解如何接入 OpenAI、Anthropic Claude、Google Gemini 等主流 AI 服务。

---

## 1. OpenAI

### 1.1 配置

```typescript
// 环境变量
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1  // 可选，用于代理
```

### 1.2 完整实现

```typescript
export class OpenAIProvider extends BaseProvider {
  readonly name = "openai"

  readonly models: Model[] = [
    {
      id: "gpt-4-turbo-preview",
      name: "GPT-4 Turbo",
      maxTokens: 128000,
      capabilities: ["text", "vision", "tools"],
    },
    {
      id: "gpt-4",
      name: "GPT-4",
      maxTokens: 8192,
      capabilities: ["text", "tools"],
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      maxTokens: 16385,
      capabilities: ["text", "tools"],
    },
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
      body: JSON.stringify(this.buildRequest(options)),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI Error: ${error.error?.message || response.statusText}`)
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

    yield* this.parseStream(response)
  }

  private buildRequest(options: ChatOptions): object {
    return {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      tools: options.tools ? this.convertTools(options.tools) : undefined,
      tool_choice: options.tools ? "auto" : undefined,
    }
  }

  private parseResponse(data: any): ChatResponse {
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

  private async *parseStream(response: Response): AsyncIterable<ChatChunk> {
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
            } catch (e) {
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

### 1.3 工具调用示例

```typescript
// 测试工具调用
const provider = providerRegistry.get("openai")

const response = await provider.chat({
  model: "gpt-4",
  messages: [{ role: "user", content: "查找项目中的 TODO" }],
  tools: [
    {
      name: "grep",
      description: "搜索代码",
      parameters: z.object({
        pattern: z.string(),
        path: z.string().optional(),
      }),
    },
  ],
})

console.log(response.toolCalls)
// [{ id: 'call_xxx', function: { name: 'grep', arguments: '{"pattern":"TODO"}' } }]
```

---

## 2. Anthropic Claude

### 2.1 配置

```typescript
// 环境变量
ANTHROPIC_API_KEY = sk - ant - xxx
```

### 2.2 完整实现

```typescript
export class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic"

  readonly models: Model[] = [
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      maxTokens: 200000,
      capabilities: ["text", "vision", "tools"],
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      maxTokens: 200000,
      capabilities: ["text", "vision", "tools"],
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      maxTokens: 200000,
      capabilities: ["text", "vision", "tools"],
    },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = "https://api.anthropic.com/v1"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.buildRequest(options)),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Anthropic Error: ${error.error?.message}`)
    }

    return this.parseResponse(await response.json())
  }

  async *stream(options: ChatOptions): AsyncIterable<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...this.buildRequest(options),
        stream: true,
      }),
    })

    yield* this.parseStream(response)
  }

  private buildRequest(options: ChatOptions): object {
    const systemMessage = options.messages.find((m) => m.role === "system")
    const otherMessages = options.messages.filter((m) => m.role !== "system")

    return {
      model: options.model,
      system: systemMessage?.content,
      messages: otherMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      tools: options.tools ? this.convertToolsForClaude(options.tools) : undefined,
    }
  }

  private convertToolsForClaude(tools: Tool[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: zodToJsonSchema(tool.parameters),
    }))
  }

  private parseResponse(data: any): ChatResponse {
    const content = data.content
    const textContent = content.find((c: any) => c.type === "text")?.text || ""
    const toolUse = content.find((c: any) => c.type === "tool_use")

    return {
      content: textContent,
      toolCalls: toolUse
        ? [
            {
              id: toolUse.id,
              type: "function",
              function: {
                name: toolUse.name,
                arguments: JSON.stringify(toolUse.input),
              },
            },
          ]
        : undefined,
      usage: {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
    }
  }

  private async *parseStream(response: Response): AsyncIterable<ChatChunk> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") return

            try {
              const event = JSON.parse(data)

              if (event.type === "content_block_delta") {
                yield {
                  content: event.delta?.text,
                  toolCall: event.delta?.partial_json
                    ? {
                        function: { arguments: event.delta.partial_json },
                      }
                    : undefined,
                }
              }
            } catch (e) {
              // 忽略
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

---

## 3. Google Gemini

### 3.1 配置

```typescript
// 环境变量
GOOGLE_API_KEY = xxx
```

### 3.2 简化实现

```typescript
export class GoogleProvider extends BaseProvider {
  readonly name = "google"

  readonly models: Model[] = [
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      maxTokens: 32768,
      capabilities: ["text", "tools"],
    },
    {
      id: "gemini-pro-vision",
      name: "Gemini Pro Vision",
      maxTokens: 32768,
      capabilities: ["text", "vision", "tools"],
    },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = "https://generativelanguage.googleapis.com/v1"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/models/${options.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildRequest(options)),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google Error: ${error.error?.message}`)
    }

    return this.parseResponse(await response.json())
  }

  private buildRequest(options: ChatOptions): object {
    return {
      contents: options.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens,
      },
    }
  }

  private parseResponse(data: any): ChatResponse {
    const candidate = data.candidates[0]
    return {
      content: candidate.content.parts[0].text || "",
      usage: {
        prompt: 0, // Google 不提供 token 统计
        completion: 0,
        total: 0,
      },
      model: data.modelVersion,
    }
  }
}
```

---

## 4. 其他提供商

### 4.1 Azure OpenAI

```typescript
export class AzureProvider extends OpenAIProvider {
  readonly name = "azure"

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = `https://${config.resourceName}.openai.azure.com/openai/deployments/${config.deploymentId}`
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions?api-version=2024-02-01`, {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.buildRequest(options)),
    })

    return this.parseResponse(await response.json())
  }
}
```

### 4.2 本地模型 (Ollama)

```typescript
export class OllamaProvider extends BaseProvider {
  readonly name = "ollama"

  readonly models: Model[] = [
    { id: "llama2", name: "Llama 2", maxTokens: 4096, capabilities: ["text"] },
    { id: "codellama", name: "Code Llama", maxTokens: 4096, capabilities: ["text"] },
    { id: "mistral", name: "Mistral", maxTokens: 8192, capabilities: ["text"] },
  ]

  constructor(config: ProviderConfig) {
    super(config)
    this.baseUrl = config.baseUrl || "http://localhost:11434"
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
      }),
    })

    const data = await response.json()
    return {
      content: data.message?.content || "",
      usage: { prompt: 0, completion: 0, total: 0 },
      model: options.model,
    }
  }
}
```

---

## 5. 本章总结

### 各提供商特点

| 提供商    | 优势               | 注意点       |
| --------- | ------------------ | ------------ |
| OpenAI    | 功能完整，生态好   | 国内需要代理 |
| Anthropic | 上下文长，能力强   | 价格较高     |
| Google    | 速度快，免费额度多 | 工具支持有限 |
| Azure     | 企业级支持         | 配置复杂     |
| Ollama    | 本地运行，免费     | 需要硬件资源 |

### 配置清单

```bash
# OpenAI
OPENAI_API_KEY=sk-xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Google
GOOGLE_API_KEY=xxx

# Azure
AZURE_OPENAI_KEY=xxx
AZURE_OPENAI_RESOURCE=xxx

# Ollama（无需 API Key）
OLLAMA_BASE_URL=http://localhost:11434
```

---

**现在你可以选择适合的 AI 服务并接入 OpenCode 了！**
