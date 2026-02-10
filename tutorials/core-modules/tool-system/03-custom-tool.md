# 自定义工具开发

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：能独立开发完整工具

本教程将带你从零开始开发一个完整的自定义工具，包含设计、实现、测试全过程。

---

## 1. 工具设计

### 1.1 需求分析

假设我们要开发一个 **代码统计工具 (code_stats)**，功能：

- 统计项目的代码行数
- 按文件类型分类
- 排除特定目录（如 node_modules）

### 1.2 接口设计

**输入参数**:

```typescript
{
  path: string          // 项目路径
  include?: string[]    // 包含的文件类型 [".ts", ".js"]
  exclude?: string[]    // 排除的目录 ["node_modules", ".git"]
}
```

**输出结果**:

```typescript
{
  title: "Code Statistics",
  output: "人类可读的报告",
  metadata: {
    totalLines: number,
    totalFiles: number,
    byExtension: { [ext: string]: { files: number, lines: number } }
  }
}
```

---

## 2. 实现工具

### 2.1 创建文件

```bash
# 创建工具文件
touch packages/opencode/src/tool/code_stats.ts

# 创建测试文件
touch packages/opencode/test/tool/code_stats.test.ts
```

### 2.2 编写工具代码

```typescript
// packages/opencode/src/tool/code_stats.ts

import z from "zod"
import { Tool } from "./tool"
import path from "path"

export const CodeStatsTool = Tool.define("code_stats", {
  description: `
    统计项目代码的详细信息。
    
    功能：
    - 统计总代码行数
    - 按文件类型分类统计
    - 支持自定义包含/排除规则
    
    使用场景：
    - 了解项目规模
    - 分析代码构成
    - 生成项目报告
    
    示例：
    {
      "path": "./src",
      "include": [".ts", ".tsx"],
      "exclude": ["node_modules", "dist"]
    }
  `,

  parameters: z.object({
    path: z.string().describe("项目路径，可以是相对路径或绝对路径"),

    include: z
      .array(z.string())
      .optional()
      .default([".ts", ".js", ".tsx", ".jsx"])
      .describe("包含的文件扩展名，如 ['.ts', '.js']"),

    exclude: z.array(z.string()).optional().default(["node_modules", ".git", "dist"]).describe("排除的目录名"),
  }),

  async execute(params, ctx) {
    // 1. 请求权限
    await ctx.ask({
      permission: "file_read",
      message: `扫描 ${params.path} 目录的代码统计信息`,
      patterns: [`${params.path}/**/*`],
    })

    // 2. 扫描文件
    const stats = {
      totalLines: 0,
      totalFiles: 0,
      byExtension: {} as { [ext: string]: { files: number; lines: number } },
    }

    // 使用 glob 扫描文件
    for (const ext of params.include) {
      const pattern = path.join(params.path, `**/*${ext}`)
      const files = await Array.fromAsync(
        new Bun.Glob(pattern).scan({
          cwd: params.path,
          exclude: params.exclude,
        }),
      )

      for (const file of files) {
        const fullPath = path.join(params.path, file)

        // 检查是否在排除目录
        if (params.exclude.some((e) => fullPath.includes(e))) {
          continue
        }

        try {
          const content = await Bun.file(fullPath).text()
          const lines = content.split("\n").length

          stats.totalLines += lines
          stats.totalFiles += 1

          if (!stats.byExtension[ext]) {
            stats.byExtension[ext] = { files: 0, lines: 0 }
          }
          stats.byExtension[ext].files += 1
          stats.byExtension[ext].lines += lines
        } catch (err) {
          // 跳过无法读取的文件
          console.warn(`无法读取文件: ${fullPath}`)
        }
      }
    }

    // 3. 生成报告
    const report = [
      `📊 代码统计报告`,
      ``,
      `项目路径: ${params.path}`,
      `总文件数: ${stats.totalFiles}`,
      `总行数: ${stats.totalLines.toLocaleString()}`,
      ``,
      `按类型统计:`,
      ...Object.entries(stats.byExtension).map(([ext, data]) => {
        const percentage = ((data.lines / stats.totalLines) * 100).toFixed(1)
        return `  ${ext}: ${data.files} 个文件, ${data.lines.toLocaleString()} 行 (${percentage}%)`
      }),
    ].join("\n")

    return {
      title: `Code Stats - ${stats.totalFiles} files`,
      output: report,
      metadata: stats,
    }
  },
})
```

---

## 3. 编写测试

### 3.1 基础测试

```typescript
// packages/opencode/test/tool/code_stats.test.ts

import { describe, expect, test } from "bun:test"
import { CodeStatsTool } from "../../src/tool/code_stats"
import path from "path"
import { tmpdir } from "../fixture/fixture"

const mockCtx = {
  sessionID: "test",
  messageID: "",
  callID: "",
  agent: "test",
  abort: AbortSignal.any([]),
  ask: async () => {},
  metadata: () => {},
}

describe("tool.code_stats", () => {
  test("basic stats", async () => {
    // 创建临时测试目录
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "test.ts"), "line1\nline2\nline3")
        await Bun.write(path.join(dir, "test.js"), "line1\nline2")
      },
    })

    const tool = await CodeStatsTool.init()
    const result = await tool.execute(
      {
        path: tmp.path,
        include: [".ts", ".js"],
      },
      mockCtx,
    )

    expect(result.metadata.totalFiles).toBe(2)
    expect(result.metadata.totalLines).toBe(5)
    expect(result.metadata.byExtension[".ts"].files).toBe(1)
    expect(result.metadata.byExtension[".ts"].lines).toBe(3)
  })

  test("respects exclude patterns", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        await Bun.write(path.join(dir, "file.ts"), "content")
        await Bun.write(path.join(dir, "node_modules", "lib.ts"), "content")
      },
    })

    const tool = await CodeStatsTool.init()
    const result = await tool.execute(
      {
        path: tmp.path,
        include: [".ts"],
        exclude: ["node_modules"],
      },
      mockCtx,
    )

    expect(result.metadata.totalFiles).toBe(1)
  })

  test("handles empty directory", async () => {
    await using tmp = await tmpdir()

    const tool = await CodeStatsTool.init()
    const result = await tool.execute(
      {
        path: tmp.path,
        include: [".ts"],
      },
      mockCtx,
    )

    expect(result.metadata.totalFiles).toBe(0)
    expect(result.metadata.totalLines).toBe(0)
    expect(result.output).toContain("总文件数: 0")
  })
})
```

### 3.2 边界情况测试

```typescript
describe("tool.code_stats - edge cases", () => {
  test("handles binary files gracefully", async () => {
    await using tmp = await tmpdir({
      init: async (dir) => {
        // 写入二进制内容
        await Bun.write(path.join(dir, "file.ts"), Buffer.from([0x00, 0x01, 0x02]))
      },
    })

    const tool = await CodeStatsTool.init()
    const result = await tool.execute(
      {
        path: tmp.path,
        include: [".ts"],
      },
      mockCtx,
    )

    // 应该能处理二进制文件而不崩溃
    expect(result.metadata.totalFiles).toBe(1)
  })

  test("handles permission denial", async () => {
    let asked = false
    const ctx = {
      ...mockCtx,
      ask: async () => {
        asked = true
        throw new Error("Permission denied")
      },
    }

    const tool = await CodeStatsTool.init()
    await expect(tool.execute({ path: "/test" }, ctx)).rejects.toThrow("Permission denied")

    expect(asked).toBe(true)
  })
})
```

---

## 4. 集成与验证

### 4.1 运行测试

```bash
# 运行测试
bun test test/tool/code_stats.test.ts

# 检查类型
bun typecheck

# 格式化代码
bun run format
```

### 4.2 实际使用测试

```bash
# 在真实项目上测试
cd packages/opencode
bun run src/index.ts

# 在会话中测试
> 使用 code_stats 工具统计 ./src 目录
```

---

## 5. 进阶优化

### 5.1 性能优化

```typescript
async execute(params, ctx) {
  // 使用并行处理
  const filePromises = files.map(async file => {
    const content = await Bun.file(file).text()
    return { file, lines: content.split('\n').length }
  })

  const results = await Promise.all(filePromises)

  // 合并结果
  for (const result of results) {
    stats.totalLines += result.lines
    // ...
  }
}
```

### 5.2 添加更多统计

```typescript
// 添加代码复杂度统计
const complexity = calculateComplexity(content)

// 添加空行/注释行统计
const lines = content.split("\n")
const emptyLines = lines.filter((l) => l.trim() === "").length
const commentLines = lines.filter((l) => l.trim().startsWith("//")).length
```

### 5.3 导出功能

```typescript
// 支持导出 JSON/CSV
if (params.format === "json") {
  return {
    output: JSON.stringify(stats, null, 2),
  }
}
```

---

## 6. 最佳实践总结

### 6.1 设计原则

1. **单一职责**: 一个工具只做一件事
2. **明确参数**: 参数要有清晰的描述和默认值
3. **权限控制**: 敏感操作必须请求权限
4. **友好输出**: 人类可读的输出格式

### 6.2 代码规范

1. **类型安全**: 使用 Zod 严格验证
2. **错误处理**: 优雅处理异常情况
3. **日志记录**: 关键步骤添加日志
4. **测试覆盖**: 核心逻辑要有测试

### 6.3 文档要求

1. **详细描述**: 说明用途、场景、示例
2. **参数说明**: 每个参数都要有描述
3. **示例代码**: 提供使用示例
4. **注意事项**: 列出重要提醒

---

## 7. 本章总结

### 开发流程

1. **需求分析** → 明确工具要解决的问题
2. **接口设计** → 定义输入输出
3. **代码实现** → 编写工具逻辑
4. **测试编写** → 覆盖正常和异常情况
5. **集成验证** → 在实际环境中测试
6. **文档编写** → 完善描述和示例

### 检查清单

- [ ] 工具功能完整
- [ ] 参数验证正确
- [ ] 权限控制到位
- [ ] 测试覆盖充分
- [ ] 文档清晰完整

---

**恭喜！你已经掌握了自定义工具开发的完整流程。现在可以尝试开发自己的工具了！**
