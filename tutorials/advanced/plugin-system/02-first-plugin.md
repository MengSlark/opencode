# 开发第一个插件

> 🎯 难度：中级 | ⏱️ 预计时间：3-5 天 | 📦 目标：完成一个完整插件

本教程带你从零开始开发一个完整的 OpenCode 插件。

---

## 1. 项目初始化

### 1.1 创建插件目录

```bash
mkdir opencode-plugin-myplugin
cd opencode-plugin-myplugin
```

### 1.2 初始化项目

```bash
bun init

# 安装依赖
bun add @opencode-ai/plugin zod
bun add -d typescript @types/bun
```

### 1.3 项目结构

```
opencode-plugin-myplugin/
├── src/
│   ├── index.ts           # 插件入口
│   ├── tools/             # 工具
│   │   └── my-tool.ts
│   └── commands/          # 命令
│       └── my-command.ts
├── package.json           # 包信息
├── plugin.json            # 插件配置
└── tsconfig.json          # TypeScript 配置
```

---

## 2. 编写插件代码

### 2.1 插件清单

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My first OpenCode plugin",
  "author": "Your Name",
  "main": "./dist/index.js",
  "entry": "./src/index.ts",
  "opencode": {
    "version": ">=1.0.0"
  },
  "permissions": ["file:read"],
  "contributions": {
    "tools": [
      {
        "name": "word_count",
        "entry": "./src/tools/word-count.ts"
      }
    ],
    "commands": [
      {
        "command": "my-plugin.hello",
        "title": "Say Hello",
        "category": "My Plugin"
      }
    ]
  }
}
```

### 2.2 插件入口

```typescript
// src/index.ts
import { Plugin, PluginContext } from "@opencode-ai/plugin"
import { WordCountTool } from "./tools/word-count"

export default class MyPlugin implements Plugin {
  name = "my-plugin"
  version = "1.0.0"

  async activate(context: PluginContext): Promise<void> {
    console.log("MyPlugin activated!")

    // 注册工具
    context.tools.register(WordCountTool)

    // 注册命令
    context.commands.register({
      id: "my-plugin.hello",
      handler: () => {
        context.ui.showMessage("Hello from MyPlugin!", "info")
      },
    })

    // 注册事件监听
    context.events.on("session.created", (session) => {
      console.log(`Session created: ${session.id}`)
    })
  }

  async deactivate(): Promise<void> {
    console.log("MyPlugin deactivated!")
  }
}
```

### 2.3 开发工具

```typescript
// src/tools/word-count.ts
import { Tool } from "@opencode-ai/plugin"
import z from "zod"

export const WordCountTool = Tool.define("word_count", {
  description: `
    统计文件的字数、行数和字符数。
    
    使用场景：
    - 统计文档大小
    - 检查代码文件规模
    
    参数：
    - path: 文件路径
  `,

  parameters: z.object({
    path: z.string().describe("文件路径"),
  }),

  async execute(params, ctx) {
    // 读取文件
    const content = await Bun.file(params.path).text()

    // 统计
    const lines = content.split("\n").length
    const words = content.split(/\s+/).filter((w) => w.length > 0).length
    const chars = content.length
    const charsNoSpace = content.replace(/\s/g, "").length

    // 返回结果
    return {
      title: "Word Count",
      output: `
📊 文件统计：${params.path}

📝 行数：${lines}
🔤 单词数：${words}
🔣 字符数（含空格）：${chars}
🔡 字符数（不含空格）：${charsNoSpace}
      `.trim(),
      metadata: {
        lines,
        words,
        chars,
        charsNoSpace,
      },
    }
  },
})
```

### 2.4 开发命令

```typescript
// src/commands/hello.ts
import { Command } from "@opencode-ai/plugin"

export const HelloCommand: Command = {
  id: "my-plugin.hello",
  title: "Say Hello",
  category: "My Plugin",

  async execute(context) {
    const name = await context.ui.showInputBox({
      prompt: "What's your name?",
      placeHolder: "Enter your name",
    })

    if (name) {
      context.ui.showMessage(`Hello, ${name}!`, "info")
    }
  },
}
```

---

## 3. 构建和打包

### 3.1 构建配置

```json
{
  "name": "opencode-plugin-myplugin",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "package": "bun run build && npm pack"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/bun": "latest"
  },
  "dependencies": {
    "@opencode-ai/plugin": "latest",
    "zod": "^3.0.0"
  }
}
```

### 3.2 TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 构建

```bash
# 编译
bun run build

# 打包
bun run package

# 会生成 opencode-plugin-myplugin-1.0.0.tgz
```

---

## 4. 测试插件

### 4.1 本地测试

```bash
# 1. 进入 OpenCode 目录
cd /path/to/opencode

# 2. 安装本地插件
bun run src/index.ts plugin install /path/to/opencode-plugin-myplugin

# 3. 验证安装
bun run src/index.ts plugin list

# 4. 测试工具
# 在会话中输入："统计 README.md 的字数"

# 5. 测试命令
# 按 Cmd+Shift+P，搜索 "Say Hello"
```

### 4.2 单元测试

```typescript
// src/tools/word-count.test.ts
import { describe, expect, test } from "bun:test"
import { WordCountTool } from "./word-count"

describe("word_count tool", () => {
  const mockCtx = {
    sessionID: "test",
    ask: async () => {},
    metadata: () => {},
  }

  test("counts words correctly", async () => {
    // 创建临时文件
    const tmpFile = "/tmp/test.txt"
    await Bun.write(tmpFile, "Hello world\nThis is a test")

    const tool = await WordCountTool.init()
    const result = await tool.execute({ path: tmpFile }, mockCtx)

    expect(result.metadata.words).toBe(6)
    expect(result.metadata.lines).toBe(2)
  })
})
```

---

## 5. 发布插件

### 5.1 发布到 npm

```bash
# 1. 登录 npm
npm login

# 2. 发布
npm publish

# 3. 验证
npm view opencode-plugin-myplugin
```

### 5.2 发布到 GitHub

```bash
# 1. 创建 GitHub 仓库
# 2. 推送代码
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/opencode-plugin-myplugin.git
git push -u origin main

# 3. 创建 Release
# 在 GitHub 上创建 Release，上传 tgz 文件
```

---

## 6. 高级功能（可选）

### 6.1 添加配置

```typescript
// src/config.ts
export interface MyPluginConfig {
  defaultLanguage: string
  maxFileSize: number
}

export const defaultConfig: MyPluginConfig = {
  defaultLanguage: "zh",
  maxFileSize: 1024 * 1024  // 1MB
}

// 在 activate 中使用
async activate(context: PluginContext) {
  const config = context.config.get<MyPluginConfig>("my-plugin")
    ?? defaultConfig

  // 使用配置
  console.log("Default language:", config.defaultLanguage)
}
```

### 6.2 添加存储

```typescript
// 保存数据
await context.storage.set("my-plugin.history", [{ date: new Date(), action: "word_count" }])

// 读取数据
const history = await context.storage.get("my-plugin.history")
```

---

## 7. 检查清单

- [ ] 插件清单完整
- [ ] 至少实现一个工具或命令
- [ ] 代码通过类型检查
- [ ] 有基本测试
- [ ] 本地测试通过
- [ ] 有 README 文档
- [ ] 选择发布渠道

---

**恭喜！你完成了第一个插件开发！** 🎉
