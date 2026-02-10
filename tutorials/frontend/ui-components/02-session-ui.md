# 会话界面开发

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：开发会话相关 UI 组件

本教程讲解如何开发 OpenCode 的会话界面，包括消息列表、输入框和工具调用展示。

---

## 1. 会话界面结构

### 1.1 组件层次

```
SessionPage
├── SessionHeader           # 会话标题
├── MessageList             # 消息列表
│   ├── MessageItem         # 单条消息
│   │   ├── MessageContent  # 消息内容
│   │   ├── ToolCallCard    # 工具调用
│   │   └── MessageActions  # 操作按钮
│   └── MessageGroup        # 消息分组
├── InputArea               # 输入区域
│   ├── PromptInput         # 输入框
│   ├── AttachmentList      # 附件列表
│   └── SendButton          # 发送按钮
└── ToolPanel               # 工具面板（可选）
```

---

## 2. 消息列表组件

### 2.1 基础消息列表

```tsx
// components/MessageList.tsx
import { For, createSignal, createEffect } from "solid-js"
import { MessageItem } from "./MessageItem"

interface MessageListProps {
  messages: Message[]
  sessionId: string
}

export function MessageList(props: MessageListProps) {
  let listRef: HTMLDivElement

  // 自动滚动到底部
  createEffect(() => {
    if (listRef && props.messages.length > 0) {
      listRef.scrollTop = listRef.scrollHeight
    }
  })

  return (
    <div ref={listRef} class="message-list">
      <For each={props.messages}>{(message, index) => <MessageItem message={message} index={index()} />}</For>
    </div>
  )
}
```

### 2.2 单条消息组件

```tsx
// components/MessageItem.tsx
import { Show } from "solid-js"

interface MessageItemProps {
  message: Message
  index: number
}

export function MessageItem(props: MessageItemProps) {
  const isUser = () => props.message.role === "user"
  const isAssistant = () => props.message.role === "assistant"

  return (
    <div
      class="message-item"
      classList={{
        "message-user": isUser(),
        "message-assistant": isAssistant(),
      }}
    >
      <div class="message-avatar">{isUser() ? "👤" : "🤖"}</div>

      <div class="message-content">
        {/* 文本内容 */}
        <Show when={props.message.content}>
          <div class="message-text">{props.message.content}</div>
        </Show>

        {/* 工具调用 */}
        <Show when={props.message.tool_calls}>
          <ToolCallList toolCalls={props.message.tool_calls!} />
        </Show>
      </div>
    </div>
  )
}
```

---

## 3. 输入框组件

### 3.1 基础输入框

```tsx
// components/PromptInput.tsx
import { createSignal, onMount } from "solid-js"

interface PromptInputProps {
  onSubmit: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function PromptInput(props: PromptInputProps) {
  const [content, setContent] = createSignal("")
  let textareaRef: HTMLTextAreaElement

  // 自动调整高度
  const adjustHeight = () => {
    if (textareaRef) {
      textareaRef.style.height = "auto"
      textareaRef.style.height = textareaRef.scrollHeight + "px"
    }
  }

  const handleSubmit = () => {
    const text = content().trim()
    if (text && !props.disabled) {
      props.onSubmit(text)
      setContent("")
      textareaRef.style.height = "auto"
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  onMount(() => {
    textareaRef?.focus()
  })

  return (
    <div class="prompt-input">
      <textarea
        ref={textareaRef}
        value={content()}
        onInput={(e) => {
          setContent(e.target.value)
          adjustHeight()
        }}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder || "输入消息..."}
        disabled={props.disabled}
        rows={1}
      />

      <button onClick={handleSubmit} disabled={!content().trim() || props.disabled}>
        发送
      </button>
    </div>
  )
}
```

---

## 4. 工具调用展示

### 4.1 工具调用卡片

```tsx
// components/ToolCallCard.tsx
import { createSignal, Show } from "solid-js"

interface ToolCallCardProps {
  toolCall: ToolCall
  result?: ToolResult
}

export function ToolCallCard(props: ToolCallCardProps) {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div class="tool-call-card">
      <div class="tool-call-header" onClick={() => setExpanded(!expanded())}>
        <span class="tool-icon">🔧</span>
        <span class="tool-name">{props.toolCall.function.name}</span>
        <Show when={props.result}>
          <span class="tool-status">✓</span>
        </Show>
        <span class="expand-icon">{expanded() ? "▼" : "▶"}</span>
      </div>

      <Show when={expanded()}>
        <div class="tool-call-details">
          <div class="tool-arguments">
            <h4>参数：</h4>
            <pre>{JSON.stringify(JSON.parse(props.toolCall.function.arguments), null, 2)}</pre>
          </div>

          <Show when={props.result}>
            <div class="tool-result">
              <h4>结果：</h4>
              <pre>{props.result!.output}</pre>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
```

---

## 5. 完整会话页面

```tsx
// pages/SessionPage.tsx
import { createSignal, onMount } from "solid-js"
import { useParams } from "@solidjs/router"
import { MessageList } from "../components/MessageList"
import { PromptInput } from "../components/PromptInput"

export function SessionPage() {
  const params = useParams()
  const [session, setSession] = createSignal<Session | null>(null)
  const [loading, setLoading] = createSignal(false)

  onMount(async () => {
    const sess = await loadSession(params.id)
    setSession(sess)
  })

  const handleSendMessage = async (content: string) => {
    if (!session()) return

    setLoading(true)
    await session()!.sendMessage(content)
    setLoading(false)
  }

  return (
    <div class="session-page">
      <header class="session-header">
        <h1>{session()?.title || "新会话"}</h1>
      </header>

      <main class="session-main">
        <MessageList messages={session()?.messages || []} sessionId={params.id} />
      </main>

      <footer class="session-footer">
        <PromptInput onSubmit={handleSendMessage} disabled={loading()} placeholder="输入消息，按 Enter 发送..." />
      </footer>
    </div>
  )
}
```

---

## 6. 本章总结

### 核心组件

- **MessageList**: 消息列表，自动滚动
- **MessageItem**: 单条消息展示
- **PromptInput**: 输入框，支持快捷键
- **ToolCallCard**: 工具调用展示

### 关键技巧

1. 使用 `createEffect` 实现自动滚动
2. 使用 `Show` 进行条件渲染
3. 使用 `classList` 动态设置样式
4. 键盘事件处理

---

**会话界面是用户与 AI 交互的主要窗口，良好的设计至关重要！**
