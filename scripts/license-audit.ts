import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
const allowed = /\b(?:MIT|ISC|Apache-2\.0|BSD-2-Clause|BSD-3-Clause|CC0-1\.0|CC-BY-4\.0|0BSD|BlueOak-1\.0\.0|Python-2\.0)\b/;
const findings: string[] = [];
let checked = 0;

const [rootLicense, pluginLicense] = await Promise.all([
  readFile(join(root, "LICENSE"), "utf8"),
  readFile(join(root, "plugins/kerno/LICENSE"), "utf8")
]);
if (rootLicense !== pluginLicense) findings.push("plugins/kerno/LICENSE does not exactly match the repository Apache-2.0 license");

for (const packagePath of Object.keys(lock.packages ?? {}).filter((path) => path.startsWith("node_modules/") && !path.includes("/node_modules/"))) {
  const lockEntry = lock.packages[packagePath];
  if (lockEntry?.link) continue;
  try {
    const metadata = JSON.parse(await readFile(join(root, packagePath, "package.json"), "utf8"));
    const license = typeof metadata.license === "string" ? metadata.license : Array.isArray(metadata.licenses) ? metadata.licenses.map((item: any) => item.type).join(" OR ") : "UNKNOWN";
    checked += 1;
    if (!allowed.test(license)) findings.push(`${metadata.name ?? packagePath}@${metadata.version ?? "unknown"}: ${license}`);
  } catch (error: any) {
    if (lockEntry?.optional && error?.code === "ENOENT") continue;
    findings.push(`${packagePath}: unreadable metadata (${error instanceof Error ? error.message : String(error)})`);
  }
}

if (findings.length) {
  process.stderr.write(`License audit found ${findings.length} unresolved package(s):\n${findings.join("\n")}\n`);
  process.exitCode = 1;
} else process.stdout.write(`License audit passed for ${checked} installed top-level/transitive packages.\n`);
