import { Installation } from "@/installation"
import { Provider } from "@/provider/provider"
import { Log } from "@/util/log"
import {
  streamText,
  wrapLanguageModel,
  type ModelMessage,
  type StreamTextResult,
  type Tool,
  type ToolSet,
  tool,
  jsonSchema,
} from "ai"
import { clone, mergeDeep, pipe } from "remeda"
import { ProviderTransform } from "@/provider/transform"
import { Config } from "@/config/config"
import { Instance } from "@/project/instance"
import type { Agent } from "@/agent/agent"
import type { MessageV2 } from "./message-v2"
import { Plugin } from "@/plugin"
import { SystemPrompt } from "./system"
import { Flag } from "@/flag/flag"
import { PermissionNext } from "@/permission/next"
import { Auth } from "@/auth"

/**
 * llm.ts — 大模型调用封装
 *
 * 本文件是「调大模型、拿流式结果」的统一入口。主对话、生成标题、摘要等都通过 LLM.stream() 完成。
 *
 * 流程：准备 system → 拉取 Provider/鉴权/配置 → 拼参数 → 按权限过滤工具 → 调用 streamText() 返回流。
 *
 * TS：namespace 把一组东西包在一起；type 定义形状；async 表示异步，可用 await。
 */
export namespace LLM {
  const log = Log.create({ service: "llm" })

  /** 单次回复最大输出 token 数，默认 32000，可被实验开关覆盖 */
  export const OUTPUT_TOKEN_MAX = Flag.OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX || 32_000

  /**
   * stream 的入参类型。带 ? 的为可选；Record<string, Tool> = 对象，键为字符串、值为 Tool。
   */
  export type StreamInput = {
    user: MessageV2.User
    sessionID: string
    model: Provider.Model
    agent: Agent.Info
    system: string[]
    abort: AbortSignal
    messages: ModelMessage[]
    small?: boolean
    tools: Record<string, Tool>
    retries?: number
  }

  /** stream 的返回值类型（AI SDK 的流式结果） */
  export type StreamOutput = StreamTextResult<ToolSet, unknown>

