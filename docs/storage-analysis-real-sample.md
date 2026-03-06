# OpenCode 存储真实数据分析（基于当前目录数据）

本文档基于 **`C:\Users\new\.local\share\opencode\storage`** 下的真实数据做针对性分析，展示实际文件内容与一次完整「用户提问 → 模型多步工具调用 → 最终回复」的对应关系。

---

## 一、实际目录与统计

```
C:\Users\new\.local\share\opencode\storage\
├── migration
├── project/
│   └── 4b0ea68d7af9a6031a7ffda7ad66e0cb83315750.json
├── session/
│   └── 4b0ea68d7af9a6031a7ffda7ad66e0cb83315750/
│       └── ses_3442679b5ffe5Ah2xbk3JHlP6j.json
├── session_diff/
│   └── ses_3442679b5ffe5Ah2xbk3JHlP6j.json
├── message/
│   └── ses_3442679b5ffe5Ah2xbk3JHlP6j/
│       ├── msg_cbbd98650001z0awFImeNERFe5.json   (user)
│       ├── msg_cbbd98671001JvbDdbv6RiQflp.json   (assistant 第 1 步)
│       ├── msg_cbbd9b3b5001fQmMb5fm59kiZv.json   (assistant 第 2 步)
│       └── msg_cbbd9fa50001gvbh879DsGiERL.json   (assistant 第 3 步)
└── part/
    ├── msg_cbbd98650001z0awFImeNERFe5/   (user 消息的 part)
    │   └── prt_cbbd98650002Ww12799XqiHtcC.json
    ├── msg_cbbd98671001JvbDdbv6RiQflp/   (第 1 步 assistant 的 parts)
    │   ├── prt_cbbd9b248001pwvRpcBHtIkJj4.json
    │   ├── prt_cbbd9b24b001J8wez2CyNrJ2Ef.json
    │   ├── prt_cbbd9b2520012iPoClvBPtH8rS.json
    │   └── prt_cbbd9b25c0012kkGktKrMUUHsx.json
    ├── msg_cbbd9b3b5001fQmMb5fm59kiZv/   (第 2 步 assistant 的 parts)
    │   ├── prt_cbbd9f4da001Ke4wxoyV2konGZ.json
    │   ├── prt_cbbd9f4dc001diMkRu08FKZRi0.json
    │   ├── prt_cbbd9f7bc001CcNQPaLqVqaQmz.json
    │   └── prt_cbbd9f92700131245YMRmk4raK.json
    └── msg_cbbd9fa50001gvbh879DsGiERL/   (第 3 步 assistant 的 parts)
        ├── prt_cbbda00f2001pdjWYTAHLdX7YB.json
        ├── prt_cbbda00f4001xeRhlEC5Bfhxph.json
        ├── prt_cbbda028a001PjsSVU1SO99V6B.json
        └── prt_cbbda10060017iTV5DgM79BydJ.json
```

| 类型 | 数量 | 说明 |
|------|------|------|
| project | 1 | 当前仓库（opencode 项目） |
| session | 1 | 一次对话会话 |
| message | 4 | 1 条 user + 3 条 assistant（多步执行） |
| part | 13 | 1(user) + 4×3(assistant) |
| session_diff | 1 | 本会话 diff 列表（当前为空数组 `[]`） |

---

## 二、真实数据逐层分析

### 1. Project（项目）— 实际内容

**文件**：`project/4b0ea68d7af9a6031a7ffda7ad66e0cb83315750.json`

```json
{
  "id": "4b0ea68d7af9a6031a7ffda7ad66e0cb83315750",
  "worktree": "D:\\workspace\\github\\opencode",
  "vcs": "git",
  "sandboxes": [],
  "time": {
    "created": 1772676587943,
    "updated": 1772676587943
  }
}
```

- **id**：Git 根 commit，与仓库一一对应。
- **worktree**：当前仓库根路径。
- **实际未出现字段**：`name`、`icon`、`commands` 等在本条数据中未写，说明均为可选。

---

### 2. Session（会话）— 实际内容

**文件**：`session/4b0ea68d7af9a6031a7ffda7ad66e0cb83315750/ses_3442679b5ffe5Ah2xbk3JHlP6j.json`

