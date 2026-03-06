# 存储结构：project / session / message / part

本文档说明 OpenCode 中**项目、会话、消息、片段**四个存储层级的逻辑关系与各自结构。  
所有数据均通过 `Storage` 命名空间持久化到**文件系统**，根目录为：

```
<Global.Path.data>/storage
```

- 默认即 `~/.local/share/opencode/storage`（Linux/macOS）或 `%LOCALAPPDATA%\opencode\storage`（Windows）。
- 每个资源对应一个 JSON 文件，路径由 **key 数组** 决定：`key.join("/") + ".json"`。

---

## 一、逻辑关系总览

```
Project (项目)
  └── Session (会话) [按 projectID 归属]
        └── Message (消息) [按 sessionID 归属]
              └── Part (片段) [按 messageID 归属]
```

- **Project**：顶层，表示一个工作区/仓库（如 Git 根 commit 对应一个 project）。
- **Session**：属于某个 project，一次对话会话（含标题、摘要、时间等）。
- **Message**：属于某个 session，一条用户或助手的消息（仅元数据，不含正文）。
- **Part**：属于某条 message，消息的**内容块**（文本、工具调用、推理、文件等）。

读取顺序通常为：先 project → 再 session 列表 → 再某 session 的 message 列表 → 再某 message 的 part 列表。

#### 项目与会话的划分与归属

**项目是怎么划分的（什么算“一个项目”）**

- **入口是目录**：所有项目解析都从「当前打开的目录」开始，通过 `Project.fromDirectory(directory)`（内部由 `Instance.provide({ directory, fn })` 调用）。
- **有 Git 的目录**：
  - 从该目录**向上**查找 `.git`，找到后以该仓库为“一个项目”。
  - **项目 ID = Git 的根 commit**：`git rev-list --max-parents=0 --all` 取到的**第一个** commit hash，并缓存在 `.git/opencode`。
  - 因此：**同一个 Git 仓库**（不管从根目录还是子目录打开）= **同一个 project**；不同仓库或不同 clone = 不同的 project（根 commit 不同则 id 不同）。
- **没有 .git 的目录**：
  - 项目 ID 固定为 `"global"`，worktree 为 `"/"`。
  - 所有非 Git 目录在“项目”维度上**共用一个 project**（即 `project/global`）。

**会话是怎么归属到项目的**

- 创建会话时一定在 `Instance.provide({ directory, ... })` 内执行，因此用的是**当前上下文解析出的 project**。
- Session 的 `projectID` 在创建时被设为 `Instance.project.id`（见 `Session.createNext`），并写入 `storage/session/<projectID>/<sessionID>.json`。
- 因此：在仓库 A 下创建的会话 → `projectID = 仓库 A 的根 commit`；在另一个仓库 B 下 → `projectID = 仓库 B 的根 commit`；在非 Git 目录下 → `projectID = "global"`。

**怎么区分是不是“同一个项目”**

- **看 project 的 id**。id 相同即视为同一项目。
  - **Git**：id = 根 commit hash。同一仓库、同一历史 → 同一 id；clone 出来的副本若历史一致，根 commit 相同，也会是同一 id。
  - **非 Git**：id 恒为 `"global"`，不区分具体目录，都算“同一个项目”。

#### 同一窗口的多次交互：一个会话还是多个会话？

- **一次对话线程 = 一个 Session**。在同一个 Session 里，你发的多条用户消息 + 模型的多条回复，都是**同一个会话**里的多条 Message，不会自动变成多个 Session。
- **同一窗口**里可以切换不同会话：URL 形如 `/:dir/session`（无 id）或 `/:dir/session/:id`。  
  - **当前 URL 有 session id**（例如 `/:dir/session/abc123`）：你在输入框里连续发的所有消息，都会发到 **这一个会话**（abc123），即**一个会话、多次交互**。  
  - **当前 URL 没有 session id**（例如 `/:dir/session`）：这是“新会话”页。当你**第一次发送消息**时，会先调用 `Session.create()` 创建**一个新会话**，再跳转到 `/:dir/session/<新id>`，之后这条和后续消息都属于这个新会话。
- 因此：**同一窗口**既可以只用一个会话（一直不点“新会话”、不切 URL），也可以包含多个会话（通过侧边栏或“新会话”切换到不同 session id）。  
  **“一个会话”还是“多个会话”** 取决于你当前打开的 URL 是否同一个 session id，而不是“同一窗口”本身。

#### 一次交互有几个 message、几个 part？

**一次交互** = 用户发一条 prompt（可能带附件、@agent 等），模型跑完一轮回复（可能含多步、工具调用、推理等）。

- **Message 数量**：**2 条**
  - 1 条 **user** message：由 `SessionPrompt` 根据本次输入的 `parts` 创建并写入。
  - 1 条 **assistant** message：在调用模型前先写入一条“空壳”，流式过程中不断更新，并追加各类 part。
  - 特殊流程（如 subtask、compaction）可能再插入额外的 synthetic user 等，但常规一轮对话就是 2 条 message。

