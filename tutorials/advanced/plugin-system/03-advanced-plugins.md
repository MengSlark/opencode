# 高级插件技巧

> 📚 难度：高级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握高级插件开发

本教程讲解高级插件开发技巧，包括动态加载、插件通信和性能优化。

---

## 1. 动态加载

### 1.1 懒加载插件

```typescript
// plugin-manager/dynamic-loader.ts
export class DynamicPluginLoader {
  private loadedPlugins = new Map<string, Plugin>()

  async load(pluginPath: string): Promise<Plugin> {
    // 检查缓存
    if (this.loadedPlugins.has(pluginPath)) {
      return this.loadedPlugins.get(pluginPath)!
    }

    // 动态导入
    const module = await import(pluginPath)
    const PluginClass = module.default

    const plugin = new PluginClass()
    this.loadedPlugins.set(pluginPath, plugin)

    return plugin
  }

  async unload(pluginPath: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginPath)
    if (plugin) {
      await plugin.deactivate?.()
      this.loadedPlugins.delete(pluginPath)
    }
  }
}
```

### 1.2 热更新

```typescript
// plugin-manager/hot-reload.ts
import { watch } from "fs"

export function enableHotReload(pluginPath: string, loader: DynamicPluginLoader) {
  const watcher = watch(pluginPath, async (eventType) => {
    if (eventType === "change") {
      console.log(`Plugin ${pluginPath} changed, reloading...`)

      // 卸载旧版本
      await loader.unload(pluginPath)

      // 清除缓存
      delete require.cache[require.resolve(pluginPath)]

      // 加载新版本
      await loader.load(pluginPath)
    }
  })

  return () => watcher.close()
}
```

---

## 2. 插件通信

### 2.1 事件总线

```typescript
// plugin-system/event-bus.ts
export class PluginEventBus {
  private listeners = new Map<string, Set<Function>>()

  on(event: string, handler: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    return () => this.off(event, handler)
  }

  off(event: string, handler: Function): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args)
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err)
      }
    })
  }
}

// 全局事件总线
export const globalEventBus = new PluginEventBus()
```

### 2.2 插件间 API

```typescript
// plugin-a/index.ts
export default class PluginA implements Plugin {
  private api = {
    getData: () => this.internalData,
    processData: (data: any) => this.process(data),
  }

  async activate(context: PluginContext): Promise<void> {
    // 暴露 API
    context.api.register("plugin-a", this.api)
  }
}

// plugin-b/index.ts
export default class PluginB implements Plugin {
  async activate(context: PluginContext): Promise<void> {
    // 使用其他插件的 API
    const pluginAApi = context.api.get("plugin-a")
    if (pluginAApi) {
      const data = pluginAApi.getData()
      // ...
    }
  }
}
```

---

## 3. 性能优化

### 3.1 延迟初始化

```typescript
export default class LazyPlugin implements Plugin {
  private heavyResource: HeavyResource | null = null

  async activate(context: PluginContext): Promise<void> {
    // 延迟加载
    context.commands.register({
      id: "lazy.init",
      handler: () => this.initHeavyResource(),
    })
  }

  private async initHeavyResource(): Promise<void> {
    if (!this.heavyResource) {
      this.heavyResource = await createHeavyResource()
    }
  }
}
```

### 3.2 资源池

```typescript
export class ConnectionPool {
  private pool: Connection[] = []
  private maxSize = 10

  async acquire(): Promise<Connection> {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createConnection()
  }

  release(conn: Connection): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(conn)
    } else {
      conn.close()
    }
  }

  private async createConnection(): Promise<Connection> {
    // 创建新连接
  }
}
```

---

## 4. 本章总结

### 高级技巧

- **动态加载**: 按需加载，热更新
- **插件通信**: 事件总线，API 共享
- **性能优化**: 延迟初始化，资源池

### 最佳实践

1. 避免在 activate 中做重操作
2. 使用事件解耦插件
3. 提供清晰的 API 文档
4. 处理好资源清理

---

**掌握高级技巧，开发企业级插件！**
