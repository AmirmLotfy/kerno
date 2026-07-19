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