- **Part 数量**：**不固定**，按内容决定。
  - **User message 的 part**：**≥1**。由请求里的 `parts` 映射而来：纯文字通常 1 个 text part；带文件/目录/@agent 时会多出 file、text（模拟 Read）、agent 等，一个输入块可能对应 1～多个 part。
  - **Assistant message 的 part**：**≥1**。流式过程中至少会有一个 **text** part；此外还可能有：
    - **step-start**（每步 0 或 1 个）
    - **reasoning**（0 或多个推理块）
    - **tool**（每次工具调用 1 个）
    - **step-finish**（每步 0 或 1 个）
    - **patch**（若有文件变更则 0 或 1 个）
  - 因此：简单回复 ≈ 1 个 text part；有推理/多步/多工具时，part 数量会明显增多。

**小结**：一次交互 = **2 条 message**（1 user + 1 assistant），**两条的 part 数都 ≥1**，且 assistant 的 part 数量随模型行为（推理、工具、步骤）增加。

---

## 二、目录与 Key 对应关系

| 层级    | Storage key 示例                    | 实际路径（相对 `<storage>/`）           |
|---------|-------------------------------------|-----------------------------------------|
| project | `["project", projectID]`            | `project/<projectID>.json`               |
| session | `["session", projectID, sessionID]` | `session/<projectID>/<sessionID>.json`   |
| message | `["message", sessionID, messageID]` | `message/<sessionID>/<messageID>.json`  |
| part    | `["part", messageID, partID]`       | `part/<messageID>/<partID>.json`        |

要点：

- **Session 按 project 分目录**：同一 project 下所有 session 在 `session/<projectID>/` 下。
- **Message 按 session 分目录**：某 session 下所有 message 在 `message/<sessionID>/` 下。
- **Part 按 message 分目录**：某 message 下所有 part 在 `part/<messageID>/` 下；part 的 key 里**没有** sessionID。

---

## 三、各层级结构详解

### 1. Project（`project/<projectID>.json`）

- **用途**：描述一个“项目”（工作区），如 Git 仓库用根 commit 作为稳定 `id`，非 Git 用 `"global"`。
- **读写**：`Storage.read/write/update(["project", projectID])`，见 `Project.fromDirectory`、`Project.list`、`Project.update`。

**结构（Zod：`Project.Info`）：**

```ts
{
  id: string,              // 如 Git 首个 commit hash 或 "global"
  worktree: string,        // 工作区根路径
  vcs?: "git",
  name?: string,
  icon?: { url?, override?, color? },
  commands?: { start?: string },
  time: {
    created: number,
    updated: number,
    initialized?: number
  },
  sandboxes: string[]      // 沙箱/工作区路径列表
}
```

---

### 2. Session（`session/<projectID>/<sessionID>.json`）

- **用途**：一次对话会话的元信息（标题、目录、摘要、时间、分享、回滚等）。
- **读写**：`Storage.read/write/update(["session", projectID, sessionID])`，见 `Session.createNext`、`Session.get`、`Session.update`、`Session.remove`。

**结构（Zod：`Session.Info`）：**

```ts
{
  id: string,              // session 唯一 ID
  slug: string,
  projectID: string,       // 所属 project
  directory: string,       // 会话对应工作目录
  parentID?: string,       // 父 session（子会话）
  summary?: {
    additions: number,
    deletions: number,
    files: number,
    diffs?: Snapshot.FileDiff[]   // 实际 diff 常迁到 session_diff/<sessionID>.json
  },
  share?: { url: string },
  title: string,
  version: string,
  time: {
    created: number,
    updated: number,
    compacting?: number,
    archived?: number
  },
  permission?: PermissionNext.Ruleset,
  revert?: {
    messageID: string,
    partID?: string,
    snapshot?: string,
    diff?: string
  }
}
```

**关联存储：**

- `session_diff/<sessionID>.json`：该 session 的 diff 列表（迁移后从 `summary.diffs` 拆出），见 `Storage.write(["session_diff", sessionID], diffs)`。

---

### 3. Message（`message/<sessionID>/<messageID>.json`）

- **用途**：一条消息的**元数据**（角色、时间、模型、token、错误等）；**不包含**消息正文，正文在 Part 里。
- **读写**：`Storage.write(["message", sessionID, messageID], msg)`，见 `Session.updateMessage`、`Session.removeMessage`；读取见 `MessageV2.get`、`MessageV2.stream`。

**结构（Zod：`MessageV2.Info` = `User | Assistant`）：**

**User 消息：**

```ts
{
  id: string,
  sessionID: string,
  role: "user",
  time: { created: number },
  summary?: { title?, body?, diffs },
  agent: string,
  model: { providerID: string, modelID: string },
  system?: string,
  tools?: Record<string, boolean>,
  variant?: string
}
```

**Assistant 消息：**

