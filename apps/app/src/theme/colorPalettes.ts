import type { ResolvedTheme } from "@mobile/theme/resolveTheme";

export type ThemeColors = {
  readonly isDark: boolean;
  readonly background: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly card: string;
  // Interactive control surface (text inputs, dropdowns, link rows that sit ON a card).
  // Light = white; dark = a recessed surface so the control reads against the card.
  readonly field: string;
  // Subtle inset/neutral surface (was #FAFAFA-style fills nested inside cards).
  readonly fieldMuted: string;
  readonly ink: string;
  readonly muted: string;
  // Inline hyperlink / "Link your account here" affordance (was a hardcoded blue).
  readonly link: string;
  readonly primary: string;
  readonly primaryDark: string;
  readonly primarySoft: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly textSoft: string;
  readonly warningSoft: string;
  readonly white: string;
  readonly danger: string;
};

export const lightColors: ThemeColors = {
  isDark: false,
  background: "#F6F6F6",
  border: "#E4E4E4",
  borderStrong: "#D8E2D9",
  card: "#FFFFFF",
  field: "#FFFFFF",
  fieldMuted: "#FAFAFA",
  ink: "#3B3B3B",
  muted: "#7F7F7F",
  link: "#0064D6",
  primary: "#00CC99",
  primaryDark: "#00AA80",
  primarySoft: "#D8F8EF",
  accent: "#005D46",
  accentSoft: "#007D5E",
  textSoft: "#989898",
  warningSoft: "#FFF7E6",
  white: "#FFFFFF",
  danger: "#CD0D0D",
};

export const darkColors: ThemeColors = {
  isDark: true,
  background: "#0F1110",
  border: "#2A302E",
  borderStrong: "#3A4541",
  card: "#1A1F1D",
  field: "#121615",
  fieldMuted: "#161B19",
  ink: "#E8ECEA",
  muted: "#9AA3A0",
  link: "#5B9BFF",
  primary: "#00CC99",
  primaryDark: "#33D9AD",
  primarySoft: "#0D3D32",
  accent: "#5EEAD4",
  accentSoft: "#2DD4AA",
  textSoft: "#6B7572",
  warningSoft: "#3D3520",
  white: "#FFFFFF",
  danger: "#F87171",
};

export function getColorsForTheme(resolved: ResolvedTheme): ThemeColors {
  return resolved === "dark" ? darkColors : lightColors;
}

/**
 * Pick a light- or dark-mode value inside a `createXStyles(colors)` factory.
 *
 * Use this for brand / web-parity tints that must keep their exact light hex (some
 * source-parity tests assert the literal) while still adapting in dark mode, e.g.
 * `backgroundColor: pickThemed(colors, "#F3FCF9", colors.primarySoft)`.
 */
export function pickThemed<T>(colors: ThemeColors, light: T, dark: T): T {
  return colors.isDark ? dark : light;
}
