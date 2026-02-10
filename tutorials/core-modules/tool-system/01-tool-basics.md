# 工具系统基础

> 📚 难度：初级-中级 | ⏱️ 预计时间：3-5 天 | 🎯 目标：能独立开发简单工具

工具系统是 OpenCode 的核心，本教程将深入讲解工具的设计原理和实现方法。

---

## 1. 什么是工具？

### 1.1 概念定义

**工具（Tool）** 是 Agent 可调用的功能单元，让 AI 能够：

- 与外部环境交互（文件系统、网络、命令行）
- 执行具体操作（搜索、读取、修改）
- 获取实时信息（当前时间、系统状态）

### 1.2 类比理解

把 Agent 想象成一位助手：

- **Agent** = 助手的大脑（决策）
- **Tool** = 助手的双手（执行）
- **User** = 你（下指令）

```
你说："帮我查找所有包含 TODO 的文件"
        │
        ▼
  Agent 理解意图
        │
        ▼
  调用 grep 工具
        │
        ▼
  返回搜索结果
        │
        ▼
  助手汇报给你
```

---

## 2. 工具的结构

### 2.1 完整示例

```typescript
import z from "zod"
import { Tool } from "./tool"

// 步骤 1: 定义工具
export const MyTool = Tool.define("my_tool", {
  // 步骤 2: 工具描述（AI 通过它理解工具用途）
  description: `
    这个工具用于执行 XXX 操作。
    使用场景：当需要 XXX 时调用。
    注意事项：YYY。
  `,

  // 步骤 3: 参数定义（Zod Schema）
  parameters: z.object({
    param1: z.string().describe("参数1的说明"),

    param2: z.number().optional().describe("可选的数字参数"),

    param3: z.enum(["option1", "option2"]).describe("枚举参数"),
  }),

  // 步骤 4: 执行逻辑
  async execute(params, ctx) {
    // 4.1 验证/准备工作

    // 4.2 执行操作

    // 4.3 返回结果
    return {
      title: "操作标题",
      output: "人类可读的输出",
      metadata: {
        // 结构化数据
      },
    }
  },
})
```

### 2.2 各部分详解

#### A. 工具名称

```typescript
Tool.define("my_tool", { ... })
```

- 唯一标识符，小写下划线命名
- 在代码中、AI 调用时、日志中都会使用

#### B. 描述（Description）

```typescript
description: `...`
```

- **最重要！** AI 通过描述理解何时使用该工具
- 应包含：用途、使用场景、参数说明、注意事项
- 可以用多行字符串提高可读性

**好的描述示例**:

```typescript
description: `
  在指定目录中搜索包含特定模式的文件。
  
  使用场景：
  - 查找代码中的特定函数或变量
  - 搜索配置文件中的设置
  - 查找 TODO 或 FIXME 注释
  
  参数说明：
  - pattern: 正则表达式模式
  - path: 搜索目录（可选，默认当前目录）
  - include: 文件过滤模式，如 "*.ts"
  
  返回：匹配的文件列表和行号
`
```

#### C. 参数定义

```typescript
parameters: z.object({
  name: z.string().describe("用户名"),
  age: z.number().optional().describe("年龄"),
  tags: z.array(z.string()).describe("标签列表"),
})
```

**常用 Zod 类型**:
| 类型 | 示例 | 说明 |
|------|------|------|
| string | `z.string()` | 字符串 |
| number | `z.number()` | 数字 |
| boolean | `z.boolean()` | 布尔值 |
| optional | `z.string().optional()` | 可选 |
| default | `z.string().default("x")` | 默认值 |
| enum | `z.enum(["a", "b"])` | 枚举 |
| array | `z.array(z.string())` | 数组 |
| object | `z.object({...})` | 对象 |

#### D. 执行函数

```typescript
async execute(params, ctx) {
  // params: 验证后的参数
  // ctx: 执行上下文
}
```

**返回值结构**:

