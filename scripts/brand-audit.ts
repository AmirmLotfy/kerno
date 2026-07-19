import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const root = resolve(".");
const { stdout } = await execFile("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
const files = stdout.split("\0").filter(Boolean);
const textFiles = files.filter((path) => /\.(?:css|tsx?|jsx?|mjs|cjs|html|json|svg|md|toml|ya?ml)$/.test(path) && path !== "package-lock.json" && path !== "scripts/brand-audit.ts" && !path.startsWith("benchmarks/recorded-results/"));
const failures: string[] = [];
const oldColors = ["#171612", "#191814", "#246a50", "#345d73", "#654b3e", "#6d685e", "#93411f", "#9b3f34", "#c9c1b1", "#d9d2c4", "#dce7eb", "#dce9df", "#e7dfcf", "#e8e2d7", "#eee7da", "#ef6837", "#efdad5", "#f36b32", "#f3efe5", "#f7dfd1", "#fbf8ef", "#fffaf0"];
const userFacingCode = /^(?:apps\/dashboard\/src|apps\/dashboard\/index\.html|plugins\/kerno\/(?:\.codex-plugin|README)|README\.md)/;

for (const path of textFiles) {
  const source = await readFile(resolve(root, path), "utf8");
  if (path !== "docs/BRAND_AUDIT.md") for (const color of oldColors) if (source.toLowerCase().includes(color)) failures.push(`${path}: obsolete color ${color}`);
  if (userFacingCode.test(path) && !path.endsWith("index.html") && !path.endsWith("plugin.json")) {
    const raw = source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? [];
    if (raw.length) failures.push(`${path}: raw colors outside @kerno/brand (${[...new Set(raw)].join(", ")})`);
  }
}

const mappings: Array<[string, string]> = [
  ["context-core-primary-light.svg", "icon.svg"], ["context-core-primary-dark.svg", "icon-dark.svg"],
  ["context-core-monochrome-dark.svg", "icon-monochrome-dark.svg"], ["context-core-monochrome-light.svg", "icon-monochrome-light.svg"],
  ["context-core-micro.svg", "icon-micro.svg"], ["context-core-favicon.svg", "favicon.svg"],
  ["context-core-launcher.svg", "launcher.svg"], ["kerno-horizontal-light.svg", "logo.svg"],
  ["kerno-horizontal-dark.svg", "logo-dark.svg"], ["kerno-social-avatar.svg", "social-avatar.svg"],
  ["kerno-open-graph.svg", "open-graph.svg"], ["kerno-devpost-thumbnail.svg", "devpost-thumbnail.svg"]
];
for (const [canonical, plugin] of mappings) {
  const source = await readFile(resolve(root, "packages/brand/assets", canonical));
  const generated = await readFile(resolve(root, "plugins/kerno/assets", plugin));
  if (!source.equals(generated)) failures.push(`plugins/kerno/assets/${plugin}: differs from canonical ${canonical}`);
}

for (const icon of ["context-core-primary-light.svg", "context-core-primary-dark.svg", "context-core-monochrome-dark.svg", "context-core-monochrome-light.svg", "context-core-micro.svg"]) {
  const source = await readFile(resolve(root, "packages/brand/assets", icon), "utf8");
  if (/<(?:text|filter|linearGradient|radialGradient)\b/i.test(source)) failures.push(`${icon}: base icon contains disallowed text, filter, or gradient`);
  if (!/viewBox="0 0 (?:16|64) (?:16|64)"/.test(source)) failures.push(`${icon}: missing compact 16 or 64 viewBox`);
}

const manifest = JSON.parse(await readFile(resolve(root, "plugins/kerno/.codex-plugin/plugin.json"), "utf8"));
for (const reference of [manifest.interface?.composerIcon, manifest.interface?.logo, manifest.interface?.logoDark, ...(manifest.interface?.screenshots ?? [])]) {
  if (typeof reference !== "string") { failures.push("plugin manifest: missing brand asset reference"); continue; }
  try { await access(resolve(root, "plugins/kerno", reference)); } catch { failures.push(`plugin manifest: broken reference ${reference}`); }
}
const required = [
  "apps/dashboard/public/brand/favicon.svg", "apps/dashboard/public/brand/favicon-32.png", "apps/dashboard/public/brand/launcher-180.png",
  "docs/assets/brand/kerno-open-graph.png", "docs/assets/brand/kerno-devpost-thumbnail.png", "docs/assets/brand/social-avatar.png"
];
for (const path of required) try { await access(resolve(root, path)); } catch { failures.push(`${path}: required generated asset is missing`); }

const digest = createHash("sha256").update(await readFile(resolve(root, "packages/brand/src/tokens.css"))).digest("hex");
if (failures.length) {
  process.stderr.write(`Brand audit failed:\n${failures.join("\n")}\n`);
  process.exitCode = 1;
} else process.stdout.write(`Brand audit passed. Canonical token digest: ${digest}\n`);
