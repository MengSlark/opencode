/**
 * 分析 OpenCode 存储目录，输出项目/会话/消息/片段的统计与结构摘要。
 *
 * 用法：
 *   bun run script/analyze-storage.ts [storage目录路径]
 *
 * 若不传路径，则使用：
 *   - OPENCODE_STORAGE 环境变量，或
 *   - %LOCALAPPDATA%\opencode\storage (Windows) / ~/.local/share/opencode/storage (其他)
 */

import path from "path"
import os from "os"

const storageRoot =
  process.argv[2] ??
  process.env.OPENCODE_STORAGE ??
  path.join(
    process.env.LOCALAPPDATA || process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
    "opencode",
    "storage",
  )

async function listJsonKeys(prefix: string[]): Promise<string[][]> {
  const dir = path.join(storageRoot, ...prefix)
  const entries: string[][] = []
  try {
    const names = await Array.fromAsync(new Bun.Glob("**/*.json").scan({ cwd: dir, onlyFiles: true }))
    for (const name of names) {
      const key = name.slice(0, -5).split(path.sep)
      entries.push([...prefix, ...key])
    }
  } catch {
    // 目录不存在或不可读
  }
  return entries.sort((a, b) => a.join("/").localeCompare(b.join("/")))
}

async function readJson<T = unknown>(key: string[]): Promise<T | undefined> {
  const file = path.join(storageRoot, ...key) + ".json"
  try {
    return (await Bun.file(file).json()) as T
  } catch {
    return undefined
  }
}

function formatTs(ms: number) {
  if (!ms || !Number.isFinite(ms)) return "-"
  return new Date(ms).toISOString()
}

async function main() {
  console.log("Storage 根目录:", storageRoot)
  console.log("")

  const projectKeys = await listJsonKeys(["project"])
  const sessionKeys = await listJsonKeys(["session"])
  const messageKeys = await listJsonKeys(["message"])
  const partKeys = await listJsonKeys(["part"])
  const diffKeys = await listJsonKeys(["session_diff"])

  console.log("========== 统计 ==========")
  console.log("项目 (project):     ", projectKeys.length)
  console.log("会话 (session):     ", sessionKeys.length)
  console.log("消息 (message):     ", messageKeys.length)
  console.log("片段 (part):        ", partKeys.length)
  console.log("会话 diff:         ", diffKeys.length)
  console.log("")

  if (projectKeys.length === 0 && sessionKeys.length === 0) {
    console.log("未发现 project/session 数据。请确认路径正确或先产生一次交互。")
    return
  }

  console.log("========== 项目列表 ==========")
  for (const key of projectKeys) {
    const projectID = key[key.length - 1]
    const p = await readJson<{ id: string; worktree?: string; name?: string; time?: { created?: number } }>(key)
    const worktree = p?.worktree ?? "-"
    const name = p?.name ?? projectID
    const created = p?.time?.created != null ? formatTs(p.time.created) : "-"
    console.log(`  [${projectID}] ${name}`)
    console.log(`      worktree: ${worktree}`)
    console.log(`      created:  ${created}`)
  }
  console.log("")

  console.log("========== 会话与消息结构（按 project → session → message/part）==========")
  const byProject = new Map<string, string[]>()
  for (const key of sessionKeys) {
    if (key.length < 3) continue
    const projectID = key[1]
    const sessionID = key[2]
    if (!byProject.has(projectID)) byProject.set(projectID, [])
    byProject.get(projectID)!.push(sessionID)
  }

  for (const [projectID, sessionIDs] of byProject) {
    console.log(`Project: ${projectID}`)
    for (const sessionID of sessionIDs) {
      const session = await readJson<{ title?: string; time?: { created?: number; updated?: number } }>([
        "session",
        projectID,
        sessionID,
      ])
      const title = session?.title ?? sessionID
      const created = session?.time?.created != null ? formatTs(session.time.created) : "-"
      console.log(`  Session: ${sessionID}`)
      console.log(`    title: ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`)
      console.log(`    created: ${created}`)

      const msgKeys = messageKeys.filter((k) => k.length >= 3 && k[1] === sessionID)
      for (const msgKey of msgKeys) {
        const messageID = msgKey[msgKey.length - 1]
        const msg = await readJson<{ role?: string; time?: { created?: number }; parentID?: string }>(msgKey)
        const role = msg?.role ?? "?"
        const created = msg?.time?.created != null ? formatTs(msg.time.created) : "-"
        const partKeysForMsg = partKeys.filter((k) => k.length >= 3 && k[1] === messageID)
        console.log(`    Message [${messageID}] role=${role} parts=${partKeysForMsg.length} created=${created}`)
        for (const partKey of partKeysForMsg) {
          const partID = partKey[partKey.length - 1]
          const part = await readJson<{ type?: string; text?: string; tool?: string }>(partKey)
          const type = part?.type ?? "?"
          const preview =
            part?.type === "text" && part?.text
              ? part.text.slice(0, 40).replace(/\n/g, " ") + (part.text.length > 40 ? "…" : "")
              : part?.type === "tool" && part?.tool
                ? `tool=${part.tool}`
                : ""
          console.log(`      Part [${partID}] type=${type} ${preview ? preview : ""}`)
        }
      }
      console.log("")
    }
  }

  console.log("========== 与模型的交互数据说明 ==========")
  console.log("  - message/<sessionID>/*.json   : 每条消息的元信息（user/assistant、模型、token 等）")
  console.log("  - part/<messageID>/*.json      : 消息正文、推理、工具调用等具体内容")
  console.log("  详见: docs/storage-data-structure-examples.md")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
