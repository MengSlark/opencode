# 常见问题 FAQ

> 💬 遇到问题先来这里查找答案

---

## 环境搭建

### Q: Bun 安装失败或命令找不到？

**A:**

```bash
# 1. 检查是否安装成功
which bun  # 应该显示路径

# 2. 如果没有，手动添加环境变量
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc  # 或 ~/.bashrc
source ~/.zshrc

# 3. 验证版本
bun --version  # 需要 >= 1.3.8
```

### Q: `bun install` 很慢或超时？

**A:**

```bash
# 使用国内镜像
export BUN_CONFIG_REGISTRY=https://registry.npmmirror.com
bun install

# 或使用代理
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
bun install
```

### Q: 安装依赖后磁盘空间不足？

**A:**

```bash
# 清理 Bun 缓存
bun pm cache rm

# 删除 node_modules 重新安装
rm -rf node_modules bun.lockb
bun install
```

---

## 类型检查

### Q: `bun typecheck` 报错太多看不懂？

**A:**

```bash
# 只看前 20 个错误
bun typecheck 2>&1 | head -50

# 只看特定文件的错误
bun typecheck 2>&1 | grep "src/tool/my-file.ts"

# 忽略 node_modules 的错误（通常是依赖问题）
bun typecheck 2>&1 | grep -v "node_modules"
```

### Q: 引入新库后类型报错？

**A:**

```typescript
// 1. 检查是否安装了类型定义
bun add -d @types/library-name

// 2. 或者声明模块（临时方案）
// 创建 types.d.ts
declare module 'library-name' {
  const content: any
  export default content
}
```

### Q: "Cannot find module" 但文件存在？

**A:**

```bash
# 1. 检查 tsconfig.json 配置
cat tsconfig.json | grep -A 5 "paths"

# 2. 重启类型检查服务（VSCode）
Cmd + Shift + P -> TypeScript: Restart TS Server

# 3. 确保是相对路径或正确的别名
import { Tool } from "./tool"        // ✅
import { Tool } from "@/tool"        // 需要配置 paths
```

---

## 测试相关

### Q: 测试跑不通，如何定位问题？

**A:**

```bash
# 1. 运行单个测试文件
bun test test/tool/grep.test.ts

# 2. 只运行特定测试
bun test test/tool/grep.test.ts -t "basic search"

# 3. 显示详细输出
bun test --verbose

# 4. 查看测试覆盖率
bun test --coverage
```

### Q: 测试超时怎么办？

**A:**

```typescript
// 单个测试增加超时
test(
  "slow operation",
  async () => {
    // 测试代码
  },
  { timeout: 30000 },
) // 30秒

// 或全局设置
// 在测试文件顶部
import { beforeAll } from "bun:test"
beforeAll(
  () => {
    // 全局设置
  },
  { timeout: 60000 },
)
```

### Q: 如何 Mock 外部依赖？

**A:**

```typescript
// 不推荐 Mock，但如果必须：
import { mock, spyOn } from "bun:test"

// Mock 模块
mock.module("./external-api", () => ({
  fetchData: () => Promise.resolve({ result: "mocked" }),
}))

// Spy 函数
const spy = spyOn(object, "method")
expect(spy).toHaveBeenCalled()
```

### Q: 测试中有异步代码未等待？

**A:**

```typescript
// ❌ 错误
async execute(params) {
  setTimeout(() => doSomething(), 1000)
  return result
}

// ✅ 正确
async execute(params) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  await doSomething()
  return result
}

// 测试时确保等待
await expect(tool.execute(params, ctx)).resolves.toBe(expected)
```

---

## 工具开发

### Q: 如何调试工具执行过程？

**A:**

```typescript
async execute(params, ctx) {
  // 方法 1: 打印日志
  console.log("[DEBUG] 参数:", params)
  console.log("[DEBUG] 上下文:", ctx.sessionID)

  // 方法 2: 使用 debugger
  debugger  // 会在这里断点

  // 方法 3: 打印调用栈
  console.trace("执行工具")

  const result = await doWork()
  console.log("[DEBUG] 结果:", result)

  return result
}
```

