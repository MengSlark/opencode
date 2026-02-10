# 文件统计器

> 🎯 难度：初级 | ⏱️ 预计时间：1-2 天 | 📦 目标：统计代码行数

本项目教你创建一个统计代码行数的工具。

---

## 1. 项目目标

统计项目中的代码文件，输出：

- 总文件数
- 总行数
- 按语言分类统计

---

## 2. 实现

```typescript
// src/tool/code-stats.ts
import { Tool } from "@opencode-ai/core"
import z from "zod"
import { glob } from "glob"

export const CodeStatsTool = Tool.define("code_stats", {
  description: "统计代码行数",
  parameters: z.object({
    path: z.string().default("."),
    include: z.array(z.string()).default(["**/*"]),
    exclude: z.array(z.string()).default(["node_modules/**", ".git/**", "dist/**"]),
  }),

  async execute(params, ctx) {
    const files = await glob(params.include, {
      cwd: params.path,
      ignore: params.exclude,
    })

    const stats = {
      totalFiles: 0,
      totalLines: 0,
      byExtension: {} as Record<string, { files: number; lines: number }>,
    }

    for (const file of files) {
      const content = await Bun.file(file).text()
      const lines = content.split("\n").length
      const ext = file.split(".").pop() || "unknown"

      stats.totalFiles++
      stats.totalLines += lines

      if (!stats.byExtension[ext]) {
        stats.byExtension[ext] = { files: 0, lines: 0 }
      }
      stats.byExtension[ext].files++
      stats.byExtension[ext].lines += lines
    }

    return {
      title: "Code Statistics",
      output: `
文件数: ${stats.totalFiles}
总行数: ${stats.totalLines}

按类型统计:
${Object.entries(stats.byExtension)
  .map(([ext, data]) => `  .${ext}: ${data.files} 个文件, ${data.lines} 行`)
  .join("\n")}
      `.trim(),
      metadata: stats,
    }
  },
})
```

---

## 3. 测试

```typescript
test("counts lines correctly", async () => {
  const tool = await CodeStatsTool.init()
  const result = await tool.execute(
    {
      path: "./test-project",
    },
    mockCtx,
  )

  expect(result.metadata.totalFiles).toBeGreaterThan(0)
  expect(result.metadata.totalLines).toBeGreaterThan(0)
})
```

---

## 4. 完成

你已创建了一个实用的代码统计工具！
