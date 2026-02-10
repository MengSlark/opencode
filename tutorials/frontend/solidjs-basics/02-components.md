# SolidJS 组件开发

> 📚 难度：初级-中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握组件开发技巧

本教程讲解 SolidJS 组件开发的核心概念和最佳实践。

---

## 1. 组件基础

### 1.1 函数组件

```tsx
// 最简单的组件
function Hello() {
  return <div>Hello, SolidJS!</div>
}

// 使用组件
function App() {
  return (
    <div>
      <Hello />
    </div>
  )
}
```

### 1.2 Props 传递

```tsx
// 定义 Props 类型
interface GreetingProps {
  name: string
  greeting?: string
}

// 使用 Props
function Greeting(props: GreetingProps) {
  return (
    <div>
      {props.greeting || 'Hello'}, {props.name}!
    </div>
  )
}

// 使用组件
<Greeting name="World" />
<Greeting name="Solid" greeting="Hi" />
```

### 1.3 解构 Props（注意响应式）

```tsx
// ❌ 错误：解构会失去响应式
function Counter(props: { count: number }) {
  const { count } = props // count 是静态值
  return <div>{count}</div> // 不会更新
}

// ✅ 正确：使用 mergeProps
import { mergeProps } from "solid-js"

function Counter(props: { count: number }) {
  const merged = mergeProps({ count: 0 }, props)
  return <div>{merged.count}</div>
}

// ✅ 正确：在 JSX 中访问
function Counter(props: { count: number }) {
  return <div>{props.count}</div>
}
```

---

## 2. 组件生命周期

### 2.1 生命周期钩子

```tsx
import { createSignal, onMount, onCleanup, onError } from "solid-js"

function LifecycleDemo() {
  const [data, setData] = createSignal(null)

  // 组件挂载时
  onMount(() => {
    console.log("Component mounted")
    fetchData()
  })

  // 组件卸载时
  onCleanup(() => {
    console.log("Component cleanup")
    // 清理资源
  })

  // 错误处理
  onError((err) => {
    console.error("Error:", err)
  })

  async function fetchData() {
    const result = await fetch("/api/data")
    setData(await result.json())
  }

  return <div>{data()?.name}</div>
}
```

### 2.2 资源加载 (createResource)

```tsx
import { createResource, Suspense } from "solid-js"

function UserProfile(props: { userId: string }) {
  // 自动处理加载状态
  const [user] = createResource(
    () => props.userId,
    async (id) => {
      const res = await fetch(`/api/users/${id}`)
      return res.json()
    },
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <h1>{user()?.name}</h1>
        <p>{user()?.email}</p>
      </div>
    </Suspense>
  )
}
```

---

## 3. 事件处理

### 3.1 基础事件

```tsx
function EventDemo() {
  const handleClick = () => {
    console.log("Clicked!")
  }

  const handleInput = (e: InputEvent) => {
    console.log("Input:", e.target.value)
  }

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      <input onInput={handleInput} />
    </div>
  )
}
```

### 3.2 事件委托

```tsx
function List() {
  const items = ["A", "B", "C"]

  const handleClick = (item: string) => {
    console.log("Clicked:", item)
  }

  return (
    <ul>
      <For each={items}>{(item) => <li onClick={() => handleClick(item)}>{item}</li>}</For>
    </ul>
  )
}
```

### 3.3 表单处理

```tsx
function Form() {
  const [form, setForm] = createStore({
    name: "",
    email: "",
    agree: false,
  })

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    console.log("Form submitted:", form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={form.name} onInput={(e) => setForm("name", e.target.value)} placeholder="Name" />

      <input
        name="email"
        type="email"
        value={form.email}
        onInput={(e) => setForm("email", e.target.value)}
        placeholder="Email"
      />

      <label>
        <input type="checkbox" checked={form.agree} onChange={(e) => setForm("agree", e.target.checked)} />I agree
      </label>

      <button type="submit">Submit</button>
    </form>
  )
}
```

---

## 4. 组件组合

### 4.1 插槽 (Slots)

