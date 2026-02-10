# OpenCode 代理指南

## 构建/测试命令

- **安装**: `bun install` (从根目录运行)
- **类型检查**: `bun turbo typecheck` (所有包) 或 `bun typecheck` (单个包)
- **测试**: `bun turbo test` (所有包) 或 `bun test` (单个包)
- **单个测试文件**: `bun test path/to/test.ts` (例如: `bun test test/tool/grep.test.ts`)
- **构建**: `bun turbo build` (使用 Turbo 管道并输出到 `dist/**`)
- **格式化**: 使用 Prettier，配置为 `semi: false`, `printWidth: 120` (在根目录 package.json 中配置)

## Git 工作流

- **默认分支**: `dev` (不是 `main`)
- 使用 `dev` 或 `origin/dev` 进行差异比较 (本地 `main` 引用可能不存在)
- 除非用户明确要求，否则不要提交更改
- 优先自动化: 除非缺少信息或涉及安全/不可逆操作，否则直接执行请求的操作无需确认

## 代码风格

### 通用原则

- 除非需要组合或复用，否则保持在一个函数内
- 尽可能避免使用 `try`/`catch`
- 避免使用 `any` 类型
- 尽可能使用单个单词的变量名
- 尽可能使用 Bun API，如 `Bun.file()`
- 依赖类型推断；除非导出需要，否则避免显式类型注解或接口
- 优先使用函数式数组方法 (flatMap, filter, map) 而非 for 循环
- 在 filter 上使用类型守卫以保持下游类型推断
- 尽可能使用并行工具

### 命名规范

变量和函数优先使用单个单词的命名。只有在必要时才使用多个单词。

```ts
// 好
const foo = 1
function journal(dir: string) {}

// 不好
const fooBar = 1
function prepareJournal(dir: string) {}
```

当值只使用一次时，通过内联减少变量总数。

```ts
// 好
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// 不好
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### 解构

避免不必要的解构。使用点符号保持上下文。

```ts
// 好
obj.a
obj.b

// 不好
const { a, b } = obj
```

### 变量

优先使用 `const` 而非 `let`。使用三元表达式或提前返回而非重新赋值。

```ts
// 好
const foo = condition ? 1 : 2

// 不好
let foo
if (condition) foo = 1
else foo = 2
```

### 控制流

避免使用 `else` 语句。优先使用提前返回。

```ts
// 好
function foo() {
  if (condition) return 1
  return 2
}

// 不好
function foo() {
  if (condition) return 1
  else return 2
}
```

### 模式定义 (Drizzle)

字段名使用 snake_case，这样就不需要用字符串重新定义列名。

```ts
// 好
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// 不好
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## 测试

- 尽可能避免使用 mock
- 测试实际实现，不要在测试中复制逻辑
- 单元测试使用 `bun:test` (describe, expect, test)
- E2E 测试使用 Playwright (在 `packages/app/e2e/` 中)

## 架构

- **Monorepo**: 使用 Bun workspaces 和 Turbo 进行任务编排
- **运行时**: 使用 Bun 和 TypeScript ESM 模块 (`"type": "module"`)
- **包管理器**: bun@1.3.8
- **基于命名空间的组织**: 例如 `Tool.define()`, `Session.create()`
- **工具**: 实现 `Tool.Info` 接口和 `execute()` 方法
- **验证**: 所有输入使用 Zod schema 进行验证
- **存储**: 使用 `Storage` 命名空间进行持久化
- **上下文**: 在工具上下文中传递 `sessionID`，使用 `App.provide()` 进行依赖注入

## SDK 重新生成

- 要重新生成 JavaScript SDK，运行 `./packages/sdk/js/script/build.ts`
- 当在 `packages/opencode/src/server/server.ts` 中添加/修改服务端点时，运行 `./script/generate.ts` 重新生成 SDK

## 包结构

- `packages/opencode/` - 核心 CLI 和服务器
- `packages/app/` - SolidJS Web UI
- `packages/sdk/js/` - JavaScript SDK
- `packages/ui/` - UI 组件
- `packages/util/` - 共享工具
- `sdks/vscode/` - VS Code 扩展
