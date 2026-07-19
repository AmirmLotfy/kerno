import { access, readFile } from "node:fs/promises";
import { resolve, dirname, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";

const files = spawnSync("git", ["ls-files", "*.md"], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean);
const failures: string[] = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of files) {
  const body = await readFile(file, "utf8");
  for (const match of body.matchAll(linkPattern)) {
    const raw = match[1]!.trim().replace(/^<|>$/g, "");
    if (!raw || raw.startsWith("#") || /^(https?:|mailto:)/.test(raw)) continue;
    const withoutFragment = decodeURIComponent(raw.split("#", 1)[0]!);
    if (!withoutFragment) continue;
    const target = isAbsolute(withoutFragment) ? withoutFragment : resolve(dirname(file), withoutFragment);
    await access(target).catch(() => failures.push(`${file}: ${raw}`));
  }
}
if (failures.length) throw new Error(`Broken local Markdown links:\n${failures.join("\n")}`);
process.stdout.write(`Validated local Markdown links in ${files.length} tracked files.\n`);
