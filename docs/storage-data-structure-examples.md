# OpenCode 存储与交互数据：完整结构示例

本文档用**目录树 + 完整 JSON 示例**展示一次完整交互在磁盘上的存储形态，便于一眼看懂「存了什么」以及「和模型的交互数据」分别对应哪些文件与字段。

---

## 一、存储根目录与数据分类

**根目录**（默认）：

- Linux/macOS：`~/.local/share/opencode/storage`
- Windows：`%LOCALAPPDATA%\opencode\storage`

**两类数据**：

| 类型           | 含义                     | 主要位置 |
|----------------|--------------------------|----------|
| **存储/状态**  | 项目、会话元信息、配置等 | `project/`, `session/`, `session_diff/`, `migration` 等 |
| **交互数据**  | 与模型的对话内容         | `message/`, `part/`（用户输入 + 助手回复的正文与工具调用等） |

下面用一次「用户发一句话、模型回复一句话并调了一次工具」的完整示例，把目录和 JSON 对应起来。

---

## 二、目录树示例（一次完整交互后）

假设：项目 ID 为 `a1b2c3d4`（Git 根 commit），会话 ID 为 `session_xyz`，该会话内有一次交互（1 条 user + 1 条 assistant，assistant 含 1 个 text part + 1 个 tool part）。

```
storage/
├── migration                    # 迁移进度（数字）
├── project/
│   └── a1b2c3d4.json           # 项目元信息
├── session/
│   └── a1b2c3d4/
│       └── session_xyz.json     # 会话元信息
├── session_diff/
│   └── session_xyz.json        # 可选：该会话的 diff 列表
├── message/
│   └── session_xyz/
│       ├── msg_user_001.json   # 用户消息元信息
│       └── msg_ast_002.json    # 助手消息元信息
└── part/
    ├── msg_user_001/
    │   └── part_text_001.json  # 用户输入正文
    └── msg_ast_002/
        ├── part_step_001.json  # 步骤开始
        ├── part_text_002.json  # 助手回复正文
        └── part_tool_003.json  # 工具调用（如 grep）
```

**对应关系**：

- **与模型的交互数据**：`message/<sessionID>/*.json` + `part/<messageID>/*.json`  
  - 谁说了什么、模型用了什么工具、推理/步骤等，都在这些 JSON 里。
- **会话/项目状态**：`project/*.json`、`session/<projectID>/*.json`、`session_diff/*.json`  
  - 标题、目录、摘要、时间等，不直接包含对话正文。

---

## 三、各文件 JSON 结构示例（一目了然）

### 1. 项目 — `project/a1b2c3d4.json`（存储数据）

```json
{
  "id": "a1b2c3d4",
  "worktree": "D:/workspace/my-repo",
  "vcs": "git",
  "name": "My Project",
  "time": {
    "created": 1700000000000,
    "updated": 1700000100000,
    "initialized": 1700000050000
  },
  "sandboxes": ["D:/workspace/my-repo"]
}
```

- **用途**：当前工作区/仓库的元信息，和「哪次对话」无关，属于**存储/状态**。

---

### 2. 会话 — `session/a1b2c3d4/session_xyz.json`（存储数据）

```json
{
  "id": "session_xyz",
  "slug": "abc12",
  "projectID": "a1b2c3d4",
  "directory": "D:/workspace/my-repo",
  "title": "New session - 2025-01-15T10:00:00.000Z",
  "version": "0.1.0",
  "time": {
    "created": 1700000000000,
    "updated": 1700000200000
  },
  "summary": {
    "additions": 5,
    "deletions": 2,
    "files": 1
  }
}
```

- **用途**：这一条对话会话的元信息（标题、目录、统计等），不包含具体消息内容，属于**存储/状态**。

---

### 3. 用户消息 — `message/session_xyz/msg_user_001.json`（交互数据）

```json
{
  "id": "msg_user_001",
  "sessionID": "session_xyz",
  "role": "user",
  "time": { "created": 1700000100000 },
  "agent": "build",
  "model": {
    "providerID": "opencode",
    "modelID": "gpt-5-nano"
  }
}
```

- **用途**：这条用户消息的**元信息**（谁、何时、用哪个 agent/模型）。  
- **正文**：不在此文件，在 **part** 里（见下一节）。  
- 属于**与模型的交互数据**（标识「用户发了一条消息」）。

---

### 4. 用户消息的 Part — `part/msg_user_001/part_text_001.json`（交互数据）

```json
{
  "id": "part_text_001",
  "sessionID": "session_xyz",
  "messageID": "msg_user_001",
  "type": "text",
  "text": "在 src 目录下搜索 TODO"
}
```

- **用途**：用户这条消息的**实际内容**（纯文字）。若有附件/@agent，还会有 `type: "file"`、`type: "agent"` 等 part。  
- 属于**与模型的交互数据**（模型看到的输入）。

---

### 5. 助手消息 — `message/session_xyz/msg_ast_002.json`（交互数据）

