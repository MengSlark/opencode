# 全局状态管理

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握状态管理模式

本教程讲解 OpenCode 前端的全局状态管理，包括 Context API 和 Store 模式。

---

## 1. Context API

### 1.1 创建 Context

```tsx
// contexts/SessionContext.tsx
import { createContext, useContext, createSignal, ParentComponent } from "solid-js"

interface SessionContextType {
  currentSession: () => Session | null
  setCurrentSession: (session: Session | null) => void
  sessions: () => Session[]
  addSession: (session: Session) => void
  removeSession: (id: string) => void
}

const SessionContext = createContext<SessionContextType>()

export const SessionProvider: ParentComponent = (props) => {
  const [currentSession, setCurrentSession] = createSignal<Session | null>(null)
  const [sessions, setSessions] = createSignal<Session[]>([])

  const addSession = (session: Session) => {
    setSessions((prev) => [...prev, session])
  }

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (currentSession()?.id === id) {
      setCurrentSession(null)
    }
  }

  return (
    <SessionContext.Provider
      value={{
        currentSession,
        setCurrentSession,
        sessions,
        addSession,
        removeSession,
      }}
    >
      {props.children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within SessionProvider")
  }
  return context
}
```

### 1.2 使用 Context

```tsx
// components/SessionList.tsx
import { useSession } from "../contexts/SessionContext"

export function SessionList() {
  const { sessions, currentSession, setCurrentSession } = useSession()

  return (
    <div class="session-list">
      <For each={sessions()}>
        {(session) => (
          <div
            class="session-item"
            classList={{ active: session.id === currentSession()?.id }}
            onClick={() => setCurrentSession(session)}
          >
            {session.title}
          </div>
        )}
      </For>
    </div>
  )
}
```

---

## 2. Store 模式

### 2.1 创建全局 Store

```tsx
// stores/appStore.ts
import { createStore } from "solid-js/store"

interface AppState {
  user: User | null
  settings: Settings
  notifications: Notification[]
  isLoading: boolean
}

const [state, setState] = createStore<AppState>({
  user: null,
  settings: {
    theme: "system",
    language: "zh-CN",
    fontSize: 14,
  },
  notifications: [],
  isLoading: false,
})

// Actions
export const appStore = {
  // Getters
  get user() {
    return state.user
  },
  get settings() {
    return state.settings
  },
  get notifications() {
    return state.notifications
  },
  get isLoading() {
    return state.isLoading
  },

  // Setters
  setUser: (user: User | null) => setState("user", user),

  setSettings: (settings: Partial<Settings>) => setState("settings", (prev) => ({ ...prev, ...settings })),

  addNotification: (notification: Notification) => setState("notifications", (prev) => [...prev, notification]),

  removeNotification: (id: string) => setState("notifications", (prev) => prev.filter((n) => n.id !== id)),

  setLoading: (loading: boolean) => setState("isLoading", loading),
}
```

### 2.2 使用 Store

```tsx
// components/UserProfile.tsx
import { appStore } from "../stores/appStore"

export function UserProfile() {
  return (
    <div class="user-profile">
      <Show when={appStore.user} fallback={<div>未登录</div>}>
        {(user) => (
          <>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <button onClick={() => appStore.setUser(null)}>退出登录</button>
          </>
        )}
      </Show>
    </div>
  )
}

// components/NotificationList.tsx
import { For } from "solid-js"
import { appStore } from "../stores/appStore"

export function NotificationList() {
  return (
    <div class="notification-list">
      <For each={appStore.notifications}>
        {(notification) => (
          <div class="notification-item">
            <p>{notification.message}</p>
            <button onClick={() => appStore.removeNotification(notification.id)}>×</button>
          </div>
        )}
      </For>
    </div>
  )
}
```

---

## 3. 状态持久化

### 3.1 本地存储

```tsx
// utils/persistence.ts
import { createEffect } from "solid-js"

export function persist<T>(key: string, getState: () => T, setState: (value: T) => void) {
  // 从 localStorage 恢复
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      setState(JSON.parse(saved))
    } catch (e) {
      console.error(`Failed to parse persisted state for ${key}:`, e)
    }
  }

  // 保存到 localStorage
  createEffect(() => {
    const value = getState()
    localStorage.setItem(key, JSON.stringify(value))
  })
}

// 使用
import { createStore } from "solid-js/store"

const [settings, setSettings] = createStore({
  theme: "system",
  fontSize: 14,
})

persist("app-settings", () => settings, setSettings)
```

---

## 4. 本章总结

### 状态管理方案

| 方案    | 适用场景               | 优点             | 缺点                 |
| ------- | ---------------------- | ---------------- | -------------------- |
| Context | 主题、用户等全局数据   | 简单，React 原生 | 性能问题（频繁更新） |
| Store   | 复杂状态，多个组件共享 | 性能好，灵活     | 需要额外学习         |
| Signal  | 组件内部状态           | 最简单           | 无法共享             |

### 选择建议

- **简单全局数据**: Context
- **复杂可交互状态**: Store
- **组件内部**: Signal

---

**选择合适的状态管理方案，能让代码更清晰、性能更好！**