### Q: ctx.ask 没有弹出确认？

**A:**

```typescript
// 检查是否 await
await ctx.ask({
  permission: "file_write",
  files: [params.path],
}) // ✅ 必须有 await

// 检查权限类型是否正确
await ctx.ask({
  permission: "file_write", // ✅ 正确
  // permission: "write_file"  // ❌ 错误
})

// 检查是否在测试环境
test("should ask", async () => {
  let asked = false
  const ctx = {
    ...mockCtx,
    ask: async () => {
      asked = true
    }, // 测试环境需要 mock
  }
})
```

### Q: 工具返回了错误，如何排查？

**A:**

```typescript
async execute(params, ctx) {
  try {
    const result = await riskyOperation()
    return result
  } catch (err) {
    // 1. 打印完整错误
    console.error("工具执行错误:", err)
    console.error("错误堆栈:", err.stack)

    // 2. 返回友好的错误信息
    return {
      title: "操作失败",
      output: `错误: ${err.message}\n\n建议:\n1. 检查 XXX\n2. 重试`,
      metadata: {
        error: err.message,
        stack: err.stack
      }
    }
  }
}
```

### Q: 如何让 AI 更好地使用我的工具？

**A:**

1. **优化描述**

```typescript
description: `
  清晰说明工具用途。
  使用场景：什么时候调用。
  参数说明：每个参数的用途。
  返回格式：返回什么内容。
  示例：提供 1-2 个使用示例。
`
```

2. **参数命名清晰**

```typescript
parameters: z.object({
  file_path: z.string().describe("文件的绝对路径"),
  // ❌ path: z.string()  // 太模糊
})
```

3. **提供示例**

```typescript
description: `
  示例 1:
  - 参数: { "pattern": "TODO", "path": "./src" }
  - 用途: 查找所有 TODO 注释
  
  示例 2:
  - 参数: { "pattern": "function ", "include": "*.ts" }
  - 用途: 查找所有函数定义
`
```

---

## 会话管理

### Q: 会话数据存储在哪里？

**A:**

```bash
# macOS
ls ~/Library/Application\ Support/opencode/sessions/

# Linux
ls ~/.config/opencode/sessions/

# Windows
ls %APPDATA%/opencode/sessions/
```

### Q: 如何查看会话内容？

**A:**

```bash
# 找到会话 ID
cd packages/opencode
bun run src/index.ts session list

# 查看会话内容
cat ~/.config/opencode/sessions/[session-id].json

# 或用 jq 格式化
cat session.json | jq '.'
```

### Q: 会话压缩是什么意思？

**A:**

```
未压缩会话：
用户：你好
AI：你好！有什么可以帮你的？
用户：帮我搜索代码
AI：好的，我帮你搜索
[调用工具 grep]
用户：再看看这个文件
AI：好的
...

压缩后：
[早期对话摘要]
用户最近询问关于 XXX 的问题...

用户：再看看这个文件
AI：好的
```

压缩保留上下文但减少 token 消耗。

---

## AI 提供商

### Q: 如何添加新的 AI 提供商？

**A:**

```typescript
// 1. 创建 provider 文件
// packages/opencode/src/provider/my-provider.ts

import { Provider } from "./provider"

export class MyProvider implements Provider {
  async chat(options) {
    // 调用你的 AI API
    const response = await fetch("https://api.example.com/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        messages: options.messages,
        model: options.model,
      }),
    })

    return {
      content: await response.text(),
      usage: { prompt: 100, completion: 50 },
    }
  }
}
```

### Q: 流式响应如何处理？

**A:**

```typescript
async *chatStream(options) {
  const response = await fetch(url, {
    headers: { "Accept": "text/event-stream" }
  })

  const reader = response.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // 解析 SSE 数据
    const chunk = parseChunk(value)
    yield chunk
  }
}
```

### Q: API Key 应该放在哪里？

**A:**