```json
{
  "id": "ses_3442679b5ffe5Ah2xbk3JHlP6j",
  "slug": "swift-mountain",
  "version": "local",
  "projectID": "4b0ea68d7af9a6031a7ffda7ad66e0cb83315750",
  "directory": "D:\\workspace\\github\\opencode\\packages\\opencode",
  "title": "读取 tool 目录 read.txt 内容并翻译成中文",
  "time": {
    "created": 1772678121034,
    "updated": 1772678156700
  },
  "summary": {
    "additions": 0,
    "deletions": 0,
    "files": 0
  }
}
```

- **directory**：比 project 的 worktree 更细，指向 `packages/opencode`，即本次会话的工作目录。
- **summary**：本会话暂无代码变更（additions/deletions/files 均为 0），与 session_diff 为空一致。
- **实际未出现**：`parentID`、`share`、`permission`、`revert` 等。

---

### 3. Message（消息）— 实际内容与关系

四条消息的**实际角色、时间与关联**如下。

| 文件 | role | parentID | 时间 created → completed | finish |
|------|------|----------|---------------------------|--------|
| msg_cbbd98650001z0awFImeNERFe5 | user | — | 1772678121053 | — |
| msg_cbbd98671001JvbDdbv6RiQflp | assistant | msg_cbbd98650001z0awFImeNERFe5 | 1772678121073 → 1772678132647 | tool-calls |
| msg_cbbd9b3b5001fQmMb5fm59kiZv | assistant | msg_cbbd98650001z0awFImeNERFe5 | 1772678132661 → 1772678150723 | tool-calls |
| msg_cbbd9fa50001gvbh879DsGiERL | assistant | msg_cbbd98650001z0awFImeNERFe5 | 1772678150736 → 1772678156575 | stop |

- **三条 assistant 的 parentID 都指向同一条 user 消息**：表示这是对同一次用户输入的「多步连续回复」。
- **finish**：前两步为 `tool-calls`（还有工具要执行），最后一步为 `stop`（正常结束）。

**User 消息实际字段**（`msg_cbbd98650001z0awFImeNERFe5.json`）：

```json
{
  "id": "msg_cbbd98650001z0awFImeNERFe5",
  "sessionID": "ses_3442679b5ffe5Ah2xbk3JHlP6j",
  "role": "user",
  "time": { "created": 1772678121053 },
  "summary": {
    "title": "读取 tool/read.txt 内容转中文",
    "diffs": []
  },
  "agent": "build",
  "model": { "providerID": "opencode", "modelID": "big-pickle" },
  "variant": "medium"
}
```

- **summary.title**：由系统生成的该条用户消息的简短摘要。
- **agent / model / variant**：使用的 agent 与模型配置（opencode / big-pickle，medium 变体）。

**Assistant 消息共同点**（以最后一条为例）：

- **path.cwd / path.root**：与 session 的 directory / project 的 worktree 一致。
- **tokens**：含 `input`、`output`、`reasoning`、`cache.read`、`cache.write`（本数据中 reasoning 均为 0，有 cache 读写）。
- **cost**：本例中为 0（可能未配置计费或为本地模型）。

---

### 4. Part（片段）— 与模型交互的真实内容

#### 4.1 用户消息的 Part（1 个）

**文件**：`part/msg_cbbd98650001z0awFImeNERFe5/prt_cbbd98650002Ww12799XqiHtcC.json`

```json
{
  "id": "prt_cbbd98650002Ww12799XqiHtcC",
  "sessionID": "ses_3442679b5ffe5Ah2xbk3JHlP6j",
  "messageID": "msg_cbbd98650001z0awFImeNERFe5",
  "type": "text",
  "text": "读取tool目录下的read.txt内容，转成中文"
}
```

- 用户输入只有一段纯文本，对应 **1 个 type=text 的 part**。

---

#### 4.2 第 1 步 Assistant（glob 找文件）

| Part 文件 | type | 实际内容摘要 |
|-----------|------|----------------|
| prt_cbbd9b248001... | step-start | snapshot: `3745b452...` |
| prt_cbbd9b24b001... | reasoning | 「用户想要读取tool目录下的read.txt...让我先找到并读取这个文件。」 |
| prt_cbbd9b252001... | tool | tool=**glob**，input: `{"pattern":"**/tool/**/read.txt"}`，output: 找到的绝对路径 |
| prt_cbbd9b25c001... | step-finish | reason: tool-calls，含 tokens/cache |

