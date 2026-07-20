import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir(".kerno", { recursive: true, mode: 0o700 });
const config = `[mcp_servers.kerno]\ncommand = "node"\nargs = ["${resolve("plugins/kerno/dist/kerno-mcp.cjs").replaceAll("\\", "\\\\")}"]\nenv = { KERNO_DATA_DIR = "${resolve(".kerno").replaceAll("\\", "\\\\")}", KERNO_MCP_STANDALONE = "1" }\n`;
await writeFile(".kerno/judge-mcp.toml", config, { mode: 0o600 });
process.stdout.write("Generated .kerno/judge-mcp.toml fallback. The repository .codex/config.toml remains the supported project-scoped default.\n");
