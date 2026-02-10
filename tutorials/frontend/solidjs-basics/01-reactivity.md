# SolidJS 响应式系统

> 📚 难度：初级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握 SolidJS 核心概念

本教程讲解 SolidJS 的响应式系统，帮助你理解这个现代化前端框架。

---

## 1. 为什么选 SolidJS？

### 1.1 与传统框架对比

```
React/Vue: 虚拟 DOM
代码 → 虚拟 DOM → 对比 → 更新真实 DOM
                    ↑
              需要 Diff 算法

SolidJS: 编译时优化
代码 → 直接更新真实 DOM
       ↑
   编译阶段确定更新点
```

### 1.2 性能优势

- **无虚拟 DOM**: 直接操作真实 DOM
- **细粒度更新**: 只更新变化的部分
- **编译优化**: 预计算依赖关系
- **体积小**: 运行时仅 7KB

---

## 2. Signal - 原子化响应式

### 2.1 基础用法

```typescript
import { createSignal } from "solid-js"

// 创建 Signal
const [count, setCount] = createSignal(0)

// 读取值
console.log(count()) // 0

// 更新值
setCount(1)
console.log(count()) // 1

// 函数式更新
setCount((prev) => prev + 1)
```

### 2.2 在组件中使用

```tsx
import { createSignal } from "solid-js"

function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  )
}
```

**关键**: 在 JSX 中访问 `count()` 会自动建立依赖关系。

### 2.3 依赖追踪原理

```typescript
// SolidJS 会自动追踪这些依赖
function MyComponent() {
  const [firstName, setFirstName] = createSignal('John')
  const [lastName, setLastName] = createSignal('Doe')

  // 计算全名（自动追踪依赖）
  const fullName = () => `${firstName()} ${lastName()}`

  return <div>{fullName()}</div>
  // 只有当 firstName 或 lastName 变化时，才会重新计算
}
```

---

## 3. Store - 复杂状态管理

### 3.1 基础用法

```typescript
import { createStore } from "solid-js/store"

// 创建 Store
const [state, setState] = createStore({
  user: {
    name: "John",
    age: 30,
  },
  todos: [],
})

// 读取值
console.log(state.user.name) // 'John'

// 更新值
setState("user", "name", "Jane")

// 批量更新
setState({
  user: { name: "Bob", age: 25 },
})

// 数组操作
setState("todos", [...state.todos, { id: 1, text: "New todo" }])
```

### 3.2 与 Signal 对比

| 特性 | Signal       | Store         |
| ---- | ------------ | ------------- |
| 用途 | 单一值       | 复杂对象      |
| 读取 | `count()`    | `state.count` |
| 更新 | `setCount()` | `setState()`  |
| 嵌套 | 不支持       | 支持深层更新  |
| 数组 | 需要重新创建 | 可以直接操作  |

### 3.3 选择建议

```tsx
// 使用 Signal 的场景
const [count, setCount] = createSignal(0)
const [isOpen, setIsOpen] = createSignal(false)
const [text, setText] = createSignal("")

// 使用 Store 的场景
const [state, setState] = createStore({
  user: { name: "", email: "" },
  settings: { theme: "dark", language: "zh" },
  data: { items: [], loading: false },
})
```

---

## 4. 副作用 (Effects)

### 4.1 createEffect

```tsx
import { createSignal, createEffect } from "solid-js"

function Example() {
  const [count, setCount] = createSignal(0)

  // 当 count 变化时执行
  createEffect(() => {
    console.log("Count changed:", count())
    document.title = `Count: ${count()}`
  })

  return <button onClick={() => setCount((c) => c + 1)}>+1</button>
}
```

### 4.2 onMount / onCleanup

```tsx
import { onMount, onCleanup } from "solid-js"

function Timer() {
  let interval: number

  onMount(() => {
    console.log("Component mounted")
    interval = setInterval(() => {
      console.log("Tick")
    }, 1000)
  })

  onCleanup(() => {
    console.log("Component cleanup")
    clearInterval(interval)
  })

  return <div>Timer</div>
}
```

---

## 5. 计算属性

### 5.1 createMemo

