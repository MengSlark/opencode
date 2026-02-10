# 服务端状态同步

> 📚 难度：高级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握前后端状态同步

本教程讲解 OpenCode 的服务端状态同步，包括 WebSocket 同步和乐观更新。

---

## 1. WebSocket 状态同步

### 1.1 建立连接

```tsx
// hooks/useWebSocket.ts
import { createSignal, createEffect, onCleanup } from "solid-js"

export function useWebSocket(url: string) {
  const [ws, setWs] = createSignal<WebSocket | null>(null)
  const [connected, setConnected] = createSignal(false)
  const [messages, setMessages] = createSignal<any[]>([])

  createEffect(() => {
    const socket = new WebSocket(url)

    socket.onopen = () => {
      console.log("WebSocket connected")
      setConnected(true)
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages((prev) => [...prev, data])
    }

    socket.onclose = () => {
      console.log("WebSocket disconnected")
      setConnected(false)
    }

    socket.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    setWs(socket)

    onCleanup(() => {
      socket.close()
    })
  })

  const send = (data: any) => {
    if (ws() && connected()) {
      ws()!.send(JSON.stringify(data))
    }
  }

  return { connected, messages, send }
}
```

### 1.2 会话同步

```tsx
// hooks/useSessionSync.ts
import { createEffect } from "solid-js"
import { useWebSocket } from "./useWebSocket"
import { useSession } from "../contexts/SessionContext"

export function useSessionSync(sessionId: string) {
  const { connected, messages, send } = useWebSocket(`ws://localhost:4096/ws?session=${sessionId}`)
  const { setCurrentSession } = useSession()

  // 处理服务器消息
  createEffect(() => {
    const msg = messages()[messages().length - 1]
    if (!msg) return

    switch (msg.type) {
      case "message_added":
        // 新消息
        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, msg.data],
              }
            : null,
        )
        break

      case "message_updated":
        // 消息更新（流式）
        setCurrentSession((prev) => {
          if (!prev) return null
          const messages = [...prev.messages]
          const index = messages.findIndex((m) => m.id === msg.data.id)
          if (index !== -1) {
            messages[index] = { ...messages[index], ...msg.data }
          }
          return { ...prev, messages }
        })
        break

      case "tool_called":
        // 工具调用
        console.log("Tool called:", msg.data)
        break
    }
  })

  const sendMessage = (content: string) => {
    send({
      type: "send_message",
      sessionId,
      content,
    })
  }

  return { connected, sendMessage }
}
```

---

## 2. 乐观更新

### 2.1 乐观更新模式

```tsx
// hooks/useOptimisticUpdate.ts
import { createSignal } from "solid-js"

export function useOptimisticUpdate<T>(updateFn: (item: T) => Promise<void>) {
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<Error | null>(null)

  const execute = async (optimisticItem: T, rollbackItem: T, updateState: (item: T) => void) => {
    // 1. 乐观更新 UI
    updateState(optimisticItem)
    setPending(true)
    setError(null)

    try {
      // 2. 发送请求
      await updateFn(optimisticItem)
    } catch (err) {
      // 3. 失败回滚
      console.error("Update failed:", err)
      updateState(rollbackItem)
      setError(err as Error)
    } finally {
      setPending(false)
    }
  }

  return { execute, pending, error }
}

// 使用示例
function MessageInput() {
  const [messages, setMessages] = createSignal<Message[]>([])
  const { execute, pending } = useOptimisticUpdate(sendMessageApi)

  const handleSubmit = async (content: string) => {
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      content,
      role: "user",
      status: "sending",
    }

    await execute(
      optimisticMessage,
      null, // 回滚时移除
      (msg) => {
        if (msg) {
          setMessages((prev) => [...prev, msg])
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
        }
      },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <input disabled={pending()} />
      <button disabled={pending()}>{pending() ? "发送中..." : "发送"}</button>
    </form>
  )
}
```

---

## 3. 错误处理

### 3.1 重连机制

```tsx
// hooks/useReconnect.ts
import { createSignal, createEffect } from "solid-js"

export function useReconnect(connect: () => void, maxRetries: number = 5) {
  const [retryCount, setRetryCount] = createSignal(0)
  const [shouldRetry, setShouldRetry] = createSignal(true)

  createEffect(() => {
    if (shouldRetry() && retryCount() < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount()), 30000)

      const timer = setTimeout(() => {
        console.log(`Reconnecting... attempt ${retryCount() + 1}`)
        connect()
        setRetryCount((c) => c + 1)
      }, delay)

      return () => clearTimeout(timer)
    }
  })

  const reset = () => {
    setRetryCount(0)
    setShouldRetry(true)
  }

  const stop = () => {
    setShouldRetry(false)
  }

  return { retryCount, reset, stop }
}
```

---

## 4. 本章总结

### 核心概念

- **WebSocket**: 实时双向通信
- **乐观更新**: 先更新 UI，后同步服务器
- **错误处理**: 失败回滚和重连

### 最佳实践

1. 乐观更新适用于低失败率操作
2. 始终提供回滚机制
3. 实现指数退避重连
4. 区分本地状态和服务器状态

---

**服务端状态同步是构建实时应用的关键！**
