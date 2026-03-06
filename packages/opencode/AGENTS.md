# OpenCode 代理指南

## 构建/测试命令

- **安装**：`bun install`
- **运行**：`bun run --conditions=browser ./src/index.ts`
- **类型检查**：`bun run typecheck`（或 npm run typecheck）
- **测试**：`bun test`（运行全部测试）
- **单测**：`bun test test/tool/tool.test.ts`（指定测试文件）

## 代码风格

- **运行时**：Bun + TypeScript ESM 模块
- **导入**：本地模块使用相对路径导入，优先使用具名导入
- **类型**：用 Zod 做校验，用 TypeScript 接口描述结构
- **命名**：变量/函数用 camelCase，类/命名空间用 PascalCase
- **错误处理**：采用 Result 模式，在工具中避免抛出异常
- **文件组织**：按命名空间组织（如 `Tool.define()`、`Session.create()`）

## 架构

- **工具**：实现 `Tool.Info` 接口及 `execute()` 方法
- **上下文**：在工具上下文中传入 `sessionID`，用 `App.provide()` 做依赖注入
- **校验**：所有输入用 Zod schema 校验
- **日志**：使用 `Log.create({ service: "name" })` 形式
- **存储**：使用 `Storage` 命名空间做持久化
- **API 客户端**：TypeScript TUI（基于 SolidJS + OpenTUI）通过 `@opencode-ai/sdk` 与 OpenCode 服务端通信。在 `packages/opencode/src/server/server.ts` 中新增或修改服务端接口后，需执行 `./script/generate.ts` 重新生成 SDK 及相关文件。
