# 插件架构

> 📚 难度：高级 | ⏱️ 预计时间：3-5 天 | 🎯 目标：理解插件系统设计

本教程讲解 OpenCode 的插件系统架构，帮助你理解如何扩展系统功能。

---

## 1. 插件系统概述

### 1.1 为什么需要插件？

- **扩展性**: 不修改核心代码添加功能
- **模块化**: 功能独立，按需加载
- **生态**: 社区贡献和共享
- **定制化**: 满足特定需求

### 1.2 架构图

```
┌─────────────────────────────────────────┐
│           OpenCode Core                 │
│  ┌───────────────────────────────────┐  │
│  │         Plugin Manager             │  │
│  │  - 加载/卸载                       │  │
│  │  - 生命周期管理                     │  │
│  │  - 依赖管理                        │  │
│  └───────────────────────────────────┘  │
└───────────────────┬─────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Plugin A  │ │ Plugin B  │ │ Plugin C  │
│ - Tools   │ │ - UI      │ │ - Provider│
│ - Hooks   │ │ - Themes  │ │ - Commands│
└───────────┘ └───────────┘ └───────────┘
```

---

## 2. 插件结构

### 2.1 插件清单

```typescript
// plugin.json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A sample plugin",
  "author": "Your Name",
  "main": "./index.ts",
  "entry": "./index.ts",
  "opencode": {
    "version": ">=1.0.0"
  },
  "permissions": [
    "file:read",
    "file:write",
    "network"
  ],
  "contributions": {
    "tools": [
      {
        "name": "my_tool",
        "entry": "./tools/my-tool.ts"
      }
    ],
    "commands": [
      {
        "command": "my-plugin.hello",
        "title": "Say Hello",
        "keybinding": "cmd+shift+h"
      }
    ],
    "providers": [
      {
        "name": "my-provider",
        "entry": "./providers/my-provider.ts"
      }
    ]
  }
}
```

### 2.2 插件入口

```typescript
// index.ts
import { Plugin, PluginContext } from "@opencode-ai/plugin"

export default class MyPlugin implements Plugin {
  name = "my-plugin"
  version = "1.0.0"

  private ctx: PluginContext

  async activate(context: PluginContext): Promise<void> {
    this.ctx = context

    console.log("Plugin activated!")

    // 注册工具
    context.tools.register({
      name: "my_tool",
      handler: async (params) => {
        return { result: "Hello from plugin!" }
      },
    })

    // 注册命令
    context.commands.register({
      id: "my-plugin.hello",
      handler: () => {
        context.ui.showMessage("Hello from plugin!")
      },
    })

    // 订阅事件
    context.events.on("session.created", (session) => {
      console.log("New session:", session.id)
    })
  }

  async deactivate(): Promise<void> {
    console.log("Plugin deactivated!")
    // 清理资源
  }
}
```

---

## 3. Plugin API

### 3.1 上下文对象

```typescript
interface PluginContext {
  // 工具注册
  tools: {
    register(tool: ToolDefinition): void
    unregister(name: string): void
  }

  // 命令注册
  commands: {
    register(command: CommandDefinition): void
    execute(commandId: string, ...args: any[]): void
  }

  // UI 操作
  ui: {
    showMessage(message: string, type?: "info" | "warning" | "error"): void
    showInputBox(options: InputBoxOptions): Promise<string | undefined>
    showQuickPick(items: string[]): Promise<string | undefined>
  }

  // 事件系统
  events: {
    on(event: string, handler: Function): void
    off(event: string, handler: Function): void
    emit(event: string, ...args: any[]): void
  }

  // 存储
  storage: {
    get<T>(key: string): Promise<T | undefined>
    set<T>(key: string, value: T): Promise<void>
  }

  // 配置
  config: {
    get<T>(key: string): T | undefined
    set<T>(key: string, value: T): void
  }
}
```

### 3.2 工具定义

```typescript
interface ToolDefinition {
  name: string
  description?: string
  parameters?: z.ZodSchema
  handler: (params: any, context: ToolContext) => Promise<ToolResult>
}

interface ToolContext {
  sessionId: string
  abortSignal: AbortSignal
  // ...
}

interface ToolResult {
  output: string
  metadata?: object
}
```

