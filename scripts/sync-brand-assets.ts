import { copyFile, mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

const source = resolve("packages/brand/assets");
const dashboard = resolve("apps/dashboard/public/brand");
const docs = resolve("docs/assets/brand");
const plugin = resolve("plugins/kerno/assets");

const assets = [
  "context-core-primary-light.svg",
  "context-core-primary-dark.svg",
  "context-core-favicon.svg",
  "context-core-monochrome-dark.svg",
  "context-core-monochrome-light.svg",
  "context-core-micro.svg",
  "context-core-launcher.svg",
  "kerno-horizontal-light.svg",
  "kerno-horizontal-dark.svg",
  "kerno-social-avatar.svg",
  "kerno-open-graph.svg",
  "kerno-devpost-thumbnail.svg"
];

await Promise.all([dashboard, docs, plugin].map((directory) => mkdir(directory, { recursive: true })));
for (const asset of assets) {
  for (const target of [dashboard, docs]) await copyFile(resolve(source, asset), resolve(target, basename(asset)));
}

const pluginNames: Record<string, string> = {
  "context-core-primary-light.svg": "icon.svg",
  "context-core-primary-dark.svg": "icon-dark.svg",
  "context-core-favicon.svg": "favicon.svg",
  "context-core-monochrome-dark.svg": "icon-monochrome-dark.svg",
  "context-core-monochrome-light.svg": "icon-monochrome-light.svg",
  "context-core-micro.svg": "icon-micro.svg",
  "context-core-launcher.svg": "launcher.svg",
  "kerno-horizontal-light.svg": "logo.svg",
  "kerno-horizontal-dark.svg": "logo-dark.svg",
  "kerno-social-avatar.svg": "social-avatar.svg",
  "kerno-open-graph.svg": "open-graph.svg",
  "kerno-devpost-thumbnail.svg": "devpost-thumbnail.svg"
};
for (const [asset, name] of Object.entries(pluginNames)) await copyFile(resolve(source, asset), resolve(plugin, name));
await copyFile(resolve(source, "context-core-favicon.svg"), resolve(dashboard, "favicon.svg"));

process.stdout.write(`Synchronized ${assets.length} canonical Kerno brand assets.\n`);
