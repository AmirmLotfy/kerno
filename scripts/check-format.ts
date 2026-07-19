import { readFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const { stdout } = await execFile("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]); const files = stdout.split("\0").filter(Boolean).filter((path) => /\.(?:ts|tsx|js|mjs|cjs|json|md|toml|ya?ml)$/.test(path));
const failures: string[] = [];
for (const path of files) {
  const text = await readFile(path, "utf8");
  if (text.includes("\r\n")) failures.push(`${path}: CRLF line endings`);
  text.split("\n").forEach((line, index) => { if (/[ \t]+$/.test(line)) failures.push(`${path}:${index + 1}: trailing whitespace`); });
  if (text && !text.endsWith("\n")) failures.push(`${path}: missing final newline`);
}
if (failures.length) { process.stderr.write(`${failures.join("\n")}\n`); process.exit(1); }
process.stdout.write(`Formatting hygiene passed for ${files.length} tracked text files.\n`);