```typescript
return {
  title: string        // 简短标题（用于展示）
  output: string       // 详细输出（人类可读）
  metadata?: object    // 元数据（机器可读，可选）
}
```

---

## 3. 上下文对象（ctx）

### 3.1 ctx 包含什么？

```typescript
interface ToolContext {
  // 会话相关
  sessionID: string // 当前会话 ID
  messageID: string // 当前消息 ID
  callID: string // 本次调用 ID
  agent: string // Agent 类型

  // 控制相关
  abort: AbortSignal // 取消信号

  // 方法
  ask: (options) => Promise // 请求权限/询问用户
  metadata: (data) => void // 记录元数据
}
```

### 3.2 常用方法

#### A. 请求权限（ctx.ask）

当工具需要敏感操作时，必须先请求用户确认：

```typescript
async execute(params, ctx) {
  // 请求执行权限
  await ctx.ask({
    permission: "file_write",     // 权限类型
    message: "即将写入文件",       // 提示消息
    files: ["/path/to/file"],     // 涉及文件
    patterns: ["*.ts"],           // 匹配模式
    always: ["safe/path/*"],      // 总是允许的路径
    metadata: {                   // 额外信息
      operation: "write",
      size: 1024
    }
  })

  // 用户同意后才会继续执行
  await Bun.write(params.path, content)
}
```

**权限类型**:

- `file_read` - 读取文件
- `file_write` - 写入文件
- `bash` - 执行命令
- `network` - 网络请求
- `grep` - 代码搜索（通常自动允许）

#### B. 记录元数据

```typescript
async execute(params, ctx) {
  ctx.metadata({
    tool: "my_tool",
    duration: 1234,        // 执行耗时
    inputSize: 1024,       // 输入大小
    outputSize: 2048       // 输出大小
  })
}
```

#### C. 响应取消信号

```typescript
async execute(params, ctx) {
  const proc = Bun.spawn(["long-running-command"], {
    signal: ctx.abort  // 用户取消时会触发
  })

  // 也可以手动检查
  if (ctx.abort.aborted) {
    throw new Error("Operation cancelled")
  }
}
```

---

## 4. 完整工具示例

### 4.1 简单工具：Echo

```typescript
import z from "zod"
import { Tool } from "./tool"

export const EchoTool = Tool.define("echo", {
  description: `
    回显用户输入的内容。
    用于测试工具调用是否正常工作。
  `,

  parameters: z.object({
    message: z.string().describe("要回显的消息"),
  }),

  async execute(params, ctx) {
    return {
      title: "Echo",
      output: params.message,
      metadata: {
        length: params.message.length,
      },
    }
  },
})
```

### 4.2 中等复杂度：File Stats

```typescript
import z from "zod"
import { Tool } from "./tool"
import path from "path"

export const FileStatsTool = Tool.define("file_stats", {
  description: `
    获取文件的统计信息（大小、修改时间等）。
    使用场景：需要了解文件基本信息时。
  `,

  parameters: z.object({
    path: z.string().describe("文件路径"),
  }),

  async execute(params, ctx) {
    // 1. 请求权限
    await ctx.ask({
      permission: "file_read",
      files: [params.path],
    })

    // 2. 获取文件信息
    const file = Bun.file(params.path)
    const stats = await file.stat()

    // 3. 格式化输出
    const sizeKB = (stats.size / 1024).toFixed(2)
    const modified = stats.mtime.toLocaleString()

    return {
      title: `File: ${path.basename(params.path)}`,
      output: [`大小: ${sizeKB} KB`, `修改时间: ${modified}`, `类型: ${stats.type}`].join("\n"),
      metadata: {
        size: stats.size,
        modified: stats.mtime,
        type: stats.type,
      },
    }
  },
})
```

### 4.3 复杂工具：批量重命名

