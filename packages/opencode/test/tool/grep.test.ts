import { describe, expect, test } from "bun:test"
import path from "path"
import { GrepTool } from "../../src/tool/grep"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

// 创建测试上下文对象，模拟工具执行环境
const ctx = {
  sessionID: "test", // 测试会话ID
  messageID: "", // 消息ID
  callID: "", // 调用ID
  agent: "build", // 代理类型
  abort: AbortSignal.any([]), // 中止信号
  messages: [], // 消息数组
  metadata: () => {}, // 元数据函数
  ask: async () => {}, // 异步询问函数
}

// 获取项目根目录路径，用于测试文件搜索
const projectRoot = path.join(__dirname, "../..")

describe("tool.grep", () => {
  test("basic search", async () => {
    // 测试基本的文本搜索功能
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        // 初始化Grep工具实例
        const grep = await GrepTool.init()
        // 执行搜索：在src/tool目录下搜索包含"export"的TypeScript文件
        const result = await grep.execute(
          {
            pattern: "export", // 搜索模式
            path: path.join(projectRoot, "src/tool"), // 搜索路径
            include: "*.ts", // 文件类型过滤
          },
          ctx,
        )
        // 验证搜索结果：应该找到匹配项
        expect(result.metadata.matches).toBeGreaterThan(0)
        // 验证输出格式：包含"Found"关键字
        expect(result.output).toContain("Found")
      },
    })
  })

  test("no matches returns correct output", async () => {
    // 测试搜索不存在模式时的行为
    await using tmp = await tmpdir({
      init: async (dir) => {
        // 创建测试文件，内容为"hello world"
        await Bun.write(path.join(dir, "test.txt"), "hello world")
      },
    })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const grep = await GrepTool.init()
        // 搜索一个肯定不存在的模式
        const result = await grep.execute(
          {
            pattern: "xyznonexistentpatternxyz123", // 不存在的搜索模式
            path: tmp.path, // 搜索路径
          },
          ctx,
        )
        // 验证没有找到匹配项
        expect(result.metadata.matches).toBe(0)
        // 验证返回了"未找到文件"的消息
        expect(result.output).toBe("No files found")
      },
    })
  })

  test("handles CRLF line endings in output", async () => {
    // 测试处理不同行结束符的能力（\n和\r\n）
    await using tmp = await tmpdir({
      init: async (dir) => {
        // 创建包含Unix行结束符的测试文件
        await Bun.write(path.join(dir, "test.txt"), "line1\nline2\nline3")
      },
    })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const grep = await GrepTool.init()
        // 搜索包含"line"的内容
        const result = await grep.execute(
          {
            pattern: "line", // 搜索模式
            path: tmp.path, // 搜索路径
          },
          ctx,
        )
        // 验证能正确找到匹配项，说明行结束符处理正常
        expect(result.metadata.matches).toBeGreaterThan(0)
      },
    })
  })
})

describe("CRLF regex handling", () => {
  // 测试正则表达式处理不同行结束符的能力

  test("regex correctly splits Unix line endings", () => {
    // 测试Unix行结束符（\n）的正确分割
    const unixOutput = "file1.txt|1|content1\nfile2.txt|2|content2\nfile3.txt|3|content3"
    // 使用正则表达式分割行，支持\r?\n模式
    const lines = unixOutput.trim().split(/\r?\n/)
    expect(lines.length).toBe(3)
    expect(lines[0]).toBe("file1.txt|1|content1")
    expect(lines[2]).toBe("file3.txt|3|content3")
  })

  test("regex correctly splits Windows CRLF line endings", () => {
    // 测试Windows行结束符（\r\n）的正确分割
    const windowsOutput = "file1.txt|1|content1\r\nfile2.txt|2|content2\r\nfile3.txt|3|content3"
    const lines = windowsOutput.trim().split(/\r?\n/)
    expect(lines.length).toBe(3)
    expect(lines[0]).toBe("file1.txt|1|content1")
    expect(lines[2]).toBe("file3.txt|3|content3")
  })

  test("regex handles mixed line endings", () => {
    // 测试混合行结束符的处理能力
    const mixedOutput = "file1.txt|1|content1\nfile2.txt|2|content2\r\nfile3.txt|3|content3"
    const lines = mixedOutput.trim().split(/\r?\n/)
    expect(lines.length).toBe(3)
  })
})
