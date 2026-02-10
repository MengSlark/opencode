# 代码审查助手

> 🎯 难度：中级 | ⏱️ 预计时间：1-2 周 | 📦 目标：自动化代码审查

本项目教你创建一个自动化代码审查工具。

---

## 1. 功能设计

- 检查代码风格
- 发现潜在 Bug
- 提供改进建议
- 生成报告

---

## 2. 实现

```typescript
// src/tool/code-review.ts
import { Tool } from "@opencode-ai/core"

export const CodeReviewTool = Tool.define("code_review", {
  description: "审查代码",
  parameters: z.object({
    path: z.string(),
    focus: z.array(z.enum(["style", "bugs", "performance"])).default(["style", "bugs"]),
  }),

  async execute(params, ctx) {
    // 读取文件
    const content = await Bun.file(params.path).text()

    // 调用 AI 分析
    const review = await analyzeCode(content, params.focus)

    return {
      title: "Code Review",
      output: formatReview(review),
      metadata: { issues: review.issues.length },
    }
  },
})

async function analyzeCode(content: string, focus: string[]) {
  // 使用 AI 分析代码
  // 返回问题和建议
}
```

---

## 3. 多工具协作

```typescript
// 结合多个工具
const files = await globTool.execute({ pattern: "src/**/*.ts" })

for (const file of files) {
  const review = await codeReviewTool.execute({ path: file })
  // 汇总结果
}
```

---

## 4. 完成

你已创建了一个智能代码审查助手！