**Tool part 实际结构**（glob）：

```json
{
  "type": "tool",
  "callID": "call_function_fy8vzay1bwjx_1",
  "tool": "glob",
  "state": {
    "status": "completed",
    "input": { "pattern": "**/tool/**/read.txt" },
    "output": "D:\\workspace\\github\\opencode\\packages\\opencode\\src\\tool\\read.txt",
    "title": "packages\\opencode",
    "metadata": { "count": 1, "truncated": false },
    "time": { "start": 1772678132309, "end": 1772678132312 }
  }
}
```

---

#### 4.3 第 2 步 Assistant（read 读文件）

| Part 文件 | type | 实际内容摘要 |
|-----------|------|----------------|
| prt_cbbd9f4da001... | step-start | snapshot 同上 |
| prt_cbbd9f4dc001... | reasoning | 「找到了文件，让我读取它的内容。」 |
| prt_cbbd9f7bc001... | tool | tool=**read**，input: filePath 为上一段 output 的路径，output: read.txt 的完整内容（带行号） |
| prt_cbbd9f927001... | step-finish | reason: tool-calls |

**Read 的 output**：即 `read.txt` 的 13 行内容（工具说明），以 `<file>…(End of file - total 13 lines)</file>` 形式存储。

---

#### 4.4 第 3 步 Assistant（翻译成中文并输出）

| Part 文件 | type | 实际内容摘要 |
|-----------|------|----------------|
| prt_cbbda00f2001... | step-start | snapshot 同上 |
| prt_cbbda00f4001... | reasoning | 「用户要求把内容转成中文，我现在把这段英文翻译成中文。」 |
| prt_cbbda028a001... | **text** | 模型输出的中文翻译全文（工具说明的中文版） |
| prt_cbbda1006001... | step-finish | reason: **stop**，含本步 tokens |

- 最终用户可见的回复 = 这条 **type=text** 的 part 的 `text` 字段。
- **reasoning** 部分带有 `metadata.anthropic.signature`，用于校验推理内容来源。

---

## 三、时间线与数据流（真实顺序）：输入 vs 输出

**是的，这三步都是模型的输出**（每条对应一条 assistant message）。**输入**只有一处是用户直接给的，其余是上一步的**工具结果**作为下一步的输入。

| 时刻 / 阶段 | 输入（给模型看的） | 输出（模型写的，存成 message + part） |
|-------------|--------------------|----------------------------------------|
| 用户发话 | — | **User 消息** + 1 个 text part：「读取tool目录下的read.txt内容，转成中文」 |
| 第 1 步 | 上表那一条用户消息 | **Assistant 消息 1**：reasoning + 调用 glob，结果写入 tool part 的 `state.output` |
| 第 2 步 | 用户消息 + **第 1 步的 tool 结果**（glob 找到的路径） | **Assistant 消息 2**：reasoning + 调用 read，结果写入 tool part 的 `state.output` |
| 第 3 步 | 用户消息 + 第 1 步结果 + **第 2 步的 tool 结果**（read 读到的文件内容） | **Assistant 消息 3**：reasoning + 一段 text（中文翻译），不再调工具 |

因此：**只有一次“用户输入”**（那条 user message）；三步都是**模型输出**，且第 2、3 步的输入依赖前一步工具 part 里的 `state.output`（由后端在执行完工具后塞回 part，再作为下一轮请求的上下文发给模型）。

按时间戳排列：

1. **1772678121034** — Session 创建  
2. **1772678121053** — **用户输入**：User 消息创建，part 为「读取tool目录下的read.txt内容，转成中文」  
3. **1772678121073 ~ 1772678132647** — **模型输出** 第 1 步：reasoning → glob 工具 → step-finish（glob 的 output 成为下一步输入）  
4. **1772678132661 ~ 1772678150723** — **模型输出** 第 2 步：reasoning → read 工具 → step-finish（read 的 output 成为下一步输入）  
5. **1772678150736 ~ 1772678156575** — **模型输出** 第 3 步：reasoning → text（中文翻译）→ step-finish(reason=stop)  
6. **1772678156700** — Session 最后更新时间  

