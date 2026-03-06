import { Tool } from "./tool"
import DESCRIPTION from "./task.txt"
import z from "zod"
import { Session } from "../session"
import { MessageV2 } from "../session/message-v2"
import { Identifier } from "../id/id"
import { Agent } from "../agent/agent"
import { SessionPrompt } from "../session/prompt"
import { iife } from "@/util/iife"
import { defer } from "@/util/defer"
import { Config } from "../config/config"
import { PermissionNext } from "@/permission/next"

/**
 * Task 工具 — 设计说明与流程
 *
 * ## 设计思路
 *
 * Task 工具用于在主会话中「派发子任务」：在**子 session**（parentID = 当前 sessionID）中
 * 以指定 subagent 执行一段 prompt，执行完毕后把子会话的最终文本结果返回给主会话的 assistant。
 *
 * 核心点：
 * - **子 session 隔离**：子任务拥有独立 session，权限可单独配置（默认禁止 todowrite/todoread，
 *   且若 subagent 自身无 task 权限则禁止再调 task，避免无限嵌套）。
 * - **可恢复**：调用方传入 task_id 时复用已有 session，继续该子会话的历史与上下文。
 * - **权限**：主会话调用 task 时需通过 ctx.ask("task", subagent_type)；若由用户 @agent 或
 *   命令触发的 subtask，prompt 层会设 bypassAgentCheck，此处不再 ask。
 *
 * ## 关键流程
 *
 * 1. **定义阶段**（Tool.define）：根据当前可用的非 primary agent 列表（并按 caller 的 task 权限过滤）
 *    生成描述文本，替换 task.txt 中的 {agents}。
 *
 * 2. **执行阶段**（execute）：
 *    - 可选权限询问（bypassAgentCheck 时跳过）→ 解析 subagent → 解析/创建 session（task_id 复用或新建）；
 *    - 新建 session 时写入默认 permission（禁止 todo、按需禁止 task、允许 experimental primary_tools）；
 *    - 取当前 assistant 消息、解析 model → 写 tool part metadata（title、sessionId、model）；
 *    - 注册主 session 的 abort 到子 session 的 cancel，保证取消联动；
 *    - resolvePromptParts(prompt) → SessionPrompt.prompt(子 session, agent, parts, tools 限制)；
 *    - 从返回的 result 中取最后一条 text part，格式化为带 task_id 与 <task_result> 的 output 返回。
 *
 * ## 数据结构
 *
 * - **parameters**: description, prompt, subagent_type, task_id?, command?
 * - **子 session permission**: todowrite/todoread deny；无 task 权限的 agent 则 task deny；
 *   experimental.primary_tools 中工具 allow。
 * - **返回**: { title, metadata: { sessionId, model }, output }，output 含 task_id 行与 <task_result> 包裹的文本。
 */

const parameters = z.object({
  description: z.string().describe("任务的简短描述（3–5 个词）"),
  prompt: z.string().describe("要由智能体执行的任务内容"),
  subagent_type: z.string().describe("要使用的专项智能体类型"),
  task_id: z
    .string()
    .describe(
      "仅在要恢复之前的任务时填写（传入之前的 task_id 可继续同一子会话，而不是新建）",
    )
    .optional(),
  command: z.string().describe("触发该任务的命令").optional(),
})

export const TaskTool = Tool.define("task", async (ctx) => {
  const agents = await Agent.list().then((x) => x.filter((a) => a.mode !== "primary"))

  const caller = ctx?.agent
  // 若有 caller，只保留其 task 权限允许的 agent，用于描述中的 {agents} 列表
  const accessibleAgents = caller
    ? agents.filter((a) => PermissionNext.evaluate("task", a.name, caller.permission).action !== "deny")
    : agents

  const description = DESCRIPTION.replace(
    "{agents}",
    accessibleAgents
      .map((a) => `- ${a.name}: ${a.description ?? "该子智能体仅应由用户手动调用。"}`)
      .join("\n"),
  )
  return {
    description,
    parameters,
    async execute(params: z.infer<typeof parameters>, ctx) {
      const config = await Config.get()

      // 用户通过 @agent 或命令触发的 subtask 会设 bypassAgentCheck，此处不再询问权限
      if (!ctx.extra?.bypassAgentCheck) {
        await ctx.ask({
          permission: "task",
          patterns: [params.subagent_type],
          always: ["*"],
          metadata: {
            description: params.description,
            subagent_type: params.subagent_type,
          },
        })
      }

      const agent = await Agent.get(params.subagent_type)
      if (!agent) throw new Error(`Unknown agent type: ${params.subagent_type} is not a valid agent type`)

      const hasTaskPermission = agent.permission.some((rule) => rule.permission === "task")

      const session = await iife(async () => {
        if (params.task_id) {
          const found = await Session.get(params.task_id).catch(() => {})
          if (found) return found
        }

        return await Session.create({
          // 子 session：parentID 指向当前主 session；默认禁止 todo，无 task 权限的 agent 禁止再调 task
          parentID: ctx.sessionID,
          title: params.description + ` (@${agent.name} subagent)`,
          permission: [
            {
              permission: "todowrite",
              pattern: "*",
              action: "deny",
            },
            {
              permission: "todoread",
              pattern: "*",
              action: "deny",
            },
            ...(hasTaskPermission
              ? []
              : [
                  {
                    permission: "task" as const,
                    pattern: "*" as const,
                    action: "deny" as const,
                  },
                ]),
            ...(config.experimental?.primary_tools?.map((t) => ({
              // 实验：允许子会话使用 primary_tools 中的工具
              pattern: "*",
              action: "allow" as const,
              permission: t,
            })) ?? []),
          ],
        })
      })
      const msg = await MessageV2.get({ sessionID: ctx.sessionID, messageID: ctx.messageID })
      if (msg.info.role !== "assistant") throw new Error("Not an assistant message")

      const model = agent.model ?? {
        modelID: msg.info.modelID,
        providerID: msg.info.providerID,
      }

      ctx.metadata({
        // 写回 tool part 的 title 与 metadata，便于 UI 展示子 session 与模型
        title: params.description,
        metadata: {
          sessionId: session.id,
          model,
        },
      })

      const messageID = Identifier.ascending("message")

      function cancel() {
        SessionPrompt.cancel(session.id)
      }
      ctx.abort.addEventListener("abort", cancel)
      using _ = defer(() => ctx.abort.removeEventListener("abort", cancel))
      const promptParts = await SessionPrompt.resolvePromptParts(params.prompt)
      // 将 prompt 中的文件引用等解析为 parts，再在子 session 中跑完整推理循环

      const result = await SessionPrompt.prompt({
        // 在子 session 中执行：禁用 todo、无 task 权限时禁用 task、禁用 experimental primary_tools
        messageID,
        sessionID: session.id,
        model: {
          modelID: model.modelID,
          providerID: model.providerID,
        },
        agent: agent.name,
        tools: {
          todowrite: false,
          todoread: false,
          ...(hasTaskPermission ? {} : { task: false }),
          ...Object.fromEntries((config.experimental?.primary_tools ?? []).map((t) => [t, false])),
        },
        parts: promptParts,
      })

      const text = result.parts.findLast((x) => x.type === "text")?.text ?? ""

      const output = [
        `task_id: ${session.id} (for resuming to continue this task if needed)`,
        "",
        "<task_result>",
        text,
        "</task_result>",
      ].join("\n")

      return {
        // 主会话侧可见：title、sessionId/model、以及带 task_id 与 <task_result> 的 output
        title: params.description,
        metadata: {
          sessionId: session.id,
          model,
        },
        output,
      }
    },
  }
})