```json
{
  "id": "msg_ast_002",
  "sessionID": "session_xyz",
  "role": "assistant",
  "parentID": "msg_user_001",
  "time": {
    "created": 1700000101000,
    "completed": 1700000150000
  },
  "modelID": "gpt-5-nano",
  "providerID": "opencode",
  "mode": "build",
  "agent": "build",
  "path": {
    "cwd": "D:/workspace/my-repo",
    "root": "D:/workspace/my-repo"
  },
  "cost": 0.002,
  "tokens": {
    "input": 100,
    "output": 50,
    "reasoning": 0,
    "cache": { "read": 0, "write": 0 }
  },
  "finish": "stop"
}
```

- **用途**：这条助手回复的**元信息**（模型、耗时、token、是否结束等）。  
- **正文与工具调用**：不在此文件，在 **part** 里。  
- 属于**与模型的交互数据**（标识「模型完成了一条回复」）。

---

### 6. 助手 Part：步骤开始 — `part/msg_ast_002/part_step_001.json`（交互数据）

```json
{
  "id": "part_step_001",
  "sessionID": "session_xyz",
  "messageID": "msg_ast_002",
  "type": "step-start",
  "snapshot": "snap_abc123"
}
```

- **用途**：标记模型「开始一步」、可选带快照。  
- 属于**与模型的交互数据**（多步推理/执行时的结构）。

---

### 7. 助手 Part：正文 — `part/msg_ast_002/part_text_002.json`（交互数据）

```json
{
  "id": "part_text_002",
  "sessionID": "session_xyz",
  "messageID": "msg_ast_002",
  "type": "text",
  "text": "正在用 grep 在 src 下搜索 TODO…",
  "time": { "start": 1700000102000, "end": 1700000140000 }
}
```

- **用途**：模型回复的**可见正文**。  
- 属于**与模型的交互数据**（用户和模型对话的主体内容）。

---

### 8. 助手 Part：工具调用 — `part/msg_ast_002/part_tool_003.json`（交互数据）

```json
{
  "id": "part_tool_003",
  "sessionID": "session_xyz",
  "messageID": "msg_ast_002",
  "type": "tool",
  "callID": "call_ulid_xxx",
  "tool": "grep",
  "state": {
    "status": "completed",
    "input": { "pattern": "TODO", "path": "src" },
    "output": "src/main.ts:10  // TODO: refactor",
    "title": "grep",
    "metadata": {},
    "time": {
      "start": 1700000120000,
      "end": 1700000130000
    }
  }
}
```

- **用途**：模型调用的**工具**（如 grep、read、edit）及入参/结果。  
- 属于**与模型的交互数据**（模型行为与结果）。

---

## 四、交互数据与存储数据对照表

| 文件/目录 | 数据类型   | 说明 |
|-----------|------------|------|
| `project/*.json` | 存储数据 | 项目信息，与单次对话无关 |
| `session/<projectID>/*.json` | 存储数据 | 会话元信息（标题、目录、时间等） |
| `session_diff/*.json` | 存储数据 | 会话 diff 汇总 |
| `message/<sessionID>/*.json` | **交互数据** | 每条消息的元信息（user/assistant、模型、token 等） |
| `part/<messageID>/*.json` | **交互数据** | 消息正文、推理、工具调用、步骤等**具体内容** |

**一句话**：  
- 想看清「和模型交互了什么」：看 `message/` + `part/`。  
- 想看清「项目/会话的配置与状态」：看 `project/`、`session/`、`session_diff/`。

---

## 五、Part 类型速查（交互内容形态）

| type | 含义 | 常见字段示例 |
|------|------|-----------------------------|
| `text` | 文本内容 | `text`, `synthetic?`, `time?` |
| `reasoning` | 推理过程 | `text`, `time` |
| `file` | 附件 | `mime`, `url`, `filename?` |
| `tool` | 工具调用 | `tool`, `callID`, `state`（含 input/output/status） |
| `step-start` | 步骤开始 | `snapshot?` |
| `step-finish` | 步骤结束 | `reason`, `cost`, `tokens` |
| `patch` | 文件变更摘要 | `hash`, `files` |
| `agent` | @提及的 agent | `name` |
| `subtask` | 子任务 | `prompt`, `description`, `agent` |
| `compaction` | 压缩标记 | `auto` |
| `retry` | 重试记录 | `attempt`, `error` |

所有 part 都含：`id`, `sessionID`, `messageID`, `type`。

---

## 六、如何分析你本地的存储目录

若你本机已有 OpenCode 的完整交互数据，可用仓库内脚本做一次统计与摘要。

**默认存储位置**：

- Windows：`%LOCALAPPDATA%\opencode\storage`
- Linux/macOS：`~/.local/share/opencode/storage`

**运行分析脚本**（在 `packages/opencode` 下执行）：

```bash
# 使用默认路径（见上）
bun run script/analyze-storage.ts

# 或指定你的 storage 目录（例如数据在别处或备份目录）
bun run script/analyze-storage.ts "D:/backup/opencode/storage"
```

也可设置环境变量 `OPENCODE_STORAGE` 指向 storage 目录后再运行（不传参即可）。

脚本会输出：项目数、会话数、消息数、part 数，以及每个 project → session → message → part 的树形摘要（含标题、角色、part 类型等），便于对照本文档理解「整盘存储」和「模型交互数据」的分布。

若当前默认路径下没有数据，可先跑一次 OpenCode 并产生几次对话，再运行脚本；若数据在其他目录，请把该目录作为第一个参数传入。
