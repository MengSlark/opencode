import { AsyncLocalStorage } from "async_hooks"

interface RequestContext {
  requestId: string
  userId: string
  timestamp: number
}

const requestContext = new AsyncLocalStorage<RequestContext>()

async function simulateAsyncOperation(name: string, ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(name), ms))
}

async function main() {
  // ============================================================
  // 示例 1: 基础使用
  // ============================================================
  console.log("=== 示例 1: 基础使用 ===\n")

  requestContext.run({ requestId: "req-001", userId: "user-123", timestamp: Date.now() }, async () => {
    const ctx = requestContext.getStore()
    console.log("进入上下文:", ctx?.requestId)

    await simulateAsyncOperation("op1", 100)

    // 异步操作后仍然可以获取
    const ctx2 = requestContext.getStore()
    console.log("异步操作后:", ctx2?.requestId)
    console.log("异步操作后:", ctx?.requestId)
  })

  // 外部无法访问
  console.log("外部访问:", requestContext.getStore()) // undefined
  console.log()

  // ============================================================
  // 示例 2: 嵌套上下文
  // ============================================================
  console.log("=== 示例 2: 嵌套上下文 ===\n")

  requestContext.run({ requestId: "req-outer", userId: "user-A", timestamp: 1000 }, async () => {
    console.log("外层:", requestContext.getStore()?.requestId)

    await requestContext.run({ requestId: "req-inner", userId: "user-B", timestamp: 2000 }, async () => {
      console.log("内层:", requestContext.getStore()?.requestId)
    })

    console.log("回到外层:", requestContext.getStore()?.requestId)
  })
  console.log()

  // ============================================================
  // 示例 3: 模拟 Web 请求处理
  // ============================================================
  console.log("=== 示例 3: 模拟 Web 请求 ===\n")

  async function handleRequest(requestId: string) {
    return requestContext.run({ requestId, userId: "user-X", timestamp: Date.now() }, async () => {
      await validateRequest()
      await processBusiness()
      await saveToDatabase()
      return { success: true, requestId }
    })
  }

  async function validateRequest() {
    const ctx = requestContext.getStore()
    console.log("[validate] 处理请求:", ctx?.requestId)
  }

  async function processBusiness() {
    const ctx = requestContext.getStore()
    console.log("[process] 处理请求:", ctx?.requestId)
  }

  async function saveToDatabase() {
    const ctx = requestContext.getStore()
    console.log("[save]   处理请求:", ctx?.requestId)
  }

  await handleRequest("req-100")
  await handleRequest("req-200")
  console.log()

  // ============================================================
  // 示例 4: OpenCode 工具模式
  // ============================================================
  console.log("=== 示例 4: OpenCode 工具模式 ===\n")

  const toolContext = new AsyncLocalStorage<{ directory: string; sessionId: string }>()

  async function toolProvide<R>(directory: string, sessionId: string, fn: () => R) {
    return toolContext.run({ directory, sessionId }, fn)
  }

  async function executeTool(toolName: string) {
    const ctx = toolContext.getStore()
    if (!ctx) throw new Error("No context!")
    console.log(`[${toolName}] 执行于: ${ctx.directory}, session: ${ctx.sessionId}`)
    return { toolName, directory: ctx.directory }
  }

  await toolProvide("/project/a", "session-1", async () => {
    await executeTool("GrepTool")
    await executeTool("ReadTool")
  })

  await toolProvide("/project/b", "session-2", async () => {
    await executeTool("WriteTool")
  })

  console.log("\n=== 完成 ===")
}

main().catch(console.error)
