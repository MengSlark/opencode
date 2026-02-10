# 插件生态系统

> 🎯 难度：高级 | ⏱️ 预计时间：2-3 周 | 📦 目标：开发完整插件生态

本项目教你开发一个包含多个插件的生态系统。

---

## 1. 架构设计

```
plugin-ecosystem/
├── core-plugin/           # 核心插件
├── tool-plugins/          # 工具插件集合
├── ui-plugins/            # UI 插件集合
└── shared/                # 共享库
```

---

## 2. 核心插件

```typescript
// core-plugin/src/index.ts
export default class CorePlugin implements Plugin {
  async activate(ctx: PluginContext) {
    // 提供基础 API
    ctx.api.register("ecosystem", {
      getVersion: () => "1.0.0",
      registerTool: (tool) => ctx.tools.register(tool),
    })
  }
}
```

---

## 3. 扩展插件

```typescript
// tool-plugin/src/index.ts
export default class ToolPlugin implements Plugin {
  async activate(ctx: PluginContext) {
    // 使用核心 API
    const ecosystem = ctx.api.get("ecosystem")

    ecosystem.registerTool({
      name: "my_tool",
      // ...
    })
  }
}
```

---

## 4. 完成

你已构建了一个可扩展的插件生态系统！
