# 环境搭建与项目概览

> 📚 难度：初级 | ⏱️ 预计时间：1 周 | 🎯 目标：跑通第一个工具

欢迎来到 OpenCode！本教程将带你从零开始，搭建开发环境并理解项目结构。

---

## 📋 前置知识

在开始学习之前，建议你先掌握以下基础知识：

### 必须掌握

- **TypeScript 基础**：类型、接口、泛型
- **Node.js 概念**：模块系统、异步编程
- **Git 基础**：克隆、提交、分支

### 推荐了解

- **现代前端框架**：React/Vue/Solid 任一
- **命令行基础**：常用 shell 命令
- **正则表达式**：基本匹配规则

### 学习资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Bun 文档](https://bun.sh/docs)
- [SolidJS 教程](https://www.solidjs.com/tutorial)

---

## Day 1: 环境准备

### 1.1 安装 Bun

Bun 是项目的核心运行时，必须安装 1.3.8 或更高版本。

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (需要 WSL)
powershell -c "irm bun.sh/install.ps1 | iex"

# 验证安装
bun --version  # 应显示 1.3.8 或更高
```

**常见问题**：

- Q: 安装后命令找不到？
- A: 重启终端或运行 `source ~/.bashrc` (或 `~/.zshrc`)

### 1.2 克隆项目

```bash
# 克隆仓库
git clone https://github.com/anomalyco/opencode.git
cd opencode

# 查看分支
git branch -a  # 默认在 dev 分支
```

### 1.3 安装依赖

```bash
# 安装所有依赖（可能需要几分钟）
bun install

# 验证安装成功
ls node_modules  # 应该有很多包
```

**如果安装失败**：

```bash
# 清理后重试
rm -rf node_modules bun.lockb
bun install
```

### 1.4 验证环境

```bash
# 类型检查
bun typecheck

# 运行测试
bun turbo test
```

如果这两个命令都能成功运行，说明环境配置正确！

---

## Day 2-3: 项目结构探索

### 2.1 整体架构

```
opencode/                           # 项目根目录
├── 📦 packages/                    # 核心包（monorepo）
│   ├── opencode/                   # ⭐ 核心 CLI 和服务器
│   ├── app/                        # ⭐ Web UI（SolidJS）
│   ├── sdk/js/                     # JavaScript SDK
│   ├── ui/                         # UI 组件库
│   ├── util/                       # 共享工具函数
│   └── ...                         # 其他包
├── 📦 sdks/
│   └── vscode/                     # VS Code 扩展
├── 📄 package.json                 # 根配置（workspaces）
├── 📄 turbo.json                   # Turbo 配置
└── 📄 AGENTS.md                    # 代码规范（必读）
```

### 2.2 核心包详解

#### packages/opencode/ - 核心引擎

```
src/
├── tool/           # ⭐ 工具系统（最重要！）
│   ├── tool.ts     # 工具基类
│   ├── registry.ts # 工具注册表
│   ├── grep.ts     # 代码搜索工具
│   ├── read.ts     # 文件读取工具
│   └── ...
├── server/         # HTTP/WebSocket 服务器
├── session/        # 会话管理
├── project/        # 项目管理
├── provider/       # AI 提供商（OpenAI/Claude等）
├── agent/          # Agent 核心逻辑
└── test/           # 测试文件
```

#### packages/app/ - 前端界面

```
src/
├── pages/          # 页面组件
│   └── session/    # 会话页面
├── components/     # 可复用组件
├── context/        # 全局状态
└── i18n/           # 国际化
```

### 2.3 关键概念

#### Monorepo 工作区

项目使用 Bun workspaces 管理多个包：

- 共享依赖（catalog）
- 独立版本控制
- 统一构建流程

#### 技术栈概览

| 层级   | 技术         | 说明         |
| ------ | ------------ | ------------ |
| 运行时 | Bun          | 替代 Node.js |
| 语言   | TypeScript   | 类型安全     |
| 前端   | SolidJS      | 响应式框架   |
| 样式   | TailwindCSS  | 原子化 CSS   |
| 验证   | Zod          | Schema 验证  |
| 构建   | Vite + Turbo | 快速构建     |

---

## Day 4-7: 第一个工具 - grep

### 3.1 为什么选择 grep？

`grep` 是最简单的工具之一，流程清晰：

1. 接收搜索参数
2. 调用 ripgrep 命令
3. 解析输出结果
4. 格式化返回

### 3.2 阅读 grep 工具源码

**文件位置**: `packages/opencode/src/tool/grep.ts`

```typescript
// 步骤 1: 导入依赖
import z from "zod"
import { Tool } from "./tool"
import { Ripgrep } from "../file/ripgrep"

// 步骤 2: 定义 Schema（输入验证）
const parameters = z.object({
  pattern: z.string().describe("搜索的正则表达式"),
  path: z.string().optional().describe("搜索目录，默认当前目录"),
  include: z.string().optional().describe('文件过滤模式，如 "*.ts"'),
})

// 步骤 3: 定义工具
export const GrepTool = Tool.define("grep", {
  description: DESCRIPTION, // 工具描述
  parameters, // 参数定义

  // 步骤 4: 执行逻辑
  async execute(params, ctx) {
    // 4.1 权限检查
    await ctx.ask({
      permission: "grep",
      patterns: [params.pattern],
      always: ["*"],
    })

    // 4.2 构建命令
    const args = ["-nH", "--hidden", "--no-messages", "--field-match-separator=|", "--regexp", params.pattern]

    // 4.3 执行命令
    const proc = Bun.spawn([rgPath, ...args], {
      stdout: "pipe",
      stderr: "pipe",
      signal: ctx.abort,
    })

    // 4.4 处理输出
    const output = await new Response(proc.stdout).text()

    // 4.5 返回结果
    return {
      title: params.pattern,
      metadata: { matches: count, truncated },
      output: formattedOutput,
    }
  },
})
```

### 3.3 理解关键部分

#### A. Schema 定义

```typescript
const parameters = z.object({
  pattern: z.string(), // 必填
  path: z.string().optional(), // 可选
  include: z.string().optional(), // 可选
})
```

- 使用 Zod 进行运行时验证
- `.describe()` 用于生成文档

#### B. 工具定义

```typescript
Tool.define("grep", {
  description: DESCRIPTION,
  parameters,
  async execute(params, ctx) { ... }
})
```

- 第一个参数：工具唯一标识
- `description`: AI 理解工具用途
- `execute`: 实际执行逻辑

#### C. 上下文对象 ctx

```typescript
async execute(params, ctx) {
  // ctx 包含：
  ctx.sessionID    // 会话 ID
  ctx.abort        // 取消信号
  ctx.ask()        // 请求权限
  ctx.metadata()   // 记录元数据
}
```

### 3.4 运行测试

```bash
# 进入核心包目录
cd packages/opencode

# 运行 grep 工具的测试
bun test test/tool/grep.test.ts

# 只运行某个测试用例
bun test test/tool/grep.test.ts -t "basic search"
```

**测试文件结构**:

```typescript
import { describe, expect, test } from "bun:test"
import { GrepTool } from "../../src/tool/grep"

describe("tool.grep", () => {
  test("basic search", async () => {
    const grep = await GrepTool.init()
    const result = await grep.execute(
      {
        pattern: "export",
        path: projectRoot,
        include: "*.ts",
      },
      ctx,
    )

    expect(result.metadata.matches).toBeGreaterThan(0)
  })
})
```

### 3.5 动手实验

**实验 1: 添加日志**

```typescript
async execute(params, ctx) {
  console.log("[DEBUG] 搜索参数:", params)
  console.log("[DEBUG] 上下文:", ctx.sessionID)

  // ...原有代码
}
```

**实验 2: 修改返回格式**

```typescript
// 修改 output 的格式
outputLines.push(`✅ 找到 ${finalMatches.length} 个匹配`)
```

**实验 3: 添加新参数**

```typescript
const parameters = z.object({
  // ...原有参数
  maxResults: z.number().optional().describe("最大返回结果数"),
})
```

---

## 📝 本章总结

### 你学到了什么？

✅ **环境搭建**

- 安装 Bun 运行时
- 克隆和配置项目
- 验证开发环境

✅ **项目结构**

- 理解 Monorepo 架构
- 识别核心包职责
- 了解技术栈

✅ **工具系统基础**

- Schema 定义与验证
- Tool.define 模式
- 执行流程

✅ **测试方法**

- 运行单个测试
- 理解测试结构
- 调试技巧

### 检查清单

- [ ] Bun 版本 >= 1.3.8
- [ ] 成功运行 `bun install`
- [ ] 成功运行 `bun typecheck`
- [ ] 能解释 Monorepo 结构
- [ ] 能读懂 grep 工具代码
- [ ] 成功运行 grep 测试
- [ ] 成功修改并验证 grep 工具

### 下一步

完成本章后，你应该：

1. 能独立搭建开发环境
2. 理解项目整体架构
3. 掌握工具的基本结构
4. 学会运行和调试测试

**推荐继续学习**: [项目架构总览](02-project-architecture.md) 或 [工具系统基础](../core-modules/tool-system/01-tool-basics.md)

---

## 🆘 常见问题

### Q1: bun install 很慢或失败？

**A**:

```bash
# 使用国内镜像
export BUN_CONFIG_REGISTRY=https://registry.npmmirror.com
bun install
```

### Q2: 测试跑不通？

**A**:

```bash
# 检查 Bun 版本
bun --version  # 需要 1.3.8+

# 清理缓存
rm -rf node_modules bun.lockb
bun install

# 运行单个测试定位问题
bun test test/tool/grep.test.ts --verbose
```

### Q3: 不知道如何开始调试？

**A**:

```bash
# 方法 1: 添加 console.log
# 方法 2: 使用 debugger
bun --inspect test test/tool/grep.test.ts

# 方法 3: VSCode 调试
# 安装 Bun 扩展，使用 launch.json
```

### Q4: 代码规范报错？

**A**: 阅读 [AGENTS.md](../../AGENTS.md) 了解：

- 命名规范
- 代码风格
- 提交规范

---

**恭喜！你已经迈出了第一步。继续加油！** 🎉