---

## 4. 插件生命周期

### 4.1 生命周期图

```
┌─────────────┐
│   Install   │  安装
└──────┬──────┘
       ▼
┌─────────────┐
│    Load     │  加载代码
└──────┬──────┘
       ▼
┌─────────────┐
│  Activate   │  激活（调用 activate）
└──────┬──────┘
       │
       │  运行中
       │
       ▼
┌─────────────┐
│ Deactivate  │  停用（调用 deactivate）
└──────┬──────┘
       ▼
┌─────────────┐
│   Unload    │  卸载
└──────┬──────┘
       ▼
┌─────────────┐
│  Uninstall  │  卸载
└─────────────┘
```

### 4.2 实现生命周期

```typescript
class LifecyclePlugin implements Plugin {
  async activate(context: PluginContext): Promise<void> {
    // 注册命令
    context.commands.register({
      id: "lifecycle.info",
      handler: () => {
        context.ui.showMessage("Plugin is active!")
      },
    })

    // 订阅事件
    this.disposables = [
      context.events.on("session.started", this.onSessionStarted),
      context.events.on("session.ended", this.onSessionEnded),
    ]
  }

  async deactivate(): Promise<void> {
    // 取消事件订阅
    this.disposables.forEach((d) => d.dispose())

    // 清理资源
    await this.cleanup()
  }

  private disposables: Disposable[] = []

  private onSessionStarted = (session: Session) => {
    console.log("Session started:", session.id)
  }

  private onSessionEnded = (session: Session) => {
    console.log("Session ended:", session.id)
  }

  private async cleanup(): Promise<void> {
    // 清理临时文件等
  }
}
```

---

## 5. 插件管理

### 5.1 安装插件

```bash
# 从本地安装
opencode plugin install ./my-plugin

# 从 npm 安装
opencode plugin install opencode-plugin-example

# 从 Git 安装
opencode plugin install https://github.com/user/plugin
```

### 5.2 管理插件

```bash
# 列出已安装插件
opencode plugin list

# 启用插件
opencode plugin enable my-plugin

# 禁用插件
opencode plugin disable my-plugin

# 卸载插件
opencode plugin uninstall my-plugin
```

### 5.3 插件管理器实现

```typescript
class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private loaded: Map<string, PluginInstance> = new Map()

  async install(pluginPath: string): Promise<void> {
    // 1. 验证插件
    const manifest = await this.loadManifest(pluginPath)

    // 2. 复制到插件目录
    const targetPath = path.join(PLUGIN_DIR, manifest.name)
    await fs.cp(pluginPath, targetPath, { recursive: true })

    // 3. 安装依赖
    await this.installDependencies(targetPath)

    console.log(`Plugin ${manifest.name} installed`)
  }

  async load(name: string): Promise<void> {
    if (this.loaded.has(name)) return

    const pluginPath = path.join(PLUGIN_DIR, name)
    const PluginClass = await import(path.join(pluginPath, "index.ts"))

    const instance = new PluginClass.default()
    const context = this.createContext(name)

    await instance.activate(context)

    this.loaded.set(name, {
      plugin: instance,
      context,
    })
  }

  async unload(name: string): Promise<void> {
    const instance = this.loaded.get(name)
    if (!instance) return

    await instance.plugin.deactivate()
    this.loaded.delete(name)
  }

  async unloadAll(): Promise<void> {
    for (const name of this.loaded.keys()) {
      await this.unload(name)
    }
  }
}
```

---

## 6. 本章总结

### 核心概念

1. **Plugin**: 扩展单元
2. **Manifest**: 插件描述
3. **Context**: 插件 API
4. **Lifecycle**: 加载/激活/停用/卸载
5. **Contributions**: 工具、命令、提供商

### 开发流程

1. 创建 manifest.json
2. 实现 Plugin 接口
3. 使用 Context API
4. 测试和发布

### 检查清单

- [ ] 理解插件架构
- [ ] 掌握生命周期
- [ ] 会使用 Context API
- [ ] 理解安全管理

---

**插件系统是扩展 OpenCode 能力的最佳方式！**
