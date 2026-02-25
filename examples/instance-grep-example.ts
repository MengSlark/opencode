import path from "path"
import { GrepTool } from "../packages/opencode/src/tool/grep"
import { Instance } from "../packages/opencode/src/project/instance"

const ctx = {
  sessionID: "example",
  messageID: "",
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

const projectRoot = path.join(__dirname, "..", "packages/opencode")

async function main() {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const grep = await GrepTool.init()
      const result = await grep.execute(
        {
          pattern: "export",
          path: path.join(projectRoot, "src/tool"),
          include: "*.ts",
        },
        ctx,
      )
      console.log(result.output)
    },
  })
}

main()