```ts
{
  id: string,
  sessionID: string,
  role: "assistant",
  time: { created: number, completed?: number },
  error?: { name, ... },   // AuthError / OutputLengthError / APIError / ...
  parentID: string,        // 对应的 user message id
  modelID: string,
  providerID: string,
  mode: string,
  agent: string,
  path: { cwd: string, root: string },
  summary?: boolean,
  cost: number,
  tokens: { input, output, reasoning, cache: { read, write } },
  variant?: string,
  finish?: string
}
```

---

### 4. Part（`part/<messageID>/<partID>.json`）

- **用途**：单条消息的**内容块**，如一段文本、一次工具调用、推理、文件、步骤开始/结束等。
- **读写**：`Storage.write(["part", messageID, partID], part)`，见 `Session.updatePart`、`Session.removePart`；读取见 `MessageV2.parts(messageID)`。

**公共字段（PartBase）：**

```ts
{
  id: string,
  sessionID: string,
  messageID: string,
  type: "text" | "reasoning" | "file" | "tool" | "step-start" | "step-finish" | "snapshot" | "patch" | "agent" | "retry" | "compaction" | "subtask"
}
```

**常见 Part 类型（`MessageV2.Part` 联合）：**

| type         | 含义           | 典型额外字段 |
|--------------|----------------|--------------|
| text         | 正文文本       | `text`, `synthetic?`, `ignored?`, `time?`, `metadata?` |
| reasoning    | 推理过程       | `text`, `metadata?`, `time` |
| file         | 附件           | `mime`, `filename?`, `url`, `source?` |
| tool         | 工具调用       | `callID`, `tool`, `state` (pending/running/completed/error) |
| step-start   | 步骤开始       | `snapshot?` |
| step-finish  | 步骤结束       | `reason`, `snapshot?`, `cost`, `tokens` |
| snapshot     | 快照引用       | `snapshot` |
| patch        | 补丁引用       | `hash`, `files` |
| agent        | 代理           | `name`, `source?` |
| retry        | 重试记录       | `attempt`, `error`, `time` |
| compaction   | 压缩标记       | `auto` |
| subtask      | 子任务         | `prompt`, `description`, `agent`, `model?`, `command?` |

---

## 四、典型读写流程（代码映射）

1. **按目录解析出 project**  
   `Project.fromDirectory(dir)` → 得到 `project.id`，写入 `Storage.write(["project", id], project)`。

2. **创建会话**  
   `Session.createNext({ directory, ... })` → `Storage.write(["session", projectID, sessionID], session)`。

3. **列出某 project 的 session**  
   `Storage.list(["session", projectID])` → 得到 `[["session", projectID, sessionID], ...]`，再对每个 key `Storage.read(key)`。

4. **写入/更新消息**  
   `Session.updateMessage(msg)` → `Storage.write(["message", msg.sessionID, msg.id], msg)`。

5. **按 session 流式取消息（倒序）**  
   `MessageV2.stream(sessionID)` → `Storage.list(["message", sessionID])`，再对每个 messageID 调用 `MessageV2.get({ sessionID, messageID })`。

6. **取一条消息的 parts**  
   `MessageV2.parts(messageID)` → `Storage.list(["part", messageID])`，再对每个 part key `Storage.read(item)`，按 `id` 排序。

7. **写入/更新 part**  
   `Session.updatePart(part)` → `Storage.write(["part", part.messageID, part.id], part)`。

8. **删除 session（级联）**  
   `Session.remove(sessionID)`：先列 `Storage.list(["message", sessionID])`，对每条 message 列 `Storage.list(["part", messageID])` 删 part，再删 message，最后删 `["session", projectID, sessionID]`。

---

## 五、迁移与兼容（storage 迁移 #0）

旧版把 session/message/part 放在**各 project 目录**下（如 `<project>/storage/session/...`）。  
当前版本统一到**全局** `<storage>/session|message|part` 下：

- 迁移会从旧 `project/` 下扫描 session/message/part，写入新路径；
- project 自身改为 `storage/project/<projectID>.json`（Git 项目用根 commit 作为 projectID）。

详见 `packages/opencode/src/storage/storage.ts` 中 `MIGRATIONS[0]`。

---

## 六、小结表

| 层级    | 路径模式                         | 归属关系        | 主要命名空间/类型        |
|---------|----------------------------------|-----------------|---------------------------|
| project | `project/<id>.json`              | 顶层            | `Project.Info`            |
| session | `session/<projectID>/<id>.json`  | 属于 project    | `Session.Info`           |
| message | `message/<sessionID>/<id>.json`  | 属于 session    | `MessageV2.Info` (User/Assistant) |
| part    | `part/<messageID>/<id>.json`     | 属于 message    | `MessageV2.Part`（多 type） |

整体上：**Project → Session → Message → Part** 为四级归属，全部以 JSON 文件形式存放在 `<storage>/` 下对应子目录中，通过 `Storage.read/write/update/list/remove` 统一访问。