  /**
   * 核心函数：发起一次流式调用。async 表示异步，调用时用 await LLM.stream(...)。
   */
  export async function stream(input: StreamInput) {
    // 带上下文的 logger，方便在日志里区分 session、model 等；?? 表示左侧为 null/undefined 时用右侧值
    const l = log
      .clone()
      .tag("providerID", input.model.providerID)
      .tag("modelID", input.model.id)
      .tag("sessionID", input.sessionID)
      .tag("small", (input.small ?? false).toString())
      .tag("agent", input.agent.name)
      .tag("mode", input.agent.mode)
    l.info("stream", {
      modelID: input.model.id,
      providerID: input.model.providerID,
    })
    // 并行拉取：语言模型实例、全局配置、Provider 配置、鉴权信息。解构赋值把数组按顺序赋给变量
    const [language, cfg, provider, auth] = await Promise.all([
      Provider.getLanguage(input.model),
      Config.get(),
      Provider.getProvider(input.model.providerID),
      Auth.get(input.model.providerID),
    ])
    const isCodex = provider.id === "openai" && auth?.type === "oauth"

    // 拼 system 文案：优先 agent 自己的 prompt，否则用 provider 默认（Codex 用 OAuth 时走 instructions 不在这里加）
    const system = []
    system.push(
      [
        ...(input.agent.prompt ? [input.agent.prompt] : isCodex ? [] : SystemPrompt.provider(input.model)),
        ...input.system,
        ...(input.user.system ? [input.user.system] : []),
      ]
        .filter((x) => x)
        .join("\n"),
    )

    const header = system[0]
    const original = clone(system)
    // 插件可修改 system 数组（例如注入额外说明）
    await Plugin.trigger(
      "experimental.chat.system.transform",
      { sessionID: input.sessionID, model: input.model },
      { system },
    )
    if (system.length === 0) {
      system.push(...original)
    }
    // 若插件只往后面追加、第一段没变，合并成两段以便部分 API 做缓存
    if (system.length > 2 && system[0] === header) {
      const rest = system.slice(1)
      system.length = 0
      system.push(header, rest.join("\n"))
    }

    // 模型变体（如「推理模式」）的额外参数；small 为 true 时用精简选项（如生成标题）
    const variant =
      !input.small && input.model.variants && input.user.variant ? input.model.variants[input.user.variant] : {}
    const base = input.small
      ? ProviderTransform.smallOptions(input.model)
      : ProviderTransform.options({
          model: input.model,
          sessionID: input.sessionID,
          providerOptions: provider.options,
        })
    // pipe 从左到右依次合并：基础选项 + 模型选项 + agent 选项 + 变体，后面的覆盖前面的
    const options: Record<string, any> = pipe(
      base,
      mergeDeep(input.model.options),
      mergeDeep(input.agent.options),
      mergeDeep(variant),
    )
    if (isCodex) {
      options.instructions = SystemPrompt.instructions()
    }

    // 插件可修改 temperature、topP、topK、options 等；最终请求参数以 params 为准
    const params = await Plugin.trigger(
      "chat.params",
      {
        sessionID: input.sessionID,
        agent: input.agent,
        model: input.model,
        provider,
        message: input.user,
      },
      {
        temperature: input.model.capabilities.temperature
          ? (input.agent.temperature ?? ProviderTransform.temperature(input.model))
          : undefined,
        topP: input.agent.topP ?? ProviderTransform.topP(input.model),
        topK: ProviderTransform.topK(input.model),
        options,
      },
    )

    // 插件可追加自定义 HTTP 头（鉴权、追踪等）；解构 { headers } 表示从返回值里只要 headers
    const { headers } = await Plugin.trigger(
      "chat.headers",
      {
        sessionID: input.sessionID,
        agent: input.agent,
        model: input.model,
        provider,
        message: input.user,
      },
      { headers: {} },
    )

    // Codex / GitHub Copilot 不设上限；其他模型用配置与 OUTPUT_TOKEN_MAX 算出 maxOutputTokens
    const maxOutputTokens =
      isCodex || provider.id.includes("github-copilot")
        ? undefined
        : ProviderTransform.maxOutputTokens(
            input.model.api.npm,
            params.options,
            input.model.limit.output,
            OUTPUT_TOKEN_MAX,
          )

    // 按 session/agent 权限过滤掉被禁用的工具，得到本次调用实际可用的 tools
    const tools = await resolveTools(input)

    // 部分代理（LiteLLM、部分 Anthropic 代理）要求：历史里若有 tool call，请求里必须带 tools。
    // 若当前没有可用工具但历史里有工具调用，就加一个占位工具 _noop 满足校验。
    const isLiteLLMProxy =
      provider.options?.["litellmProxy"] === true ||
      input.model.providerID.toLowerCase().includes("litellm") ||
      input.model.api.id.toLowerCase().includes("litellm")

    if (isLiteLLMProxy && Object.keys(tools).length === 0 && hasToolCalls(input.messages)) {
      tools["_noop"] = tool({
        description:
          "Placeholder for LiteLLM/Anthropic proxy compatibility - required when message history contains tool calls but no active tools are needed",
        inputSchema: jsonSchema({ type: "object", properties: {} }),
        execute: async () => ({ output: "", title: "", metadata: {} }),
      })
    }

    // 真正发请求：AI SDK 的 streamText，返回流式结果（调用方用 for await 消费）
    return streamText({
      onError(error) {
        l.error("stream error", { error })
      },
      // 工具调用失败时尝试修复：若模型传的是大写工具名而实际是小写，改成小写再试；否则标记为 invalid
      async experimental_repairToolCall(failed) {
        const lower = failed.toolCall.toolName.toLowerCase()
        if (lower !== failed.toolCall.toolName && tools[lower]) {
          l.info("repairing tool call", { tool: failed.toolCall.toolName, repaired: lower })
          return { ...failed.toolCall, toolName: lower }
        }
        return {
          ...failed.toolCall,
          input: JSON.stringify({ tool: failed.toolCall.toolName, error: failed.error.message }),
          toolName: "invalid",
        }
      },
      temperature: params.temperature,
      topP: params.topP,
      topK: params.topK,
      providerOptions: ProviderTransform.providerOptions(input.model, params.options),
      activeTools: Object.keys(tools).filter((x) => x !== "invalid"),
      tools,
      maxOutputTokens,
      abortSignal: input.abort,
      // 请求头：opencode 自建用自定义头；非 anthropic 时加 User-Agent；再合并模型和插件头
      headers: {
        ...(input.model.providerID.startsWith("opencode")
          ? {
              "x-opencode-project": Instance.project.id,
              "x-opencode-session": input.sessionID,
              "x-opencode-request": input.user.id,
              "x-opencode-client": Flag.OPENCODE_CLIENT,
            }
          : input.model.providerID !== "anthropic"
            ? { "User-Agent": `opencode/${Installation.VERSION}` }
            : undefined),
        ...input.model.headers,
        ...headers,
      },
      maxRetries: input.retries ?? 0,
      // 发给模型的 messages：先若干条 system（每段一条），再调用方传的对话历史
      messages: [
        ...system.map((x): ModelMessage => ({ role: "system", content: x })),
        ...input.messages,
      ],
      // wrapLanguageModel 在真正发请求前走一层中间件，这里把 prompt 按模型要求做格式转换
      model: wrapLanguageModel({
        model: language,
        middleware: [
          {
            async transformParams(args) {
              if (args.type === "stream") {
                // @ts-expect-error
                args.params.prompt = ProviderTransform.message(args.params.prompt, input.model, options)
              }
              return args.params
            },
          },
        ],
      }),
      experimental_telemetry: {
        isEnabled: cfg.experimental?.openTelemetry,
        metadata: { userId: cfg.username ?? "unknown", sessionId: input.sessionID },
      },
    })
  }

  /**
   * 按权限过滤工具：user.tools 里显式关掉的、或 agent 权限里禁用的，从 input.tools 里删掉。
   * Pick<StreamInput, "tools" | "agent" | "user"> 表示只取 StreamInput 里这三项，用作入参类型。
   */
  async function resolveTools(input: Pick<StreamInput, "tools" | "agent" | "user">) {
    const disabled = PermissionNext.disabled(Object.keys(input.tools), input.agent.permission)
    for (const tool of Object.keys(input.tools)) {
      if (input.user.tools?.[tool] === false || disabled.has(tool)) {
        delete input.tools[tool]
      }
    }
    return input.tools
  }

  /**
   * 判断历史消息里是否出现过工具调用/结果，用于决定是否要给 LiteLLM 等加占位工具。
   * 遍历每条消息的 content，看是否有 tool-call 或 tool-result 类型的 part。
   */
  export function hasToolCalls(messages: ModelMessage[]): boolean {
    for (const msg of messages) {
      if (!Array.isArray(msg.content)) continue
      for (const part of msg.content) {
        if (part.type === "tool-call" || part.type === "tool-result") return true
      }
    }
    return false
  }
}
