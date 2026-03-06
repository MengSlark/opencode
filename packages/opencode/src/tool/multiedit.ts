import z from "zod"
import { Tool } from "./tool"
import { EditTool } from "./edit"
import DESCRIPTION from "./multiedit.txt"
import path from "path"
import { Instance } from "../project/instance"

export const MultiEditTool = Tool.define("multiedit", {
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z.string().describe("要修改文件的绝对路径"),
    edits: z
      .array(
        z.object({
          filePath: z.string().describe("要修改文件的绝对路径"),
          oldString: z.string().describe("要被替换的文本"),
          newString: z.string().describe("用于替换的文本（必须与 oldString 不同）"),
          replaceAll: z.boolean().optional().describe("是否替换所有 oldString 出现处（默认 false）"),
        }),
      )
      .describe("按顺序对该文件执行的编辑操作数组"),
  }),
  async execute(params, ctx) {
    const tool = await EditTool.init()
    const results = []
    for (const [, edit] of params.edits.entries()) {
      const result = await tool.execute(
        {
          filePath: params.filePath,
          oldString: edit.oldString,
          newString: edit.newString,
          replaceAll: edit.replaceAll,
        },
        ctx,
      )
      results.push(result)
    }
    return {
      title: path.relative(Instance.worktree, params.filePath),
      metadata: {
        results: results.map((r) => r.metadata),
      },
      output: results.at(-1)!.output,
    }
  },
})
