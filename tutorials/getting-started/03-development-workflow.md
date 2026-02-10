# 开发工作流

> 📚 难度：初级 | ⏱️ 预计时间：1-2 天 | 🎯 目标：掌握日常开发流程

本教程介绍 OpenCode 的标准开发工作流，帮助你高效地进行开发。

---

## 1. 日常开发流程

### 1.1 开始新的一天

```bash
# 1. 切换到 dev 分支
git checkout dev

# 2. 拉取最新代码
git pull origin dev

# 3. 安装依赖（如果有更新）
bun install

# 4. 验证环境
bun typecheck
```

### 1.2 创建功能分支

```bash
# 创建并切换到新分支
git checkout -b feature/my-feature

# 分支命名规范
# feature/description   - 新功能
# fix/description       - Bug 修复
# docs/description      - 文档更新
# refactor/description  - 重构
```

### 1.3 开发与测试

```bash
# 1. 运行类型检查（实时）
bun typecheck --watch

# 2. 运行测试（实时）
bun test --watch

# 3. 开发代码
# ... 修改代码 ...

# 4. 提交前检查
bun typecheck
bun test
```

### 1.4 提交代码

```bash
# 1. 查看改动
git status
git diff

# 2. 添加到暂存区
git add .

# 3. 提交（遵循规范）
git commit -m "feat: 添加 XXX 功能"

# 4. 推送到远程
git push origin feature/my-feature
```

---

## 2. 代码规范

### 2.1 提交信息规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `style`: 格式调整
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

**示例**:

```bash
# 功能提交
git commit -m "feat(tool): 添加文件统计工具"

# Bug 修复
git commit -m "fix(grep): 修复空结果时的错误"

# 文档更新
git commit -m "docs: 更新工具开发教程"
```

### 2.2 代码风格检查

```bash
# 类型检查
bun typecheck

# 格式化（自动修复）
bun run format

# 检查（只报告不修复）
bun run lint
```

---

## 3. 调试工作流

### 3.1 控制台调试

```typescript
// 在关键位置添加日志
console.log("[DEBUG] 进入函数", params)
console.log("[DEBUG] 变量值:", variable)
console.log("[DEBUG] 对象状态:", JSON.stringify(obj, null, 2))
```

### 3.2 断点调试

```bash
# 启动调试模式
bun --inspect run src/index.ts

# 调试测试
bun --inspect test test/tool/grep.test.ts

# 然后在 Chrome 打开 chrome://inspect
```

### 3.3 测试驱动开发（TDD）

```bash
# 1. 先写测试
echo "test('should do X', () => { ... })" > test/tool/my-tool.test.ts

# 2. 运行测试（应该失败）
bun test test/tool/my-tool.test.ts

# 3. 实现功能
# ... 编写代码 ...

# 4. 再次运行测试（应该通过）
bun test test/tool/my-tool.test.ts

# 5. 重构并确保测试仍然通过
```

---

## 4. 故障排查

### 4.1 环境检查清单

```bash
# 检查 Bun 版本
bun --version  # 需要 >= 1.3.8

# 检查 Node 版本
node --version  # 备用

# 检查 Git 配置
git config user.name
git config user.email

# 检查依赖
ls node_modules | wc -l  # 应该有大量包
```

### 4.2 常见问题解决

**问题**: 类型检查失败

```bash
# 解决：清理缓存后重试
rm -rf node_modules bun.lockb
bun install
bun typecheck
```

**问题**: 测试超时

```bash
# 解决：增加超时时间
bun test --timeout 30000
```

**问题**: 端口被占用

```bash
# 查找占用端口的进程
lsof -i :4096

# 结束进程
kill -9 <PID>
```

---

## 5. 效率工具

### 5.1 VSCode 配置

**推荐扩展**:

- Bun for Visual Studio Code
- TypeScript Importer
- Prettier
- ESLint

**settings.json**:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### 5.2 常用别名

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
alias oc='cd /path/to/opencode'
alias oct='bun typecheck'
alias octest='bun test'
alias ocb='bun turbo build'
```

---

## 6. 本章总结

### 核心要点

1. 每天开始时更新代码和依赖
2. 功能开发使用独立分支
3. 提交前必须类型检查和测试
4. 遵循提交信息规范
5. 善用调试工具

### 检查清单

- [ ] 掌握分支管理
- [ ] 理解提交规范
- [ ] 会使用调试工具
- [ ] 能独立排查常见问题

---

**掌握开发工作流后，你将能够高效地参与项目开发！**