```typescript
import z from "zod"
import { Tool } from "./tool"
import path from "path"

export const BatchRenameTool = Tool.define("batch_rename", {
  description: `
    批量重命名文件。
    
    使用场景：
    - 统一文件命名规范
    - 添加前缀或后缀
    - 替换文件名中的特定字符串
    
    注意：操作前会请求确认。
  `,

  parameters: z.object({
    directory: z.string().describe("目标目录"),

    pattern: z.string().describe("匹配模式（glob）如 '*.txt'"),

    operation: z.enum(["prefix", "suffix", "replace"]).describe("操作类型"),

    value: z.string().describe("新值"),

    search: z.string().optional().describe("替换操作时，要搜索的字符串"),
  }),

  async execute(params, ctx) {
    // 1. 查找匹配文件
    const files = await Array.fromAsync(new Bun.Glob(params.pattern).scan(params.directory))

    if (files.length === 0) {
      return {
        title: "Batch Rename",
        output: "未找到匹配的文件",
      }
    }

    // 2. 生成重命名计划
    const plan = files.map((file) => {
      const oldPath = path.join(params.directory, file)
      let newName = file

      switch (params.operation) {
        case "prefix":
          newName = params.value + file
          break
        case "suffix":
          const ext = path.extname(file)
          newName = file.slice(0, -ext.length) + params.value + ext
          break
        case "replace":
          newName = file.replace(params.search || "", params.value)
          break
      }

      return {
        old: oldPath,
        new: path.join(params.directory, newName),
      }
    })

    // 3. 请求确认
    await ctx.ask({
      permission: "file_write",
      message: `即将重命名 ${plan.length} 个文件`,
      files: plan.map((p) => p.old),
    })

    // 4. 执行重命名
    let success = 0
    for (const item of plan) {
      try {
        await Bun.rename(item.old, item.new)
        success++
      } catch (err) {
        console.error(`重命名失败: ${item.old}`, err)
      }
    }

    return {
      title: "Batch Rename",
      output: `成功重命名 ${success}/${plan.length} 个文件`,
      metadata: {
        total: plan.length,
        success,
        plan,
      },
    }
  },
})
```

---

## 5. 工具注册

### 5.1 自动注册

工具文件放在 `src/tool/` 目录下，会自动被注册：

```typescript
// src/tool/registry.ts
export async function loadTools() {
  const toolFiles = await Array.fromAsync(new Bun.Glob("*.ts").scan("./src/tool"))

  for (const file of toolFiles) {
    if (file === "tool.ts" || file === "registry.ts") continue

    const module = await import(`./${file}`)
    // 自动注册导出的工具
    Object.values(module).forEach((tool) => {
      if (tool && typeof tool === "object" && tool.name) {
        register(tool)
      }
    })
  }
}
```

### 5.2 手动注册（特殊情况）

```typescript
import { registry } from "./registry"
import { MyTool } from "./my-tool"

// 手动注册
registry.register(MyTool)

// 获取工具
const tool = registry.get("my_tool")

// 列出所有工具
const tools = registry.list()
```

---

## 6. 测试工具

### 6.1 基础测试模板

```typescript
import { describe, expect, test } from "bun:test"
import { EchoTool } from "../../src/tool/echo"

// 模拟上下文
const mockCtx = {
  sessionID: "test-session",
  messageID: "test-message",
  callID: "test-call",
  agent: "test",
  abort: AbortSignal.any([]),
  ask: async () => {},
  metadata: () => {},
}

describe("tool.echo", () => {
  test("basic echo", async () => {
    const tool = await EchoTool.init()
    const result = await tool.execute(
      {
        message: "Hello, World!",
      },
      mockCtx,
    )

    expect(result.output).toBe("Hello, World!")
    expect(result.metadata.length).toBe(13)
  })

  test("empty message", async () => {
    const tool = await EchoTool.init()
    const result = await tool.execute(
      {
        message: "",
      },
      mockCtx,
    )

    expect(result.output).toBe("")
    expect(result.metadata.length).toBe(0)
  })
})
```

### 6.2 权限测试