整段交互：**1 条用户输入（user message） + 3 条模型输出（assistant message）**；assistant 通过 **parentID** 都挂在同一条 user 下；每条 assistant 内部为 **step-start → reasoning → tool/text → step-finish** 的固定模式。

---

## 四、结合代码的完整字段与中间状态

以下按**代码执行顺序**列出每次写入 Storage 的**完整字段**及**中间状态**（如 tool 的 pending → running → completed），并标明代码位置（文件:行或函数名）。

### 4.1 入口：User 消息与 Part 的创建

**代码路径**：`SessionPrompt.prompt()`（`packages/opencode/src/session/prompt.ts`）→ `createUserMessage(input)`。

**请求入参**（`PromptInput`，见 `prompt.ts` 约 155–218 行）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sessionID` | string | 必填 |
| `messageID` | string | 可选，不传则内部生成 |
| `model` | `{ providerID, modelID }` | 可选 |
| `agent` | string | 可选 |
| `noReply` | boolean | 可选，true 则只写 user 不推理 |
| `tools` | Record<string, boolean> | 可选，已废弃，会写回 session.permission |
| `system` | string | 可选 |
| `variant` | string | 可选 |
| `parts` | array | 必填，`{ type: "text", text }` / `{ type: "file", ... }` / `{ type: "agent", name }` / `{ type: "subtask", ... }` |

**写入 1：User Message**（`createUserMessage` 内 `info`，约 977–990 行，随后 `Session.updateMessage(info)` 约 1337 行）

- **Storage key**：`["message", sessionID, info.id]`
- **完整字段**（`MessageV2.User`，见 `message-v2.ts` 约 309–331 行）：

| 字段 | 类型 | 来源/说明 |
|------|------|-----------|
| `id` | string | `input.messageID ?? Identifier.ascending("message")` |
| `sessionID` | string | `input.sessionID` |
| `role` | `"user"` | 字面量 |
| `time` | `{ created: number }` | `Date.now()` |
| `tools` | Record<string, boolean>? | `input.tools` |
| `agent` | string | `agent.name` |
| `model` | `{ providerID, modelID }` | 解析后的 model |
| `system` | string? | `input.system` |
| `variant` | string? | 解析后的 variant |
| `summary` | `{ title?, body?, diffs }`? | 后续异步可能写入，非本次 |

**写入 2：User Part(s)**（`createUserMessage` 内对 `input.parts` 展开后逐个 `Session.updatePart(part)` 约 1338–1340 行）

- **Storage key**：`["part", messageID, part.id]`
- 纯文本时为一个 **TextPart**（`message-v2.ts` 约 65–79 行）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | `Identifier.ascending("part")` 或 part 自带 |
| `sessionID` | string | `input.sessionID` |
| `messageID` | string | `info.id` |
| `type` | `"text"` | 字面量 |
| `text` | string | 用户输入或展开后的内容 |
| `synthetic`? | boolean | 非用户直接输入时为 true |
| `ignored`? | boolean | 可选 |
| `time`? | `{ start?, end? }` | 可选 |
| `metadata`? | record | 可选 |

---

### 4.2 推理循环与 Assistant 消息壳

**代码路径**：`prompt()` 内 `loop({ sessionID })`（约 362 行起）→ 每轮 `msgs = await MessageV2.filterCompacted(MessageV2.stream(sessionID))`（约 386 行）→ 分支 4「常规 assistant 步」→ `SessionProcessor.create({ assistantMessage: ... })`（约 650–679 行）。

**写入 3：Assistant Message（空壳）**（`prompt.ts` 约 651–676 行，`Session.updateMessage(...)` 写入）

- **Storage key**：`["message", sessionID, assistantMessage.id]`
- **完整字段**（`MessageV2.Assistant`，见 `message-v2.ts` 约 353–395 行）：

| 字段 | 类型 | 写入时的值 |
|------|------|------------|
| `id` | string | `Identifier.ascending("message")` |
| `sessionID` | string | 当前 sessionID |
| `role` | `"assistant"` | 字面量 |
| `parentID` | string | `lastUser.id` |
| `time` | `{ created: number, completed?: number }` | 先只写 `created: Date.now()`，本步结束时写 `completed` |
| `modelID` | string | `model.id` |
| `providerID` | string | `model.providerID` |
| `mode` | string | `agent.name` |
| `agent` | string | `agent.name` |
| `path` | `{ cwd, root }` | `Instance.directory`, `Instance.worktree` |
| `cost` | number | 初始 0，每步 `finish-step` 时累加 |
| `tokens` | `{ input, output, reasoning, cache: { read, write } }` | 初始全 0，`finish-step` 时由 `Session.getUsage()` 写入 |
| `variant`? | string | `lastUser.variant` |
| `finish`? | string | 本步结束时写入（如 `tool-calls` / `stop`） |
| `error`? | object | 仅出错时写入 |

---

### 4.3 流式事件与 Part / Message 的写入（单步内顺序）

**代码路径**：`processor.process(streamInput)`（`packages/opencode/src/session/processor.ts`），`for await (const value of stream.fullStream)`（约 127 行），按 `value.type` 分支。

以下为**单步**内典型顺序；**中间状态**指同一 part 被多次 `updatePart` 时的变化。

| 流事件 | 代码位置 | Storage 写入 | 完整/中间字段说明 |
|--------|----------|--------------|-------------------|
| **start-step** | processor.ts 307–315 | `Session.updatePart(stepStartPart)` | **StepStartPart**：`id`, `messageID`, `sessionID`, `type: "step-start"`, `snapshot?`（`Snapshot.track()`） |
| **reasoning-start** | 135–150 | 不写盘，只在内存 `reasoningMap[value.id]` | 内存 part：`type: "reasoning"`, `text: ""`, `time: { start }`, `metadata?: value.providerMetadata` |
| **reasoning-delta** | 152–159 | `Session.updatePart({ part, delta: value.text })` | 增量追加 `part.text`，可能多次写（中间状态：text 逐步变长） |
| **reasoning-end** | 161–174 | `Session.updatePart(part)` | 补全 **ReasoningPart**：`part.time.end = Date.now()`，`part.text = part.text.trimEnd()`，可选 `metadata` |
| **tool-input-start** | 176–191 | `Session.updatePart(toolPart)` | **ToolPart** 首次写入，**中间状态 pending**：`state: { status: "pending", input: {}, raw: "" }`，`callID: value.id`，`tool: value.toolName` |
| **tool-call** | 209–246 | `Session.updatePart({ ...match, state: { ... } })` | **中间状态 running**：`state.status: "running"`, `state.input: value.input`, `state.time.start: Date.now()`，`metadata?: value.providerMetadata` |
| **tool-result** | 247–267 | `Session.updatePart({ ...match, state: { ... } })` | **终态 completed**：`state.status: "completed"`, `state.input`, `state.output: value.output.output`, `state.title`, `state.metadata`, `state.time.end`, `state.attachments?`；该 `output` 即下一步模型的输入来源 |
| **tool-error** | 270–295 | `Session.updatePart({ ...match, state: { ... } })` | **终态 error**：`state.status: "error"`, `state.error`, `state.time.end` |
| **text-start** | 353–365 | 不写盘，只在内存 `currentText` | 内存 part：`type: "text"`, `text: ""`, `time: { start }`, `metadata?` |
| **text-delta** | 367–376 | `Session.updatePart({ part: currentText, delta: value.text })` | 增量追加 `currentText.text`，可能多次写（中间状态） |
| **text-end** | 379–399 | `Session.updatePart(currentText)` | 补全 **TextPart**：`currentText.text` 经 trim、插件 `experimental.text.complete` 可改，`time.end`，`metadata?` |
| **finish-step** | 310–347 | 先 `Session.updatePart(stepFinishPart)`，再 `Session.updateMessage(assistantMessage)` | **StepFinishPart**：`reason: value.finishReason`, `snapshot`, `cost`, `tokens`（本步用量）。**Assistant message** 更新：`finish`, `cost` 累加，`tokens` 更新，若有 patch 再写 **PatchPart**（`hash`, `files`） |

**Tool state 的四种形态**（`message-v2.ts` 约 226–291 行）：

- **pending**：`status: "pending"`, `input: {}`, `raw: ""`
- **running**：`status: "running"`, `input`, `title?`, `metadata?`, `time: { start }`
- **completed**：`status: "completed"`, `input`, `output`, `title`, `metadata`, `time: { start, end, compacted? }`, `attachments?`
- **error**：`status: "error"`, `input`, `error`, `metadata?`, `time: { start, end }`

---

### 4.4 下一步「输入」如何从存储变成模型上下文

**代码路径**：下一轮 `loop` 开头（prompt.ts 约 386 行）`msgs = await MessageV2.filterCompacted(MessageV2.stream(sessionID))`；随后（约 734 行）`processor.process({ messages: MessageV2.toModelMessages(sessionMessages, model), ... })`。

- **MessageV2.stream(sessionID)**（`message-v2.ts` 约 668–676 行）：对 `Storage.list(["message", sessionID])` 的每个 messageID 调用 `MessageV2.get({ sessionID, messageID })`（约 687–698 行），即读 message JSON + `MessageV2.parts(messageID)`，得到带 `info` 和 `parts` 的 `WithParts[]`。因此**上一步刚写的 assistant message 及其 tool part 的 `state.output`** 已在 `msgs` 里。
- **MessageV2.toModelMessages(msgs, model)**（`message-v2.ts` 约 443 行起）：把每条 message 的 parts 转成 provider 需要的格式；对 `type: "tool"` 且 `state.status === "completed"` 的 part，用 `state.output`（及可选的 `state.attachments`）作为该工具调用的**结果**发给模型。因此**工具结果作为下一步的输入**是由「存储里 part 的 state.output」→ `toModelMessages` → 请求 body 的 messages 完成的。

---

### 4.5 小结：代码与存储的对应关系

| 阶段 | 代码位置 | 写入的 key | 主要完整字段 / 中间状态 |
|------|----------|------------|--------------------------|
| 用户发话 | prompt.ts createUserMessage | message/[sessionID]/[msgID], part/[msgID]/[partID] | User：id, sessionID, role, time, tools?, agent, model, system?, variant?；TextPart：id, sessionID, messageID, type, text, synthetic?, time?, metadata? |
| 每步开始 | prompt.ts 651–676 | message/[sessionID]/[msgID] | Assistant 壳：id, parentID, role, path, cost=0, tokens=0, time.created, modelID, providerID, mode, agent, variant? |
| 流式：步骤开始 | processor.ts 307–315 | part/[msgID]/[partID] | StepStartPart：id, messageID, sessionID, type, snapshot? |
| 流式：推理 | processor.ts 135–174 | part/[msgID]/[partID] | ReasoningPart：中间多次 delta 写，最后补 time.end、trimEnd |
| 流式：工具 | processor.ts 176–295 | part/[msgID]/[partID] | ToolPart：pending → running → completed/error；completed 时 state.output 即下一步输入 |
| 流式：正文 | processor.ts 353–399 | part/[msgID]/[partID] | TextPart：中间多次 delta 写，最后补 time.end、插件处理 |
| 流式：步骤结束 | processor.ts 310–329, 331 | part/[msgID]/[partID], message/[sessionID]/[msgID] | StepFinishPart：reason, snapshot?, cost, tokens；Assistant：finish, cost, tokens 更新 |

---

## 五、本数据与理论的对应关系

| 理论概念 | 本数据中的体现 |
|----------|----------------|
| 一次「用户发一句」 | 1 条 user message + 1 个 text part |
| 模型「多步 + 多工具」 | 3 条 assistant message，每条 4 个 part（step-start / reasoning / tool 或 text / step-finish） |
| 工具调用结果 | 存在对应 message 的 part 中，`type: "tool"`，`state.input` / `state.output` / `state.status` |
| 模型推理过程 | `type: "reasoning"`，`text` 为推理内容，带 `time`、可选 `metadata` |
| 会话无代码变更 | `summary.additions/deletions/files` 为 0，`session_diff` 为 `[]` |
| 模型/缓存用量 | 每条 assistant 的 `tokens` 含 `input`、`output`、`cache.read`、`cache.write` |

---

## 六、如何用脚本复现本分析

对同一目录再次跑分析脚本即可得到与本文一致的统计和树形摘要：

```bash
cd packages/opencode
bun run script/analyze-storage.ts "C:\Users\new\.local\share\opencode\storage"
```

如需基于其他备份或环境下的 storage 目录做「针对真实数据的分析」，只需把路径改为该目录即可。
