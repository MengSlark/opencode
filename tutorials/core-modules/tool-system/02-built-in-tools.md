# 内置工具详解

> 📚 难度：中级 | ⏱️ 预计时间：3-5 天 | 🎯 目标：理解所有内置工具的实现

本教程详细讲解 OpenCode 的所有内置工具，帮助你理解它们的设计和用法。

---

## 1. 工具概览

### 1.1 内置工具列表

| 工具名   | 功能     | 复杂度 | 使用频率 |
| -------- | -------- | ------ | -------- |
| grep     | 代码搜索 | ⭐⭐   | 高       |
| read     | 文件读取 | ⭐     | 高       |
| edit     | 文件编辑 | ⭐⭐⭐ | 高       |
| bash     | 命令执行 | ⭐⭐   | 中       |
| question | 用户询问 | ⭐     | 中       |
| skill    | 技能调用 | ⭐⭐   | 中       |
| glob     | 文件搜索 | ⭐     | 中       |
| write    | 文件写入 | ⭐     | 低       |

---

## 2. 文件操作工具

### 2.1 read - 文件读取

**功能**: 读取文件内容

**源码分析**:

```typescript
export const ReadTool = Tool.define("read", {
  description: "读取文件内容",

  parameters: z.object({
    path: z.string().describe("文件路径"),
    offset: z.number().optional(), // 起始行
    limit: z.number().optional(), // 读取行数
  }),

  async execute(params, ctx) {
    // 1. 权限检查
    await ctx.ask({
      permission: "file_read",
      files: [params.path],
    })

    // 2. 读取文件
    const file = Bun.file(params.path)
    let content = await file.text()

    // 3. 处理偏移和限制
    if (params.offset !== undefined || params.limit !== undefined) {
      const lines = content.split("\n")
      const start = params.offset || 0
      const end = params.limit ? start + params.limit : lines.length
      content = lines.slice(start, end).join("\n")
    }

    return {
      title: path.basename(params.path),
      output: content,
      metadata: {
        size: content.length,
        lines: content.split("\n").length,
      },
    }
  },
})
```

**使用场景**:

- 查看配置文件
- 阅读代码
- 检查日志

### 2.2 edit - 文件编辑

**功能**: 修改文件内容（使用搜索替换）

**核心逻辑**:

```typescript
async execute(params, ctx) {
  // 1. 读取原文件
  const content = await Bun.file(params.path).text()

  // 2. 查找并替换
  const oldContent = content
  const newContent = content.replace(params.search, params.replace)

  // 3. 检查是否替换成功
  if (oldContent === newContent) {
    throw new Error("未找到匹配内容")
  }

  // 4. 请求权限并写入
  await ctx.ask({
    permission: "file_write",
    files: [params.path]
  })

  await Bun.write(params.path, newContent)

  return {
    title: "文件编辑",
    output: `已修改 ${params.path}`
  }
}
```

**注意事项**:

- 使用唯一标识进行替换
- 提供前后文帮助 AI 理解
- 支持多行替换

### 2.3 write - 文件写入

**功能**: 创建或覆盖文件

**特点**:

- 支持新建文件
- 支持覆盖现有文件
- 自动创建目录

---

## 3. 搜索工具

### 3.1 grep - 代码搜索

**功能**: 使用 ripgrep 搜索代码

**高级用法**:

```typescript
// 支持正则表达式
{ pattern: "function\s+\w+", include: "*.ts" }

// 搜索特定目录
{ pattern: "TODO", path: "./src" }

// 排除文件
{ pattern: "export", include: "*.ts", exclude: "*.test.ts" }
```

**实现细节**:

- 使用 ripgrep 进行高性能搜索
- 支持正则表达式
- 结果按修改时间排序
- 自动截断大量结果

### 3.2 glob - 文件搜索

**功能**: 使用 glob 模式查找文件

**示例**:

```typescript
// 查找所有测试文件
{ pattern: "**/*.test.ts" }

// 查找特定目录下的文件
{ pattern: "src/**/*.ts" }

// 排除 node_modules
{ pattern: "**/*.js", exclude: ["node_modules/**"] }
```

---

## 4. 系统工具

### 4.1 bash - 命令执行

