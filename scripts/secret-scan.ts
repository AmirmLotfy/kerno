import { execFile as execFileCallback } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const root = resolve(new URL("../", import.meta.url).pathname);
const { stdout } = await execFile("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root });
const patterns = [
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  /\bsk-(?!placeholder)[A-Za-z0-9_-]{20,}\b/,
  /\bgh[oprsu]_[A-Za-z0-9]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*["'](?!\[REDACTED\]|placeholder|example)[^"']{8,}["']/i
];
const findings: string[] = [];
for (const relativePath of stdout.split("\n").filter(Boolean)) {
  const path = resolve(root, relativePath);
  if ((await stat(path)).size > 5 * 1024 * 1024 || /\.(?:png|zip|sqlite|db|woff2?)$/i.test(relativePath)) continue;
  const text = await readFile(path, "utf8").catch(() => "");
  text.split("\n").forEach((line, index) => { if (patterns.some((pattern) => pattern.test(line))) findings.push(`${relativePath}:${index + 1}`); });
}
if (findings.length) {
  process.stderr.write(`Potential secrets found:\n${findings.join("\n")}\n`);
  process.exitCode = 1;
} else process.stdout.write("Secret scan passed; no high-confidence credential patterns were found.\n");
