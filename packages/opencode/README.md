# js

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.12. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.


调试 
1. 终端 A：启动可调试 server
bun --inspect-brk=6499 --conditions=browser ./src/index.ts serve --hostname 127.0.0.1 --port 4096

2. VSCode：运行 Bun: Attach (6499) 附加到终端 A

3. 终端 B：启动 TUI 并连接这个 server
bun --conditions=browser ./src/index.ts attach http://127.0.0.1:4096 --dir d:\workspace\github\opencode
