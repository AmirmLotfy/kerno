import { darkPalette, kernoPalette, semanticPalette } from "@kerno/brand";

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
};
const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
};

const pairs = [
  ["light primary text", kernoPalette.graphite[900], kernoPalette.ivory, 4.5],
  ["light muted text", kernoPalette.textMuted, kernoPalette.ivory, 4.5],
  ["surface muted text", kernoPalette.textMuted, kernoPalette.surface, 4.5],
  ["primary CTA label", kernoPalette.graphite[900], kernoPalette.orange[500], 4.5],
  ["brand text", kernoPalette.orange[700], kernoPalette.ivory, 4.5],
  ["aubergine text", kernoPalette.aubergine[500], kernoPalette.surface, 4.5],
  ["success text", semanticPalette.success, kernoPalette.surface, 4.5],
  ["error text", semanticPalette.error, kernoPalette.surface, 4.5],
  ["information text", semanticPalette.info, kernoPalette.surface, 4.5],
  ["focus indicator", kernoPalette.orange[600], kernoPalette.ivory, 3],
  ["dark primary text", darkPalette.text, darkPalette.background, 4.5],
  ["dark surface text", darkPalette.text, darkPalette.surface, 4.5],
  ["dark muted text", darkPalette.textMuted, darkPalette.surface, 4.5],
  ["dark primary accent", darkPalette.primary, darkPalette.surface, 3],
  ["dark CTA label", darkPalette.background, darkPalette.primary, 4.5],
  ["dark reviewer text", darkPalette.secondary, darkPalette.surface, 4.5],
  ["dark success text", darkPalette.success, darkPalette.surface, 4.5],
  ["dark warning text", darkPalette.warning, darkPalette.surface, 4.5],
  ["dark error text", darkPalette.error, darkPalette.surface, 4.5],
  ["dark information text", darkPalette.info, darkPalette.surface, 4.5]
] as const;

const failures: string[] = [];
for (const [name, foreground, background, minimum] of pairs) {
  const ratio = contrast(foreground, background);
  process.stdout.write(`${name}: ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)\n`);
  if (ratio < minimum) failures.push(`${name}: ${ratio.toFixed(2)}:1`);
}
if (failures.length) {
  process.stderr.write(`Contrast audit failed:\n${failures.join("\n")}\n`);
  process.exitCode = 1;
} else process.stdout.write(`WCAG contrast audit passed for ${pairs.length} required pairs.\n`);