```bash
# 1. 环境变量（推荐）
export OPENAI_API_KEY="sk-..."

# 2. 配置文件
# ~/.config/opencode/config.json
{
  "providers": {
    "openai": {
      "apiKey": "sk-..."
    }
  }
}

# 3. 代码中（不推荐，仅测试）
const apiKey = process.env.OPENAI_API_KEY
```

---

## 前端开发

### Q: 前端无法连接到后端？

**A:**

```bash
# 1. 确保后端已启动
cd packages/opencode
bun run --conditions=browser ./src/index.ts serve --port 4096

# 2. 检查前端配置
# packages/app/src/config.ts
const API_URL = "http://localhost:4096"  // 确保端口正确

# 3. 检查 CORS
# 后端应该允许前端域名
```

### Q: SolidJS 的 Signal 和 Store 如何选择？

**A:**

```typescript
// Signal - 简单状态
const [count, setCount] = createSignal(0)

// Store - 复杂对象
const [state, setState] = createStore({
  user: { name: "", email: "" },
  messages: [],
})

// 使用建议：
// - 单个值用 Signal
// - 对象/数组用 Store
// - 深层嵌套对象用 Store
```

### Q: 组件不更新怎么办？

**A:**

```typescript
// ❌ 错误：直接修改
const [items, setItems] = createSignal([])
items().push(newItem) // 不会触发更新！

// ✅ 正确：创建新数组
setItems([...items(), newItem])

// 或使用 Store
const [state, setState] = createStore({ items: [] })
setState("items", (items) => [...items, newItem])
```

---

## 性能优化

### Q: 工具执行太慢，如何优化？

**A:**

```typescript
// 1. 并行处理
const results = await Promise.all(files.map((f) => processFile(f)))

// 2. 流式处理大文件
const proc = Bun.spawn(["cat", "large-file"])
for await (const chunk of proc.stdout) {
  processChunk(chunk)
}

// 3. 缓存结果
const cache = new Map()
async function getData(key) {
  if (cache.has(key)) return cache.get(key)
  const data = await fetchData(key)
  cache.set(key, data)
  return data
}

// 4. 限制并发
import { pLimit } from "p-limit"
const limit = pLimit(5) // 最多 5 个并发
const results = await Promise.all(items.map((item) => limit(() => process(item))))
```

### Q: 内存占用过高？

**A:**

```typescript
// ❌ 错误：保留所有数据
const allResults = []
for (const file of files) {
  const content = await Bun.file(file).text()
  allResults.push(content) // 全部加载到内存
}

// ✅ 正确：流式处理
for (const file of files) {
  const stream = Bun.file(file).stream()
  for await (const chunk of stream) {
    processChunk(chunk) // 处理完就释放
  }
}
```

---

## 贡献指南

### Q: 如何提交第一个 PR？

**A:**

```bash
# 1. Fork 仓库
# 2. 克隆你的 Fork
git clone https://github.com/YOUR_NAME/opencode.git

# 3. 创建分支
git checkout -b fix/some-bug

# 4. 修改代码
# ...

# 5. 运行检查
bun typecheck
bun test

# 6. 提交
git add .
git commit -m "fix: description"
git push origin fix/some-bug

# 7. 在 GitHub 创建 PR
```

### Q: PR 被拒绝的常见原因？

**A:**

1. **没有通过类型检查** - 运行 `bun typecheck`
2. **测试失败** - 运行 `bun test`
3. **不符合代码规范** - 阅读 `AGENTS.md`
4. **缺少测试** - 新功能需要测试
5. **提交信息不规范** - 使用 `type: description` 格式

### Q: 如何与维护者沟通？

**A:**

1. 先搜索已有 Issue
2. 创建新 Issue 描述问题
3. 在 PR 中引用 Issue
4. 保持礼貌和耐心

---

## 仍然有问题？

1. **查看文档**：[教程中心](../README.md)
2. **搜索 Issue**：[GitHub Issues](https://github.com/anomalyco/opencode/issues)
3. **提问模板**：
   - 环境信息（Bun 版本、操作系统）
   - 复现步骤
   - 期望结果 vs 实际结果
   - 相关代码/错误日志

**祝你学习顺利！** 🚀