```tsx
import { createSignal, createMemo } from "solid-js"

function ShoppingCart() {
  const [items, setItems] = createSignal([
    { name: "Apple", price: 1.5, quantity: 2 },
    { name: "Banana", price: 0.5, quantity: 3 },
  ])

  // 缓存计算结果
  const total = createMemo(() => {
    console.log("Calculating total...")
    return items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  return (
    <div>
      <p>Total: ${total().toFixed(2)}</p>
      <p>Total: ${total().toFixed(2)}</p> {/* 不会重新计算 */}
    </div>
  )
}
```

---

## 6. 条件与列表渲染

### 6.1 Show 组件

```tsx
import { Show } from "solid-js"

function UserProfile(props: { user?: User }) {
  return (
    <Show when={props.user} fallback={<div>Please log in</div>}>
      {(user) => (
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
      )}
    </Show>
  )
}
```

### 6.2 For 组件

```tsx
import { For } from "solid-js"

function TodoList() {
  const [todos, setTodos] = createSignal([
    { id: 1, text: "Learn SolidJS" },
    { id: 2, text: "Build App" },
  ])

  return (
    <ul>
      <For each={todos()}>
        {(todo, index) => (
          <li>
            {index() + 1}. {todo.text}
          </li>
        )}
      </For>
    </ul>
  )
}
```

### 6.3 Switch/Match

```tsx
import { Switch, Match } from "solid-js"

function StatusIndicator(props: { status: string }) {
  return (
    <Switch>
      <Match when={props.status === "loading"}>
        <span>Loading...</span>
      </Match>
      <Match when={props.status === "success"}>
        <span>✓ Success</span>
      </Match>
      <Match when={props.status === "error"}>
        <span>✗ Error</span>
      </Match>
    </Switch>
  )
}
```

---

## 7. 最佳实践

### 7.1 避免过度使用 Effects

```tsx
// ❌ 错误：使用 Effect 计算值
const [count, setCount] = createSignal(0)
const [double, setDouble] = createSignal(0)

createEffect(() => {
  setDouble(count() * 2)
})

// ✅ 正确：使用 Memo
const double = createMemo(() => count() * 2)

// ✅ 或直接使用函数
const double = () => count() * 2
```

### 7.2 合理拆分组件

```tsx
// ❌ 错误：大组件
function BigComponent() {
  const [count, setCount] = createSignal(0)
  const [name, setName] = createSignal("")
  const [items, setItems] = createSignal([])
  // ... 100 行代码
}

// ✅ 正确：拆分成小组件
function Counter() {
  const [count, setCount] = createSignal(0)
  return <div>...</div>
}

function NameInput() {
  const [name, setName] = createSignal("")
  return <div>...</div>
}

function App() {
  return (
    <>
      <Counter />
      <NameInput />
    </>
  )
}
```

### 7.3 使用 Store 管理表单

```tsx
function Form() {
  const [form, setForm] = createStore({
    name: "",
    email: "",
    age: 0,
  })

  const handleSubmit = () => {
    console.log(form) // 获取所有值
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.name} onInput={(e) => setForm("name", e.target.value)} />
      <input value={form.email} onInput={(e) => setForm("email", e.target.value)} />
      <input type="number" value={form.age} onInput={(e) => setForm("age", parseInt(e.target.value))} />
    </form>
  )
}
```

---

## 8. 本章总结

### 核心概念

1. **Signal**: 原子化响应式，用于单一值
2. **Store**: 复杂状态管理，用于对象/数组
3. **Effect**: 副作用处理
4. **Memo**: 缓存计算结果
5. **Show/For**: 条件和列表渲染

### 选择指南

```
单一值？
├── 会频繁变化 → Signal
└── 派生计算 → Memo

复杂对象？
└── Store

需要在变化时执行操作？
└── Effect
```

### 检查清单

- [ ] 理解 Signal 的自动追踪
- [ ] 掌握 Store 的深层更新
- [ ] 会正确使用 Effect
- [ ] 理解 Memo 的缓存机制

---

**SolidJS 的响应式系统简单而强大，掌握后开发效率倍增！**
