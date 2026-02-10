# 类型定义速查

> 📖 参考手册 | 快速查阅类型定义

本页提供 OpenCode 核心类型的快速参考。

---

## 核心类型

### Tool

```typescript
interface Tool {
  name: string
  description: string
  parameters: ZodSchema
  execute: (params: any, ctx: ToolContext) => Promise<ToolResult>
}

type ToolContext = {
  sessionID: string
  messageID: string
  callID: string
  agent: string
  abort: AbortSignal
  ask: (options: AskOptions) => Promise<void>
  metadata: (data: object) => void
  messages: Message[]
}

type ToolResult = {
  title: string
  output: string
  metadata?: Record<string, any>
}

type AskOptions = {
  permission: string
  message?: string
  files?: string[]
  patterns?: string[]
  always?: string[]
  metadata?: Record<string, any>
}
```

### Session

```typescript
interface Session {
  id: string
  projectId: string
  status: "active" | "paused" | "completed" | "error"
  messages: Message[]
  context: SessionContext
  metadata: SessionMetadata
  createdAt: Date
  updatedAt: Date
}

interface SessionContext {
  systemPrompt: string
  variables: Record<string, any>
}

interface SessionMetadata {
  model: string
  title?: string
  messageCount: number
  tokenCount: number
  compactionHistory?: CompactionRecord[]
}

type CompactionRecord = {
  timestamp: Date
  originalMessages: number
  originalTokens: number
  newTokens: number
  savedTokens: number
}
```

### Message

```typescript
type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage

interface SystemMessage {
  role: "system"
  content: string
}

interface UserMessage {
  role: "user"
  content: string
  timestamp?: Date
  attachments?: Attachment[]
}

interface AssistantMessage {
  role: "assistant"
  content: string
  tool_calls?: ToolCall[]
  model?: string
}

interface ToolMessage {
  role: "tool"
  tool_call_id: string
  content: string
  metadata?: Record<string, any>
}

interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

interface Attachment {
  type: "file" | "image"
  path?: string
  content?: string
  mimeType?: string
}
```

### Provider

```typescript
interface Provider {
  readonly name: string
  readonly models: Model[]
  chat(options: ChatOptions): Promise<ChatResponse>
  stream(options: ChatOptions): AsyncIterable<ChatChunk>
  checkAvailability?(): Promise<boolean>
}

interface Model {
  id: string
  name: string
  maxTokens: number
  capabilities: ModelCapability[]
}

type ModelCapability = "text" | "vision" | "tools"

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
  usage: TokenUsage
  model: string
}

interface ChatChunk {
  content?: string
  toolCall?: Partial<ToolCall>
  finishReason?: "stop" | "length" | "tool_calls"
}

interface TokenUsage {
  prompt: number
  completion: number
  total: number
}
```

---

## API 类型

### HTTP API

```typescript
// 请求类型
interface CreateSessionRequest {
  projectId: string
  model?: string
  title?: string
}

interface SendMessageRequest {
  content: string
  attachments?: Attachment[]
}

interface ExecuteToolRequest {
  name: string
  arguments: Record<string, any>
}

// 响应类型
interface ListSessionsResponse {
  data: SessionSummary[]
  total: number
}

interface SessionSummary {
  id: string
  title?: string
  projectId: string
  createdAt: string
  messageCount: number
}

interface ErrorResponse {
  error: string
  message: string
  code: string
  details?: any
}
```

### WebSocket 类型

```typescript
// 客户端 → 服务器
type ClientMessage = JoinMessage | ChatMessage | PingMessage

interface JoinMessage {
  type: "join"
  sessionId: string
}

interface ChatMessage {
  type: "message"
  content: string
  sessionId: string
}

interface PingMessage {
  type: "ping"
}

// 服务器 → 客户端
type ServerMessage =
  | JoinedMessage
  | ChunkMessage
  | ToolCallMessage
  | ToolResultMessage
  | DoneMessage
  | ErrorMessage
  | PongMessage

interface JoinedMessage {
  type: "joined"
  sessionId: string
}

interface ChunkMessage {
  type: "chunk"
  content: string
}

interface ToolCallMessage {
  type: "tool_call"
  data: {
    id: string
    name: string
    arguments: any
  }
}

interface ToolResultMessage {
  type: "tool_result"
  data: {
    toolCallId: string
    result: any
  }
}

interface DoneMessage {
  type: "done"
}

interface ErrorMessage {
  type: "error"
  message: string
}

interface PongMessage {
  type: "pong"
}
```

---

## 插件类型

```typescript
interface Plugin {
  name: string
  version: string
  activate(context: PluginContext): Promise<void>
  deactivate?(): Promise<void>
}

interface PluginContext {
  tools: ToolRegistry
  commands: CommandRegistry
  ui: UIAPI
  events: EventEmitter
  storage: StorageAPI
  config: ConfigAPI
}

interface ToolRegistry {
  register(tool: ToolDefinition): void
  unregister(name: string): void
}

interface CommandRegistry {
  register(command: CommandDefinition): void
  execute(commandId: string, ...args: any[]): void
}

interface UIAPI {
  showMessage(message: string, type?: MessageType): void
  showInputBox(options: InputBoxOptions): Promise<string | undefined>
  showQuickPick(items: string[]): Promise<string | undefined>
}

type MessageType = "info" | "warning" | "error"

interface InputBoxOptions {
  prompt?: string
  placeHolder?: string
  value?: string
}

interface ToolDefinition {
  name: string
  description?: string
  parameters?: z.ZodSchema
  handler: (params: any, context: ToolContext) => Promise<ToolResult>
}

interface CommandDefinition {
  id: string
  title?: string
  keybinding?: string
  handler: () => void
}
```

---

## 配置类型

```typescript
interface Config {
  // 提供商配置
  providers: Record<string, ProviderConfig>

  // 默认设置
  defaultProvider: string
  defaultModel: string

  // 会话设置
  session: SessionConfig

  // UI 设置
  ui: UIConfig

  // 快捷键
  keybindings: Record<string, string>
}

interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  models?: string[]
}

interface SessionConfig {
  maxTokens: number
  temperature: number
  compactionThreshold: number
  autoCompact: boolean
}

interface UIConfig {
  theme: "light" | "dark" | "system"
  fontSize: number
  fontFamily: string
  showLineNumbers: boolean
  wordWrap: boolean
}
```

---

## 错误类型

```typescript
class OpenCodeError extends Error {
  code: ErrorCode
  details?: any

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message)
    this.code = code
    this.details = details
  }
}

enum ErrorCode {
  TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED",
  PROVIDER_NOT_FOUND = "PROVIDER_NOT_FOUND",
  PROVIDER_ERROR = "PROVIDER_ERROR",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

---

**这些是 OpenCode 中最常用的类型定义，建议收藏备用！**
