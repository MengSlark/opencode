# 主题与样式

> 📚 难度：初级 | ⏱️ 预计时间：1-2 天 | 🎯 目标：掌握主题定制

本教程讲解 OpenCode 的主题系统，帮助你定制 UI 外观。

---

## 1. TailwindCSS 基础

### 1.1 配置

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 品牌色
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          900: "#1e3a8a",
        },
        // 语义化颜色
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
        },
        content: {
          DEFAULT: "#0f172a",
          secondary: "#475569",
          tertiary: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
}

export default config
```

### 1.2 常用工具类

```tsx
// 布局
<div class="flex items-center justify-between">
<div class="grid grid-cols-3 gap-4">
<div class="container mx-auto px-4">

// 间距
<div class="p-4 m-2">
<div class="space-y-4">
<div class="gap-2">

// 样式
<button class="rounded-lg shadow-md hover:shadow-lg">
<div class="border border-gray-200 rounded-md">
<span class="text-sm font-medium text-gray-600">
```

---

## 2. 暗色模式

### 2.1 切换主题

```tsx
// hooks/useTheme.ts
import { createSignal, createEffect } from "solid-js"

type Theme = "light" | "dark" | "system"

export function useTheme() {
  const [theme, setTheme] = createSignal<Theme>((localStorage.getItem("theme") as Theme) || "system")

  createEffect(() => {
    const root = document.documentElement
    const current = theme()

    if (current === "dark" || (current === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    localStorage.setItem("theme", current)
  })

  return { theme, setTheme }
}

// 使用
function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme() === "dark" ? "light" : "dark")} class="p-2 rounded-lg bg-surface-secondary">
      {theme() === "dark" ? "🌙" : "☀️"}
    </button>
  )
}
```

### 2.2 暗色模式样式

```css
/* styles/theme.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-color: #e2e8f0;
}

.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-color: #334155;
}

/* 使用 CSS 变量 */
.element {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

---

## 3. 组件样式

### 3.1 按钮组件

```tsx
// components/Button.tsx
import { splitProps, JSX } from "solid-js"

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
}

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ["variant", "size", "loading", "children", "class"])

  const variantClasses = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-surface-secondary text-content hover:bg-surface-tertiary",
    ghost: "text-content-secondary hover:text-content hover:bg-surface-secondary",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      class={`
        inline-flex items-center justify-center
        rounded-lg font-medium
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[local.variant || "primary"]}
        ${sizeClasses[local.size || "md"]}
        ${local.class || ""}
      `}
      disabled={local.loading || others.disabled}
      {...others}
    >
      {local.loading && <span class="mr-2 animate-spin">⏳</span>}
      {local.children}
    </button>
  )
}
```

### 3.2 卡片组件

```tsx
// components/Card.tsx
import { JSX } from "solid-js"

interface CardProps {
  children: JSX.Element
  class?: string
  hover?: boolean
}

export function Card(props: CardProps) {
  return (
    <div
      class={`
        bg-surface rounded-xl border border-border-color
        p-4 shadow-sm
        ${props.hover ? "hover:shadow-md transition-shadow" : ""}
        ${props.class || ""}
      `}
    >
      {props.children}
    </div>
  )
}
```

---

## 4. 自定义主题

### 4.1 主题配置

```typescript
// themes/index.ts
export interface ThemeConfig {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
  }
}

export const themes: Record<string, ThemeConfig> = {
  default: {
    name: "默认",
    colors: {
      primary: "#3b82f6",
      secondary: "#64748b",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      textSecondary: "#475569",
      border: "#e2e8f0",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    },
  },
  dark: {
    name: "暗色",
    colors: {
      primary: "#60a5fa",
      secondary: "#94a3b8",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f8fafc",
      textSecondary: "#94a3b8",
      border: "#334155",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
    },
  },
}
```

### 4.2 应用主题

```tsx
// components/ThemeProvider.tsx
import { createContext, useContext, ParentComponent } from "solid-js"
import { createStore } from "solid-js/store"
import { themes, ThemeConfig } from "../themes"

const ThemeContext = createContext<{
  theme: ThemeConfig
  setTheme: (name: string) => void
}>()

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = createStore(themes.default)

  const changeTheme = (name: string) => {
    if (themes[name]) {
      setTheme(themes[name])
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>{props.children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used in ThemeProvider")
  return context
}
```

---

## 5. 本章总结

### 核心技术

- **TailwindCSS**: 原子化 CSS 框架
- **CSS 变量**: 动态主题切换
- **darkMode**: 暗色模式支持
- **组件封装**: 可复用的样式组件

### 最佳实践

1. 使用语义化颜色名
2. 支持系统主题偏好
3. 保持一致的间距和圆角
4. 添加过渡动画

---

**好的主题设计能显著提升用户体验！**
