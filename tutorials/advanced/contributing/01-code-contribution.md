# 代码贡献

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：学会为项目贡献代码

本教程讲解如何为 OpenCode 贡献代码，包括开发流程和 PR 规范。

---

## 1. 准备工作

### 1.1 Fork 仓库

```bash
# 1. 在 GitHub 上 Fork 仓库
# 2. 克隆你的 Fork
git clone https://github.com/YOUR_USERNAME/opencode.git
cd opencode

# 3. 添加 upstream
git remote add upstream https://github.com/anomalyco/opencode.git
```

### 1.2 配置开发环境

```bash
# 安装依赖
bun install

# 验证环境
bun typecheck
bun turbo test
```

---

## 2. 开发流程

### 2.1 创建分支

```bash
# 从 dev 分支创建
git checkout dev
git pull upstream dev

git checkout -b feature/my-feature
# 或
git checkout -b fix/some-bug
```

### 2.2 提交规范

```bash
# 格式: <type>(<scope>): <description>

# 示例
git commit -m "feat(tool): add weather tool"
git commit -m "fix(grep): handle empty results"
git commit -m "docs(api): update endpoint docs"
git commit -m "refactor(session): simplify message flow"
git commit -m "test(tool): add unit tests for bash tool"
```

**类型说明**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

---

## 3. PR 规范

### 3.1 PR 模板

```markdown
## 描述

简要描述这个 PR 做了什么

## 类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 文档更新
- [ ] 性能优化
- [ ] 重构

## 检查清单

- [ ] 代码通过类型检查
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了文档

## 关联 Issue

Fixes #123
```

### 3.2 代码审查

```bash
# 自我审查清单
- [ ] 代码符合 AGENTS.md 规范
- [ ] 没有 console.log
- [ ] 错误处理完善
- [ ] 函数命名清晰
- [ ] 有必要的注释
```

---

## 4. 本章总结

### 贡献流程

```
Fork → 克隆 → 分支 → 开发 → 测试 → PR → 审查 → 合并
```

### 关键要点

1. 从 dev 分支开发
2. 遵循提交规范
3. 完善 PR 描述
4. 积极回应审查意见

---

**为开源贡献，让社区更美好！**