```typescript
import { describe, expect, test } from "bun:test"

describe("tool.file_stats", () => {
  test("should ask permission", async () => {
    let permissionAsked = false

    const ctx = {
      ...mockCtx,
      ask: async (options) => {
        permissionAsked = true
        expect(options.permission).toBe("file_read")
        expect(options.files).toContain("/test/file.txt")
      },
    }

    const tool = await FileStatsTool.init()
    await tool.execute({ path: "/test/file.txt" }, ctx)

    expect(permissionAsked).toBe(true)
  })
})
```

### 6.3 集成测试

```typescript
import { describe, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"

describe("tool.file_stats (integration)", () => {
  test("reads actual file", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "test.txt"), "Hello")
      },
    })

    const tool = await FileStatsTool.init()
    const result = await tool.execute(
      {
        path: path.join(tmp.path, "test.txt"),
      },
      mockCtx,
    )

    expect(result.metadata.size).toBe(5)
  })
})
```

---

## 7. 最佳实践

### 7.1 描述要清晰

```typescript
// ❌ 不好的描述
description: "读取文件"

// ✅ 好的描述
description: `
  读取指定文件的内容。
  使用场景：需要查看文件内容时使用。
  参数：path - 文件绝对路径或相对路径。
  返回：文件内容和元数据（大小、编码等）。
  注意：只支持读取文本文件，二进制文件会报错。
`
```

### 7.2 参数要有合理的约束

```typescript
// ❌ 过于宽松
parameters: z.object({
  timeout: z.number(),
})

// ✅ 合理的约束
parameters: z.object({
  timeout: z.number().min(1000, "最小 1 秒").max(60000, "最大 60 秒").default(5000).describe("超时时间（毫秒）"),
})
```

### 7.3 输出要人类可读

```typescript
// ❌ 直接返回 JSON
return {
  output: JSON.stringify(data),
}

// ✅ 格式化输出
return {
  output: [`找到 ${count} 个结果:`, "", ...results.map((r) => `- ${r.name}: ${r.description}`)].join("\n"),
}
```

### 7.4 错误处理要优雅

```typescript
async execute(params, ctx) {
  try {
    const result = await riskyOperation()
    return { output: "成功", ... }
  } catch (err) {
    // 提供有用的错误信息
    return {
      title: "操作失败",
      output: `错误: ${err.message}\n\n建议: 检查 XXX 后重试`,
      metadata: { error: err.message }
    }
  }
}
```

---

## 8. 调试技巧

### 8.1 添加日志

```typescript
async execute(params, ctx) {
  console.log("[MyTool] 开始执行", params)

  const result = await doSomething()
  console.log("[MyTool] 执行结果", result)

  return result
}
```

### 8.2 使用断点

```bash
# 运行测试时附加调试器
bun --inspect test test/tool/my-tool.test.ts

# 在 Chrome 中打开 chrome://inspect
```

### 8.3 测试驱动开发

```typescript
// 1. 先写测试
test("should do X", async () => {
  const result = await tool.execute({ ... })
  expect(result.output).toBe("expected")
})

// 2. 运行测试（会失败）
bun test test/tool/my-tool.test.ts

// 3. 实现功能
async execute(params, ctx) {
  return { output: "expected" }
}

// 4. 测试通过！
```

---

## 9. 本章总结

### 核心概念

- **Tool.define**: 定义工具的入口
- **Schema**: 参数验证和文档
- **ctx**: 执行上下文，包含权限、取消信号等
- **返回值**: title + output + metadata

### 开发流程

1. 确定工具用途和参数
2. 编写 Zod Schema
3. 实现 execute 函数
4. 编写测试
5. 调试和优化

### 检查清单

- [ ] 理解 Tool.define 的作用
- [ ] 能使用 Zod 定义参数
- [ ] 会使用 ctx.ask 请求权限
- [ ] 能编写基础测试
- [ ] 理解工具注册机制

---

**下一步**: [内置工具详解](02-built-in-tools.md) 或 [自定义工具开发](03-custom-tool.md)
