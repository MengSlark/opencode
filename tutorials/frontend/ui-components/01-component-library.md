# 组件库概览

> 📚 难度：初级 | ⏱️ 预计时间：1-2 天 | 🎯 目标：了解 UI 组件库结构

本教程介绍 OpenCode 的 UI 组件库，帮助你快速了解可用的组件。

---

## 1. 组件库结构

### 1.1 目录组织

```
packages/ui/src/
├── components/
│   ├── Button/
│   ├── Input/
│   ├── Modal/
│   ├── Dropdown/
│   └── ...
├── hooks/
│   ├── useTheme.ts
│   ├── useClickOutside.ts
│   └── ...
├── utils/
│   ├── classNames.ts
│   └── ...
└── index.ts
```

### 1.2 技术栈

- **基础**: SolidJS + TypeScript
- **样式**: TailwindCSS
- **组件库**: Kobalte (Headless UI)
- **图标**: Lucide Solid

---

## 2. 基础组件

### 2.1 Button

```tsx
import { Button } from "@opencode-ai/ui"

// 基础用法
<Button>Click me</Button>

// 变体
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// 尺寸
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// 状态
<Button loading>Loading</Button>
<Button disabled>Disabled</Button>
```

### 2.2 Input

```tsx
import { Input } from "@opencode-ai/ui"

// 基础输入
<Input placeholder="Enter text..." />

// 带标签
<Input label="Username" placeholder="Enter username" />

// 带错误
<Input
  label="Email"
  error="Invalid email format"
  placeholder="Enter email"
/>

// 带图标
<Input
  leftIcon={<SearchIcon />}
  placeholder="Search..."
/>
```

### 2.3 Modal

```tsx
import { Modal } from "@opencode-ai/ui"
import { createSignal } from "solid-js"

function Example() {
  const [isOpen, setIsOpen] = createSignal(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal isOpen={isOpen()} onClose={() => setIsOpen(false)} title="Modal Title">
        <p>Modal content here...</p>
      </Modal>
    </>
  )
}
```

---

## 3. 复合组件

### 3.1 Dropdown

```tsx
import { Dropdown } from "@opencode-ai/ui"

;<Dropdown>
  <Dropdown.Trigger>
    <Button>Open Menu</Button>
  </Dropdown.Trigger>

  <Dropdown.Content>
    <Dropdown.Item onClick={() => console.log("Item 1")}>Item 1</Dropdown.Item>
    <Dropdown.Item onClick={() => console.log("Item 2")}>Item 2</Dropdown.Item>
    <Dropdown.Separator />
    <Dropdown.Item danger onClick={() => console.log("Delete")}>
      Delete
    </Dropdown.Item>
  </Dropdown.Content>
</Dropdown>
```

### 3.2 Tabs

```tsx
import { Tabs } from "@opencode-ai/ui"

;<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
    <Tabs.Trigger value="tab3">Tab 3</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="tab1">Content for Tab 1</Tabs.Content>
  <Tabs.Content value="tab2">Content for Tab 2</Tabs.Content>
  <Tabs.Content value="tab3">Content for Tab 3</Tabs.Content>
</Tabs>
```

---

## 4. 主题系统

### 4.1 使用主题

```tsx
import { useTheme } from "@opencode-ai/ui"

function ThemedComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <p>Current theme: {theme()}</p>
      <Button onClick={() => setTheme("dark")}>Dark</Button>
      <Button onClick={() => setTheme("light")}>Light</Button>
    </div>
  )
}
```

### 4.2 自定义主题

```typescript
// theme.config.ts
export const theme = {
  colors: {
    primary: {
      50: "#eff6ff",
      500: "#3b82f6",
      900: "#1e3a8a",
    },
  },
  fonts: {
    sans: ["Inter", "sans-serif"],
    mono: ["Fira Code", "monospace"],
  },
}
```

---

## 5. 本章总结

### 核心组件

- **Button**: 按钮组件，多种变体
- **Input**: 输入框组件
- **Modal**: 弹窗组件
- **Dropdown**: 下拉菜单
- **Tabs**: 标签页

### 使用建议

1. 优先使用组件库组件
2. 遵循设计规范
3. 保持一致的风格

---

**掌握组件库，快速构建美观的 UI！**
