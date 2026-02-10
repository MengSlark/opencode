# OpenCode 学习教程中心

欢迎来到 OpenCode 教程中心！这里提供从入门到精通的完整学习路径。

## 📚 教程导航

### 🚀 入门系列 (Getting Started)

适合零基础或刚接触项目的开发者

1. **[环境搭建与项目概览](getting-started/01-environment-setup.md)** ⭐ 从这里开始
   - 开发环境配置
   - 项目结构解析
   - 第一个工具实践

2. **[项目架构总览](getting-started/02-project-architecture.md)**
   - Monorepo 结构
   - 核心概念介绍
   - 技术栈概览

3. **[开发工作流](getting-started/03-development-workflow.md)**
   - 代码规范
   - 测试方法
   - 调试技巧

### 🧩 核心模块 (Core Modules)

深入理解系统各个核心组件

#### 工具系统 (Tool System)

- **[工具基础](core-modules/tool-system/01-tool-basics.md)**
  - Tool.define 原理
  - 参数定义与验证
  - 执行流程

- **[内置工具详解](core-modules/tool-system/02-built-in-tools.md)**
  - grep: 代码搜索
  - read: 文件读取
  - edit: 文件编辑
  - bash: 命令执行

- **[自定义工具开发](core-modules/tool-system/03-custom-tool.md)**
  - 从零创建工具
  - 测试与调试
  - 最佳实践

#### 会话管理 (Session Management)

- **[会话生命周期](core-modules/session-management/01-session-lifecycle.md)**
  - Session 创建与销毁
  - 消息流转
  - 状态管理

- **[消息系统](core-modules/session-management/02-message-system.md)**
  - 消息类型
  - 提示词构建
  - 消息转换

- **[会话压缩与回滚](core-modules/session-management/03-compaction-revert.md)**
  - 压缩机制
  - 历史管理
  - 状态恢复

#### AI 提供商 (AI Providers)

- **[提供商架构](core-modules/ai-providers/01-provider-architecture.md)**
  - Provider 接口
  - 配置管理
  - 流式响应

- **[主流提供商接入](core-modules/ai-providers/02-major-providers.md)**
  - OpenAI
  - Anthropic Claude
  - Google Gemini

- **[自定义提供商](core-modules/ai-providers/03-custom-provider.md)**
  - 实现新的 AI 服务
  - 消息格式转换

#### 服务器 (Server)

- **[HTTP API 设计](core-modules/server/01-http-api.md)**
  - RESTful 接口
  - 路由设计
  - 中间件

- **[WebSocket 实时通信](core-modules/server/02-websocket.md)**
  - 连接管理
  - 消息推送
  - 错误处理

- **[服务端点详解](core-modules/server/03-endpoints.md)**
  - Session 管理 API
  - Tool 调用 API
  - 文件操作 API

### 🎨 前端开发 (Frontend)

SolidJS + TypeScript 现代前端开发

#### SolidJS 基础

- **[响应式系统](frontend/solidjs-basics/01-reactivity.md)**
  - Signal vs Store
  - 计算属性
  - 副作用

- **[组件开发](frontend/solidjs-basics/02-components.md)**
  - 组件定义
  - Props 传递
  - 生命周期

- **[路由与导航](frontend/solidjs-basics/03-routing.md)**
  - 路由配置
  - 动态路由
  - 导航守卫

#### UI 组件

- **[组件库概览](frontend/ui-components/01-component-library.md)**
  - Kobalte 组件
  - 自定义组件
  - 样式系统

- **[会话界面开发](frontend/ui-components/02-session-ui.md)**
  - 消息列表
  - 输入框
  - 工具调用展示

- **[主题与样式](frontend/ui-components/03-theming.md)**
  - TailwindCSS
  - 暗色模式
  - 自定义主题

#### 状态管理

- **[全局状态](frontend/state-management/01-global-state.md)**
  - Context API
  - Store 模式
  - 状态持久化

- **[服务端状态同步](frontend/state-management/02-server-sync.md)**
  - WebSocket 状态同步
  - 乐观更新
  - 错误处理

### 🔧 高级主题 (Advanced)

深入系统底层和扩展机制

#### MCP 协议

- **[MCP 协议详解](advanced/mcp-protocol/01-mcp-overview.md)**
  - 协议规范
  - 消息格式
  - 安全机制

