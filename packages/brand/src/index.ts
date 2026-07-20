export const kernoPalette = {
  orange: {
    50: "#FFF3EC", 100: "#FDE2D2", 200: "#F9C3A5", 300: "#F4A071", 400: "#EE7A45",
    500: "#E85D2A", 600: "#C9471C", 700: "#A63818", 800: "#7E2D1A", 900: "#592318"
  },
  graphite: { 950: "#141312", 900: "#1C1B1A", 800: "#302D2A", 700: "#49443F", 600: "#615B55" },
  ivory: "#F7F3EC",
  surface: "#FFFDF9",
  surfaceMuted: "#F0EBE3",
  stone: "#DCD4C9",
  stoneDark: "#B9AEA1",
  textMuted: "#746D65",
  aubergine: { 500: "#673A52", 600: "#532D41", soft: "#EFE3E9" }
} as const;

export const semanticPalette = {
  success: "#397052", successSoft: "#E5F0E9",
  warning: "#B56A18", warningSoft: "#FAECD9",
  error: "#B74236", errorSoft: "#F8E4E1",
  info: "#59677D", infoSoft: "#E7EAF0"
} as const;

export const darkPalette = {
  background: "#141312", surface: "#1C1B1A", surfaceRaised: "#272421", border: "#3A3531",
  text: "#F7F3EC", textMuted: "#AAA097", primary: "#F0703E", primaryHover: "#F58A5D", secondary: "#B77B98",
  success: "#8DBA9B", successSoft: "#203A2C", warning: "#E3A458", warningSoft: "#422E1B",
  error: "#E57C72", errorSoft: "#442522", info: "#A5B0C3", infoSoft: "#2A303B"
} as const;

export const chartPalette = [
  "#E85D2A", "#673A52", "#D89545", "#8A5A44",
  "#746D65", "#B74236", "#9B7B62", "#302D2A"
] as const;

export const comparisonPalette = { baseline: "#B9AEA1", kerno: "#E85D2A" } as const;

/** Self-contained semantic tokens for sandboxed MCP Apps UI resources. */
export const kernoAppTokenCss = `
:root {
  --background: ${kernoPalette.ivory};
  --surface: ${kernoPalette.surface};
  --surface-raised: ${kernoPalette.surface};
  --surface-muted: ${kernoPalette.surfaceMuted};
  --text-primary: ${kernoPalette.graphite[900]};
  --text-secondary: ${kernoPalette.graphite[700]};
  --text-muted: ${kernoPalette.textMuted};
  --border: ${kernoPalette.stone};
  --border-strong: ${kernoPalette.stoneDark};
  --brand-primary: ${kernoPalette.orange[500]};
  --brand-primary-hover: ${kernoPalette.orange[600]};
  --brand-primary-soft: ${kernoPalette.orange[50]};
  --on-brand-primary: ${kernoPalette.graphite[900]};
  --brand-secondary: ${kernoPalette.aubergine[500]};
  --brand-secondary-soft: ${kernoPalette.aubergine.soft};
  --success: ${semanticPalette.success};
  --success-soft: ${semanticPalette.successSoft};
  --warning: ${semanticPalette.warning};
  --warning-soft: ${semanticPalette.warningSoft};
  --error: ${semanticPalette.error};
  --error-soft: ${semanticPalette.errorSoft};
  --info: ${semanticPalette.info};
  --info-soft: ${semanticPalette.infoSoft};
  --shadow: rgb(20 19 18 / 10%);
  color-scheme: light;
}
:root[data-theme="dark"] {
  --background: ${darkPalette.background};
  --surface: ${darkPalette.surface};
  --surface-raised: ${darkPalette.surfaceRaised};
  --surface-muted: ${kernoPalette.graphite[800]};
  --text-primary: ${darkPalette.text};
  --text-secondary: ${darkPalette.textMuted};
  --text-muted: ${darkPalette.textMuted};
  --border: ${darkPalette.border};
  --border-strong: ${kernoPalette.graphite[600]};
  --brand-primary: ${darkPalette.primary};
  --brand-primary-hover: ${darkPalette.primaryHover};
  --brand-primary-soft: ${kernoPalette.orange[900]};
  --on-brand-primary: ${kernoPalette.graphite[950]};
  --brand-secondary: ${darkPalette.secondary};
  --brand-secondary-soft: ${kernoPalette.aubergine[600]};
  --success: ${darkPalette.success};
  --success-soft: ${darkPalette.successSoft};
  --warning: ${darkPalette.warning};
  --warning-soft: ${darkPalette.warningSoft};
  --error: ${darkPalette.error};
  --error-soft: ${darkPalette.errorSoft};
  --info: ${darkPalette.info};
  --info-soft: ${darkPalette.infoSoft};
  --shadow: rgb(0 0 0 / 28%);
  color-scheme: dark;
}
`.trim();
