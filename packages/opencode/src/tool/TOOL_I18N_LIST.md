# 工具（tools）英文说明清单

以下为 `packages/opencode/src/tool` 下所有面向模型/用户的英文文案，便于统一翻译或国际化。

---

## 一、独立 .txt 文件（工具主描述）

| 文件 | 用途 |
|------|------|
| `apply_patch.txt` | apply_patch 工具描述 |
| `bash.txt` | bash 工具描述（含 `${directory}` 等占位符） |
| `batch.txt` | batch 工具描述 |
| `codesearch.txt` | codesearch 工具描述 |
| `edit.txt` | edit 工具描述 |
| `glob.txt` | glob 工具描述 |
| `grep.txt` | grep 工具描述 |
| `ls.txt` | ls 工具描述 |
| `lsp.txt` | lsp 工具描述 |
| `multiedit.txt` | multiedit 工具描述 |
| `plan-enter.txt` | plan_enter 工具描述 |
| `plan-exit.txt` | plan_exit 工具描述 |
| `question.txt` | question 工具描述 |
| `read.txt` | read 工具描述 |
| `task.txt` | task 工具描述（含 `{agents}` 占位符） |
| `todowrite.txt` | todowrite 工具描述 |
| `todoread.txt` | 未以 .txt 形式使用，todoread 描述在 todo.ts 内联 |
| `webfetch.txt` | webfetch 工具描述 |
| `websearch.txt` | websearch 工具描述（含 `{{date}}` 占位符） |
| `write.txt` | write 工具描述 |

---

## 二、.ts 内联英文（参数 schema `.describe()`）

### task.ts
- `"A short (3-5 words) description of the task"`
- `"The task for the agent to perform"`
- `"The type of specialized agent to use for this task"`
- `"This should only be set if you mean to resume a previous task (you can pass a prior task_id and the task will continue the same subagent session as before instead of creating a fresh one)"`
- `"The command that triggered this task"`

### read.ts
- `"The path to the file to read"`
- `"The line number to start reading from (0-based)"`
- `"The number of lines to read (defaults to 2000)"`

### write.ts
- `"The content to write to the file"`
- `"The absolute path to the file to write (must be absolute, not relative)"`

### webfetch.ts
- `"The URL to fetch content from"`
- `"The format to return the content in (text, markdown, or html). Defaults to markdown."`
- `"Optional timeout in seconds (max 120)"`

### websearch.ts
- `"Websearch query"`
- `"Number of search results to return (default: 8)"`
- `"Live crawl mode - 'fallback': use live crawling as backup if cached content unavailable, 'preferred': prioritize live crawling (default: 'fallback')"`
- `"Search type - 'auto': balanced search (default), 'fast': quick results, 'deep': comprehensive search"`
- `"Maximum characters for context string optimized for LLMs (default: 10000)"`

### todo.ts
- `"The updated todo list"`（todowrite 参数）
- `"Use this tool to read your todo list"`（todoread 工具描述，内联）

### question.ts
- `"Questions to ask"`

### multiedit.ts
- `"The absolute path to the file to modify"`
- `"The text to replace"`
- `"The text to replace it with (must be different from oldString)"`
- `"Replace all occurrences of oldString (default false)"`
- `"Array of edit operations to perform sequentially on the file"`

### lsp.ts
- `"The LSP operation to perform"`
- `"The absolute or relative path to the file"`
- `"The line number (1-based, as shown in editors)"`
- `"The character offset (1-based, as shown in editors)"`

### grep.ts
- `"The regex pattern to search for in file contents"`
- `"The directory to search in. Defaults to the current working directory."`
- `'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")'`

### ls.ts
- `"The absolute path to the directory to list (must be absolute, not relative)"`
- `"List of glob patterns to ignore"`

### glob.ts
- `"The glob pattern to match files against"`
- `"The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter \"undefined\" or \"null\" - simply omit it for the default behavior. Must be a valid directory path if provided."`

### edit.ts
- `"The absolute path to the file to modify"`
- `"The text to replace"`
- `"The text to replace it with (must be different from oldString)"`
- `"Replace all occurrences of oldString (default false)"`

### codesearch.ts
- `"Search query to find relevant context for APIs, Libraries, and SDKs. For example, 'React useState hook examples', 'Python pandas dataframe filtering', 'Express.js middleware', 'Next js partial prerendering configuration'"`
- `"Number of tokens to return (1000-50000). Default is 5000 tokens. Adjust this value based on how much context you need - use lower values for focused queries and higher values for comprehensive documentation."`

### batch.ts
- `"The name of the tool to execute"`
- `"Parameters for the tool"`
- `"Array of tool calls to execute in parallel"`

### bash.ts
- `"The command to execute"`
- `"Optional timeout in milliseconds"`
- `"The working directory to run the command in. Defaults to ${Instance.directory}. Use this instead of 'cd' commands."`
- `"Clear, concise description of what this command does in 5-10 words. Examples:\nInput: ls\nOutput: Lists files in current directory\n\nInput: git status\nOutput: Shows working tree status\n\nInput: npm install\nOutput: Installs package dependencies\n\nInput: mkdir foo\nOutput: Creates directory 'foo'"`

### apply_patch.ts
- `"The full patch text that describes all changes to be made"`

### skill.ts
- `` `The name of the skill from available_skills${hint}` ``（含动态 hint）

### invalid.ts
- `"Do not use"`（无效工具描述）

---

## 三、.ts 内联英文（UI/流程文案，非 schema）

### plan.ts
- Question 文案：`"Plan at ${plan} is complete. Would you like to switch to the build agent and start implementing?"`
- header：`"Build Agent"`
- options：`"Switch to build agent and start implementing the plan"` / `"Stay with plan agent to continue refining the plan"`
- 写入 user 消息：`"The plan at ${plan} has been approved, you can now edit files. Execute the plan"`
- 返回 title：`"Switching to build agent"`
- 返回 output：`"User approved switching to build agent. Wait for further instructions."`
- Question 文案：`"Would you like to switch to the plan agent and create a plan saved to ${plan}?"`
- header：`"Plan Mode"`
- options：`"Switch to plan agent for research and planning"` / `"Stay with build agent to continue making changes"`
- 以及 plan_enter 的后续 title/output 等

### tool.ts（Tool.define 抛错）
- `"The ${id} tool was called with invalid arguments: ${error}.\nPlease rewrite the input so it satisfies the expected schema."`

### task.ts
- 子 agent 默认描述：`"This subagent should only be called manually by the user."`（当 agent 无 description 时）

---

## 四、汇总统计

- **.txt 主描述**：20 个文件
- **参数 .describe()**：约 50+ 处（分布在 18 个 .ts 文件）
- **plan / task / todo / tool 内联 UI 或错误文案**：约 15+ 处

如需全部中文化，建议顺序：先改 20 个 .txt，再批量改各 .ts 中的 `.describe(...)` 与 plan/task/todo/tool 的内联英文字符串。