```tsx
// 定义 Card 组件
interface CardProps {
  title: string
  children: JSX.Element
  footer?: JSX.Element
}

function Card(props: CardProps) {
  return (
    <div class="card">
      <h2 class="card-title">{props.title}</h2>
      <div class="card-content">{props.children}</div>
      <Show when={props.footer}>
        <div class="card-footer">{props.footer}</div>
      </Show>
    </div>
  )
}

// 使用 Card
function App() {
  return (
    <Card title="Welcome" footer={<button>Learn more</button>}>
      <p>This is the card content.</p>
      <p>You can put any JSX here.</p>
    </Card>
  )
}
```

### 4.2 渲染 Props

```tsx
// 可复用的列表组件
interface DataListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => JSX.Element
}

function DataList<T>(props: DataListProps<T>) {
  return (
    <ul>
      <For each={props.data}>{(item, index) => <li>{props.renderItem(item, index())}</li>}</For>
    </ul>
  )
}

// 使用
interface User {
  id: number
  name: string
}

function UserList() {
  const users: User[] = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ]

  return <DataList data={users} renderItem={(user) => <span>{user.name}</span>} />
}
```

---

## 5. 组件通信

### 5.1 父子通信

```tsx
// 父组件
function Parent() {
  const [count, setCount] = createSignal(0)

  return (
    <div>
      <p>Count: {count()}</p>
      <Child count={count()} onIncrement={() => setCount((c) => c + 1)} />
    </div>
  )
}

// 子组件
interface ChildProps {
  count: number
  onIncrement: () => void
}

function Child(props: ChildProps) {
  return <button onClick={props.onIncrement}>Increment: {props.count}</button>
}
```

### 5.2 Context API

```tsx
import { createContext, useContext, ParentComponent } from "solid-js"

// 创建 Context
const ThemeContext = createContext<{
  theme: () => string
  setTheme: (theme: string) => void
}>()

// Provider 组件
export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = createSignal("light")

  return <ThemeContext.Provider value={{ theme, setTheme }}>{props.children}</ThemeContext.Provider>
}

// 使用 Context
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

// 在组件中使用
function ThemedButton() {
  const { theme, setTheme } = useTheme()

  return (
    <button class={theme()} onClick={() => setTheme(theme() === "light" ? "dark" : "light")}>
      Toggle Theme
    </button>
  )
}
```

---

## 6. 性能优化

### 6.1 使用 splitProps

```tsx
import { splitProps } from "solid-js"

function Button(props: {
  variant: "primary" | "secondary"
  size: "sm" | "md" | "lg"
  children: JSX.Element
  onClick: () => void
}) {
  // 拆分 props，避免不必要的更新
  const [local, others] = splitProps(props, ["variant", "size"])

  return (
    <button class={`btn btn-${local.variant} btn-${local.size}`} {...others}>
      {props.children}
    </button>
  )
}
```

### 6.2 懒加载组件

```tsx
import { lazy } from "solid-js"
import { Suspense } from "solid-js"

// 懒加载
const HeavyComponent = lazy(() => import("./HeavyComponent"))

function App() {
  const [show, setShow] = createSignal(false)

  return (
    <div>
      <button onClick={() => setShow(true)}>Load Component</button>

      <Suspense fallback={<div>Loading...</div>}>
        <Show when={show()}>
          <HeavyComponent />
        </Show>
      </Suspense>
    </div>
  )
}
```

### 6.3 使用 Show 替代条件渲染

```tsx
// ✅ 使用 Show（正确销毁和重建）
;<Show when={condition()}>
  <ExpensiveComponent />
</Show>

// ❌ 避免这种写法
{
  condition() && <ExpensiveComponent />
}
```

---

## 7. 本章总结

### 核心要点

1. **Props**: 使用 mergeProps 保持响应式
2. **生命周期**: onMount, onCleanup, createResource
3. **事件**: 使用箭头函数或内联处理器
4. **组合**: Slots 和 Render Props
5. **通信**: Props 和 Context
6. **优化**: splitProps, lazy, Show

### 组件设计原则

- 单一职责
- Props 清晰明确
- 合理使用 Context
- 注意性能优化

### 检查清单

- [ ] 掌握 Props 传递
- [ ] 理解生命周期
- [ ] 会处理事件
- [ ] 掌握组件通信
- [ ] 了解性能优化

---

**良好的组件设计是构建可维护应用的基础！**
