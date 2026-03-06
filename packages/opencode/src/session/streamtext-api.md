# streamText 接口详解

`streamText` 来自 **Vercel AI SDK**（npm 包 `ai`），是本项目中调用大模型、获取**流式**回复的统一底层接口。  
本文档基于 AI SDK 的类型定义，说明入参、返回值及与本项目（`llm.ts`）的对应关系。

---

## 1. 函数签名（概念）

```ts
function streamText<TOOLS, OUTPUT, PARTIAL_OUTPUT>(options: Options): StreamTextResult<TOOLS, PARTIAL_OUTPUT>
```

- **泛型**：`TOOLS` 为工具集合类型，`OUTPUT` / `PARTIAL_OUTPUT` 用于结构化输出（本项目中未用，可忽略）。
- **入参**：一个对象 `options`，包含模型、消息、工具、各种回调等。
- **返回值**：`StreamTextResult`，提供流（如 `fullStream`、`textStream`）和若干 Promise（如 `text`、`usage`）。

---

## 2. 入参（Options）分类说明

入参由 **CallSettings**、**Prompt** 与 **streamText 独有选项** 三部分组成。

### 2.1 必填

| 参数 | 类型 | 说明 |
|------|------|------|
| **model** | `LanguageModel` | 语言模型实例。本项目里由 `Provider.getLanguage(input.model)` 得到，再经 `wrapLanguageModel` 包一层中间件做 prompt 转换。 |

### 2.2 对话内容（Prompt）

**注意**：`prompt` 与 `messages` 二选一，不能同时传。

| 参数 | 类型 | 说明 |
|------|------|------|
| **system** | `string` | 系统提示。AI SDK 也支持传 `messages` 里带 `role: "system"` 的项；本项目在 `llm.ts` 里把多段 system 转成多条 `{ role: "system", content: x }` 放进 `messages`。 |
| **prompt** | `string \| Array<ModelMessage>` | 单次提示：要么是字符串，要么是消息数组。 |
| **messages** | `Array<ModelMessage>` | 多轮消息列表（user/assistant/system）。本项目使用此方式：`[...system 转成的消息, ...input.messages]`。 |

### 2.3 生成与重试控制（CallSettings）

| 参数 | 类型 | 说明 |
|------|------|------|
| **maxOutputTokens** | `number` | 单次生成的最大 token 数。本项目由 `ProviderTransform.maxOutputTokens` 与 `OUTPUT_TOKEN_MAX` 计算。 |
| **temperature** | `number` | 采样温度，范围依模型而定。建议与 topP 二选一。 |
| **topP** | `number` | 核采样，0–1。与 temperature 二选一。 |
| **topK** | `number` | 仅从概率最高的 K 个 token 中采样，一般用 temperature 即可。 |
| **presencePenalty** | `number` | 重复惩罚（-1 到 1）。 |
| **frequencyPenalty** | `number` | 词频重复惩罚（-1 到 1）。 |
| **stopSequences** | `string[]` | 遇到这些字符串之一即停止生成。 |
| **seed** | `number` | 随机种子，支持时可复现结果。 |
| **maxRetries** | `number` | 失败重试次数，默认 2；本项目传 `input.retries ?? 0`。 |
| **abortSignal** | `AbortSignal` | 用于取消请求；本项目传 `input.abort`。 |
| **headers** | `Record<string, string \| undefined>` | 请求头；本项目拼 opencode 自定义头、User-Agent、模型/插件头。 |

### 2.4 工具相关

| 参数 | 类型 | 说明 |
|------|------|------|
| **tools** | `TOOLS`（工具名 → 工具定义） | 模型可调用的工具。本项目由 `resolveTools` 过滤后传入。 |
| **toolChoice** | `ToolChoice<TOOLS>` | 工具选择策略，如 `"auto"`、`"required"`、或指定工具名。 |
| **activeTools** | `Array<keyof TOOLS>` | 本步实际可用的工具名列表，不改变类型，只做限制。本项目传 `Object.keys(tools).filter(x => x !== "invalid")`。 |
| **stopWhen** | 条件或条件数组 | 在「有工具结果」时何时停止生成，默认等价于步数为 1。 |

### 2.5 回调（流式过程与结束）

| 参数 | 类型 | 说明 |
|------|------|------|
| **onError** | `(event: { error: unknown }) => void \| PromiseLike<void>` | 流式过程中出错时调用；本项目用于打日志。 |
| **onFinish** | `(event: { ...StepResult, steps, totalUsage }) => void \| PromiseLike<void>` | 整次调用结束（含所有工具执行）时调用。 |
| **onAbort** | 回调 | 被 abort 时调用。 |
| **onStepFinish** | `(stepResult: StepResult<TOOLS>) => void \| PromiseLike<void>` | 每一步（每次 LLM 调用）结束时调用。 |
| **onChunk** | `(event: { chunk: TextStreamPart<TOOLS> }) => void \| PromiseLike<void>` | 每个流片段到达时调用；回调完成前会阻塞处理。 |

### 2.6 实验/扩展

| 参数 | 类型 | 说明 |
|------|------|------|
| **experimental_repairToolCall** | `ToolCallRepairFunction<TOOLS>` | 工具调用解析失败时的修复函数；本项目用来把错误工具名改成小写或 `"invalid"`。 |
| **experimental_telemetry** | `TelemetrySettings` | 遥测开关与 metadata（如 userId、sessionId）。 |
| **providerOptions** | `ProviderOptions` | 透传给 provider 的额外选项；本项目用 `ProviderTransform.providerOptions`。 |
| **experimental_output** | 结构化输出规范 | 从回复中解析结构化对象（本项目未用）。 |
| **prepareStep** | 函数 | 为每一步动态提供不同 settings（本项目未用）。 |

