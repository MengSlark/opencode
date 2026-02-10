# 快速参考手册

> 📖 速查手册 | 适合已学习的开发者快速回顾

---

## 常用命令速查

### 环境搭建

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 克隆项目
git clone https://github.com/anomalyco/opencode.git
cd opencode

# 安装依赖
bun install

# 验证环境
bun typecheck
bun turbo test
```

### 开发命令

```bash
# 类型检查
bun turbo typecheck          # 所有包
bun typecheck                # 单个包

# 测试
bun turbo test               # 所有测试
bun test                     # 当前包测试
bun test path/to/test.ts     # 单个测试文件
bun test -t "test name"      # 单个测试用例

# 构建
bun turbo build              # 所有包
bun run build                # 单个包

# 开发服务器
bun dev                      # 启动 CLI
cd packages/app && bun dev   # 启动 Web UI
```

### Git 工作流

```bash
# 默认分支是 dev
git checkout dev
git pull origin dev

# 创建功能分支
git checkout -b feature/my-feature

# 提交代码
git add .
git commit -m "feat: description"
git push origin feature/my-feature
```

---

## 代码规范速查

### 命名规范

```typescript
// 变量/函数 - 单个小写单词
const count = 1
function process() {}

// 类/接口 - PascalCase
class MyClass {}
interface MyInterface {}

// 常量 - 大写下划线
const MAX_SIZE = 100

// 工具名 - 小写下划线
Tool.define("my_tool", ...)
```

### 代码风格

```typescript
// ✅ 提前返回
function foo() {
  if (!valid) return null
  return result
}

// ✅ 使用 const
const value = condition ? 1 : 2

// ✅ 点号访问
obj.property

// ✅ 函数式方法
items.filter(isValid).map(transform)
```

---

## 工具开发模板

### 基础模板

```typescript
import z from "zod"
import { Tool } from "./tool"

export const MyTool = Tool.define("my_tool", {
  description: `工具描述`,

  parameters: z.object({
    param: z.string().describe("参数说明"),
  }),

  async execute(params, ctx) {
    // 请求权限
    await ctx.ask({
      permission: "file_read",
      files: [params.path],
    })

    // 执行逻辑
    const result = await doSomething()

    return {
      title: "结果标题",
      output: "人类可读输出",
      metadata: { key: value },
    }
  },
})
```

### 测试模板

```typescript
import { describe, expect, test } from "bun:test"
import { MyTool } from "../../src/tool/my-tool"

const mockCtx = {
  sessionID: "test",
  messageID: "",
  callID: "",
  agent: "test",
  abort: AbortSignal.any([]),
  ask: async () => {},
  metadata: () => {},
}

describe("tool.my_tool", () => {
  test("basic test", async () => {
    const tool = await MyTool.init()
    const result = await tool.execute(
      {
        param: "value",
      },
      mockCtx,
    )

    expect(result.output).toBe("expected")
  })
})
```

---

## Zod Schema 速查

### 基础类型

```typescript
z.string() // 字符串
z.number() // 数字
z.boolean() // 布尔值
z.date() // 日期
z.literal("value") // 字面量
```

### 修饰符

```typescript
z.string().optional() // 可选
z.string().default("x") // 默认值
z.string().nullable() // 可 null
z.string().describe("说明") // 描述
```

### 复杂类型

```typescript
z.array(z.string()) // 数组
z.object({ name: z.string() }) // 对象
z.enum(["a", "b"]) // 枚举
z.union([z.string(), z.number()]) // 联合类型
```

### 验证

```typescript
z.string().min(5) // 最小长度
z.string().max(100) // 最大长度
z.string().email() // 邮箱格式
z.number().int() // 整数
z.number().positive() // 正数
```

---

## 常用 API 速查

### Bun API

```typescript
// 文件操作
const file = Bun.file("/path/to/file")
const content = await file.text()
await file.write("content")

// 执行命令
const proc = Bun.spawn(["ls", "-la"])
const output = await new Response(proc.stdout).text()

// 环境变量
Bun.env.VAR_NAME

// 路径
Bun.main // 入口文件路径
```

### 工具上下文

```typescript
// 请求权限
await ctx.ask({
  permission: "file_write",
  files: ["/path"],
  message: "提示信息",
})

// 检查取消
if (ctx.abort.aborted) {
  throw new Error("Cancelled")
}

// 记录元数据
ctx.metadata({ key: value })
```

---

## 项目结构速查

```
packages/
├── opencode/              # 核心
│   ├── src/
│   │   ├── tool/          # 工具系统
│   │   ├── server/        # HTTP/WebSocket
│   │   ├── session/       # 会话管理
│   │   ├── provider/      # AI 提供商
│   │   └── agent/         # Agent 逻辑
│   └── test/
├── app/                   # Web UI
│   ├── src/
│   │   ├── pages/         # 页面
│   │   ├── components/    # 组件
│   │   └── context/       # 状态
├── sdk/js/                # JavaScript SDK
└── util/                  # 工具函数
```

---

## 调试技巧速查

### 添加日志

```typescript
console.log("[DEBUG]", variable)
console.log("[Tool] 参数:", params)
console.trace("调用栈")
```

### 断点调试

```bash
# 启动调试
bun --inspect run src/index.ts

# 调试测试
bun --inspect test test/tool/grep.test.ts

# 然后在 Chrome 打开 chrome://inspect
```

### 查看运行时信息

```typescript
// 查看所有工具
import { registry } from "./tool/registry"
console.log(registry.list())

// 查看会话
console.log(session.messages)

// 查看 Provider 响应
console.log(JSON.stringify(response, null, 2))
```

---

## 常见错误及解决

### Error: Cannot find module

```bash
# 解决：重新安装依赖
rm -rf node_modules bun.lockb
bun install
```

### Error: Type check failed

```bash
# 解决：查看具体错误
bun typecheck 2>&1 | head -50
```

### Error: Test timeout

```typescript
// 解决：增加超时时间
test(
  "slow test",
  async () => {
    // 测试代码
  },
  { timeout: 30000 },
)
```

### Error: Permission denied

```typescript
// 解决：确保调用 ctx.ask
await ctx.ask({
  permission: "file_write",
  files: [path],
})
```

---

## 性能优化速查

### 避免阻塞

```typescript
// ❌ 阻塞
const results = []
for (const file of files) {
  results.push(await process(file))
}

// ✅ 并行
const results = await Promise.all(files.map((f) => process(f)))
```

### 缓存结果

```typescript
const cache = new Map()

async function getData(key) {
  if (cache.has(key)) {
    return cache.get(key)
  }
  const data = await fetchData(key)
  cache.set(key, data)
  return data
}
```

### 流式处理

```typescript
// 大文件使用流
const proc = Bun.spawn(["cat", "large-file.txt"])
for await (const chunk of proc.stdout) {
  processChunk(chunk)
}
```

---

## 扩展阅读

- [工具系统基础](../core-modules/tool-system/01-tool-basics.md)
- [会话管理](../core-modules/session-management/01-session-lifecycle.md)
- [AI 提供商](../core-modules/ai-providers/01-provider-architecture.md)
- [AGENTS.md](../../AGENTS.md) - 代码规范

---

**保存本页为书签，随时查阅！** 📌