**功能**: 执行 shell 命令

**安全机制**:

```typescript
async execute(params, ctx) {
  // 1. 检查危险命令
  const dangerous = ["rm -rf", ">", "|", ";"]
  if (dangerous.some(d => params.command.includes(d))) {
    await ctx.ask({
      permission: "bash",
      message: "执行危险命令，请确认",
      command: params.command
    })
  }

  // 2. 执行命令
  const proc = Bun.spawn(["bash", "-c", params.command], {
    cwd: params.cwd,
    timeout: params.timeout || 30000
  })

  // 3. 返回结果
  const output = await new Response(proc.stdout).text()
  const error = await new Response(proc.stderr).text()

  return {
    title: params.command,
    output: output || error,
    metadata: {
      exitCode: proc.exitCode,
      duration: Date.now() - startTime
    }
  }
}
```

**最佳实践**:

- 限制命令执行时间
- 检查危险操作
- 捕获 stderr

### 4.2 question - 用户询问

**功能**: 向用户提问并获取回答

**使用场景**:

- 需要确认时
- 需要额外信息时
- 多个选项时

**示例**:

```typescript
await ctx.ask({
  type: "select",
  question: "请选择操作",
  options: ["选项A", "选项B", "选项C"],
})
```

---

## 5. 技能系统

### 5.1 skill - 技能调用

**功能**: 执行预定义的技能（复合操作）

**概念**:

- 技能 = 多个工具的预定义组合
- 可以参数化
- 可复用

**示例技能**:

```typescript
// 代码审查技能
{
  name: "code_review",
  steps: [
    { tool: "glob", params: { pattern: "src/**/*.ts" } },
    { tool: "read", params: { path: "{file}" } },
    { tool: "question", params: { question: "是否继续?" } }
  ]
}
```

---

## 6. 工具对比

### 6.1 文件操作对比

| 操作 | read | edit       | write      |
| ---- | ---- | ---------- | ---------- |
| 读取 | ✅   | ✅（内部） | ❌         |
| 修改 | ❌   | ✅         | ❌（覆盖） |
| 创建 | ❌   | ❌         | ✅         |
| 安全 | 低   | 中         | 高         |

### 6.2 搜索工具对比

| 特性       | grep | glob |
| ---------- | ---- | ---- |
| 搜索内容   | ✅   | ❌   |
| 搜索文件名 | ❌   | ✅   |
| 正则表达式 | ✅   | ❌   |
| 性能       | 极高 | 高   |

---

## 7. 工具选择指南

### 7.1 常见场景

**场景 1: 查看文件**

```typescript
// ✅ 正确
{ tool: "read", params: { path: "config.json" } }

// ❌ 不要用 grep
{ tool: "grep", params: { pattern: ".*", path: "config.json" } }
```

**场景 2: 修改代码**

```typescript
// ✅ 小修改
{ tool: "edit", params: {
  path: "file.ts",
  search: "oldCode",
  replace: "newCode"
} }

// ✅ 大修改或多个文件
{ tool: "write", params: {
  path: "file.ts",
  content: "..."
} }
```

**场景 3: 查找代码**

```typescript
// ✅ 搜索内容
{ tool: "grep", params: { pattern: "function", include: "*.ts" } }

// ✅ 查找文件
{ tool: "glob", params: { pattern: "**/*.config.ts" } }
```

---

## 8. 本章总结

### 核心要点

1. **read**: 读取文件，支持偏移和限制
2. **edit**: 精确替换，需要唯一标识
3. **write**: 创建或覆盖文件
4. **grep**: 内容搜索，使用 ripgrep
5. **glob**: 文件搜索，使用 glob 模式
6. **bash**: 执行命令，注意安全
7. **question**: 与用户交互
8. **skill**: 组合多个工具

### 工具选择决策树

```
需要操作文件？
├── 读取 → read
├── 修改 → edit（小改）或 write（大改）
└── 创建 → write

需要搜索？
├── 搜索内容 → grep
└── 搜索文件 → glob

需要系统操作？
└── bash（谨慎使用）

需要用户确认？
└── question
```

---

**理解内置工具后，你可以更有效地与 AI 协作！**