---

## 3. 返回值：StreamTextResult<TOOLS, PARTIAL_OUTPUT>

返回一个对象，包含**流**和**聚合结果的 Promise**。多数聚合属性会「自动消费流」直到结束。

### 3.1 流（用于边收边处理）

| 属性 | 类型 | 说明 |
|------|------|------|
| **fullStream** | `AsyncIterableStream<TextStreamPart<TOOLS>>` | **最常用**。包含所有事件：文本、推理、工具调用/结果、开始/结束、错误等。本项目在 `SessionProcessor` 里用 `for await (const value of stream.fullStream)` 消费。 |
| **textStream** | `AsyncIterableStream<string>` | 仅文本片段的流，适合只展示文字。 |

### 3.2 fullStream 里的事件类型（TextStreamPart）

消费 `fullStream` 时，每个 `value` 的 `type` 可能为：

| type | 含义 |
|------|------|
| `start` | 流开始 |
| `finish` | 整次调用结束，带 finishReason、totalUsage |
| `text-start` / `text-delta` / `text-end` | 正文开始 / 一段文字 / 正文结束 |
| `reasoning-start` / `reasoning-delta` / `reasoning-end` | 思考过程（reasoning）的开始 / 片段 / 结束 |
| `tool-input-start` / `tool-input-delta` / `tool-input-end` | 某次工具调用的参数开始 / 片段 / 结束 |
| `tool-call` | 工具调用（工具名、参数等） |
| `tool-result` | 工具执行结果 |
| `tool-error` | 工具执行错误 |
| `start-step` / `finish-step` | 单步（一次 LLM 调用）开始/结束，含 usage、finishReason 等 |
| `source` / `file` | 引用来源、生成文件等 |
| `abort` | 被取消 |
| `error` | 错误，带 error 字段 |
| `raw` | 原始 provider 数据（需开启 includeRawChunks） |

本项目在 `processor.ts` 里根据 `value.type` 分支，写入或更新当前 assistant 消息的 text / reasoning / tool parts。

### 3.3 聚合结果（Promise，会消费流）

| 属性 | 类型 | 说明 |
|------|------|------|
| **text** | `Promise<string>` | 最后一步的完整文本。 |
| **content** | `Promise<Array<ContentPart<TOOLS>>>` | 最后一步的内容块数组（文本、工具等）。 |
| **reasoning** / **reasoningText** | `Promise<...>` | 思考过程。 |
| **toolCalls** / **toolResults** | `Promise<...>` | 最后一步的工具调用与结果。 |
| **finishReason** | `Promise<FinishReason>` | 结束原因（如 stop、length、tool-calls）。 |
| **usage** | `Promise<LanguageModelUsage>` | 最后一步的 token 使用量。 |
| **totalUsage** | `Promise<LanguageModelUsage>` | 多步时的总使用量。 |
| **warnings** | `Promise<CallWarning[] \| undefined>` | 模型/ provider 的警告。 |
| **steps** | `Promise<Array<StepResult<TOOLS>>>` | 每一步的详情。 |
| **request** / **response** | `Promise<...>` | 请求/响应元数据。 |
| **providerMetadata** | `Promise<ProviderMetadata \| undefined>` | provider 透传的元数据。 |

### 3.4 其它方法

| 方法 | 说明 |
|------|------|
| **consumeStream(options?)** | 只消费流、不处理片段，用于触发 onFinish 和 Promise 解析。 |
| **toUIMessageStream(options?)** | 转成 UI 消息流。 |
| **pipeTextStreamToResponse(response, init?)** | 把文本流写入 Node 的 ServerResponse。 |
| **toTextStreamResponse(init?)** | 得到仅含文本流的 Response。 |

---

## 4. 本项目中的用法对应（llm.ts）

| 本项目传入 | streamText 参数 | 说明 |
|------------|-----------------|------|
| system 数组转成的 messages + input.messages | **messages** | 先若干条 system，再对话历史。 |
| language（wrapLanguageModel 包装后） | **model** | 中间件里做 prompt 格式转换。 |
| resolveTools 过滤后的 tools | **tools** | 同时传 **activeTools** 排除 "invalid"。 |
| params.temperature / topP / topK、providerOptions | **temperature / topP / topK / providerOptions** | 来自插件与 ProviderTransform。 |
| maxOutputTokens | **maxOutputTokens** | Codex/Copilot 不传。 |
| input.abort | **abortSignal** | 取消用。 |
| 自定义 + 模型 + 插件的 headers | **headers** | |
| input.retries ?? 0 | **maxRetries** | |
| 错误日志 | **onError** | |
| 工具名修复（小写 / invalid） | **experimental_repairToolCall** | |
| 遥测开关与 metadata | **experimental_telemetry** | |

返回值直接 `return streamText({...})`，由 **SessionProcessor** 通过 `stream.fullStream` 消费，并写入当前 assistant 消息的 parts（见 `processor.ts`）。

---

## 5. 小结

- **streamText**：一次「发请求 + 收流式结果」的封装；入参 = 模型 + 消息/提示 + 工具 + 生成/重试/回调等，返回值 = 流（fullStream/textStream）+ 聚合 Promise。
- **本项目**：在 `llm.ts` 里拼好 system、messages、tools、headers 等，调用 `streamText`；在 `processor.ts` 里用 `fullStream` 的 `type` 分支写 text/reasoning/tool parts，并在适当时机根据 finishReason 结束或继续下一步（如执行工具后再调一次 streamText）。

更细的类型（如 `ModelMessage`、`TypedToolCall`、`FinishReason`）可查 `node_modules/ai/dist/index.d.ts`。