- **[MCP 客户端实现](advanced/mcp-protocol/02-mcp-client.md)**
  - 连接管理
  - 工具发现
  - 调用流程

- **[MCP 服务器开发](advanced/mcp-protocol/03-mcp-server.md)**
  - 服务端实现
  - 认证授权
  - 资源暴露

#### 插件系统

- **[插件架构](advanced/plugin-system/01-plugin-architecture.md)**
  - 插件生命周期
  - manifest 定义
  - 沙箱机制

- **[开发第一个插件](advanced/plugin-system/02-first-plugin.md)**
  - 环境搭建
  - 工具注册
  - 打包发布

- **[高级插件技巧](advanced/plugin-system/03-advanced-plugins.md)**
  - 动态加载
  - 插件通信
  - 性能优化

#### 贡献指南

- **[代码贡献](advanced/contributing/01-code-contribution.md)**
  - 开发流程
  - PR 规范
  - 代码审查

- **[文档贡献](advanced/contributing/02-documentation.md)**
  - 文档规范
  - 示例代码
  - 翻译工作

### 📝 实战项目 (Examples)

通过实际项目巩固知识

#### 初级项目

- **[项目 1: 天气查询工具](examples/beginner/01-weather-tool.md)**
  - 目标：创建天气查询工具
  - 技能：工具开发基础
  - 时间：2-3 天

- **[项目 2: 文件统计器](examples/beginner/02-file-counter.md)**
  - 目标：统计代码行数
  - 技能：文件操作
  - 时间：1-2 天

#### 中级项目

- **[项目 3: 自定义 AI 提供商](examples/intermediate/01-custom-provider.md)**
  - 目标：接入新 AI 服务
  - 技能：Provider 系统
  - 时间：1 周

- **[项目 4: 代码审查助手](examples/intermediate/02-code-reviewer.md)**
  - 目标：自动化代码审查
  - 技能：多工具协作
  - 时间：1-2 周

#### 高级项目

- **[项目 5: 插件生态系统](examples/advanced/01-plugin-ecosystem.md)**
  - 目标：开发完整插件
  - 技能：全栈开发
  - 时间：2-3 周

- **[项目 6: 企业级扩展](examples/advanced/02-enterprise-extension.md)**
  - 目标：定制化开发
  - 技能：架构设计
  - 时间：3-4 周

### 📖 参考资料 (Reference)

- **[API 文档](reference/api-reference.md)**
- **[类型定义速查](reference/types-cheatsheet.md)**
- **[常见问题 FAQ](reference/faq.md)**
- **[错误码大全](reference/error-codes.md)**

## 🎯 推荐学习路径

### 路径一：工具开发者

```
环境搭建 → 工具基础 → 内置工具 → 自定义工具 → 实战项目
```

### 路径二：前端开发者

```
环境搭建 → SolidJS 基础 → 组件开发 → 状态管理 → 会话 UI
```

### 路径三：全栈开发者

```
环境搭建 → 项目架构 → 工具系统 → 服务器 → 前端 → 实战项目
```

### 路径四：贡献者

```
环境搭建 → 开发工作流 → 代码规范 → 贡献指南 → 提交 PR
```

## 📋 学习检查清单

### 入门阶段

- [ ] 成功运行 `bun install`
- [ ] 理解项目目录结构
- [ ] 成功运行单个测试
- [ ] 能修改并运行 grep 工具

### 进阶阶段

- [ ] 实现一个自定义工具
- [ ] 理解会话生命周期
- [ ] 能添加新的 AI 提供商
- [ ] 成功修改前端组件

### 高级阶段

- [ ] 理解 MCP 协议
- [ ] 开发一个完整插件
- [ ] 提交第一个 PR
- [ ] 能独立排查复杂问题

## 💡 学习建议

1. **由浅入深**：先跑通代码，再理解原理
2. **边学边做**：每个概念都要动手实践
3. **善用测试**：测试是最好的使用示例
4. **记录笔记**：建立自己的知识库
5. **参与社区**：提问、讨论、贡献代码

## 🔗 相关链接

- [项目主仓库](https://github.com/anomalyco/opencode)
- [AGENTS.md](../AGENTS.md) - 代码规范
- [LEARNING_GUIDE.md](../LEARNING_GUIDE.md) - 完整学习指南（旧版）

---

**准备好开始了吗？从 [环境搭建](getting-started/01-environment-setup.md) 开始你的 OpenCode 之旅！**
