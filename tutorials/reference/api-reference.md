# API 参考文档

> 📖 参考手册 | 快速查阅 API

本页提供 OpenCode 核心 API 的速查参考。

---

## Tool API

### Tool.define

```typescript
Tool.define(name: string, config: ToolConfig): Tool

interface ToolConfig {
  description: string
  parameters: ZodSchema
  execute: (params: any, ctx: ToolContext) => Promise<ToolResult>
}

interface ToolContext {
  sessionID: string
  messageID: string
  callID: string
  agent: string
  abort: AbortSignal
  ask: (options: AskOptions) => Promise<void>
  metadata: (data: object) => void
}

interface ToolResult {
  title: string
  output: string
  metadata?: object
}
```

**示例**:

```typescript
const MyTool = Tool.define("my_tool", {
  description: "Tool description",
  parameters: z.object({
    param: z.string(),
  }),
  async execute(params, ctx) {
    return {
      title: "Result",
      output: "Success",
    }
  },
})
```

---

## Session API

### Session.create

```typescript
Session.create(options: SessionOptions): Promise<Session>

interface SessionOptions {
  projectId: string
  model?: string
  title?: string
}
```

### Session.load

```typescript
Session.load(id: string): Promise<Session | null>
```

### session.sendMessage

```typescript
session.sendMessage(content: string): Promise<void>
```

**示例**:

```typescript
const session = await Session.create({
  projectId: "proj_xxx",
  model: "gpt-4",
})

await session.sendMessage("Hello")
```

---

## Provider API

### Provider 接口

```typescript
interface Provider {
  readonly name: string
  readonly models: Model[]
  chat(options: ChatOptions): Promise<ChatResponse>
  stream(options: ChatOptions): AsyncIterable<ChatChunk>
}

interface ChatOptions {
  model: string
  messages: Message[]
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
}

interface ChatResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: TokenUsage
  model: string
}
```

---

## SolidJS 核心 API

### createSignal

```typescript
function createSignal<T>(initialValue: T): [get: () => T, set: (value: T | ((prev: T) => T)) => T]
```

**示例**:

```typescript
const [count, setCount] = createSignal(0)
console.log(count()) // 0
setCount(1)
```

### createStore

```typescript
function createStore<T>(initialValue: T): [state: T, setState: SetStoreFunction<T>]
```

**示例**:

```typescript
const [state, setState] = createStore({
  name: "John",
  age: 30,
})

setState("name", "Jane")
setState({ age: 31 })
```

### createEffect

```typescript
function createEffect(fn: () => void): void
```

**示例**:

```typescript
createEffect(() => {
  console.log("Count changed:", count())
})
```

### createMemo

```typescript
function createMemo<T>(fn: () => T): () => T
```

**示例**:

```typescript
const double = createMemo(() => count() * 2)
```

---

## 路由 API

### useParams

```typescript
function useParams<T = Params>(): T
```

**示例**:

```typescript
const params = useParams()
console.log(params.id)
```

### useSearchParams

```typescript
function useSearchParams<T = Params>(): [T, (params: Partial<T>, options?: { replace?: boolean }) => void]
```

### useNavigate

```typescript
function useNavigate(): (path: string, options?: { replace?: boolean }) => void
```

**示例**:

```typescript
const navigate = useNavigate()
navigate("/about")
```

---

## Bun API

### Bun.file

```typescript
Bun.file(path: string): BunFile
```

**方法**:

- `text(): Promise<string>`
- `json(): Promise<any>`
- `stream(): ReadableStream`
- `write(data: string | Buffer): Promise<void>`

**示例**:

```typescript
const file = Bun.file("/path/to/file.txt")
const content = await file.text()
await file.write("new content")
```

### Bun.spawn

```typescript
Bun.spawn(command: string[], options?: SpawnOptions): Subprocess
```

**示例**:

```typescript
const proc = Bun.spawn(["ls", "-la"])
const output = await new Response(proc.stdout).text()
```

### Bun.write

```typescript
Bun.write(path: string, data: string | Buffer): Promise<number>
```

**示例**:

```typescript
await Bun.write("file.txt", "content")
```

---

## 类型速查

### 常用类型

```typescript
// 消息类型
type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

// 工具调用
type ToolCall = {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

// Token 使用
type TokenUsage = {
  prompt: number
  completion: number
  total: number
}
```

---

## 错误码

| 错误码                | 说明            |
| --------------------- | --------------- |
| TOOL_NOT_FOUND        | 工具不存在      |
| TOOL_EXECUTION_FAILED | 工具执行失败    |
| PROVIDER_NOT_FOUND    | 提供商不存在    |
| PROVIDER_ERROR        | 提供商 API 错误 |
| SESSION_NOT_FOUND     | 会话不存在      |
| PERMISSION_DENIED     | 权限不足        |
| VALIDATION_ERROR      | 参数验证失败    |
| RATE_LIMITED          | 请求过于频繁    |
| INTERNAL_ERROR        | 内部错误        |

---

**保存本页作为快速参考！**
