/**
 * GoGoCash 1.1 — main design system (EN + TH, mobile + desktop).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=373-30789
 */
export const GOGOCASH_DESIGN_SYSTEM_FIGMA_URL =
  "https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=373-30789";

/** Figma variable names → hex (light mode). Use with `globals.css` `--gc-*` / `--ds-*`. */
export const designSystemColor = {
  mint: "#00cc99",
  green2: "#00aa80",
  green1: "#005d46",
  textBrand2: "#007d5e",
  white: "#ffffff",
  gray50: "#ffffff",
  gray100: "#f6f6f6",
  gray200: "#e4e4e4",
  gray300: "#a9a9a9",
  gray400: "#7f7f7f",
  gray500: "#3b3b3b",
  gray600: "#656565",
  gray700: "#4c4c4c",
  black: "#000000",
  textGray3: "#3b3b3b",
  supportGray3: "#989898",
  error: "#cd0d0d",
  success: "#00a148",
  lightGreen1: "#d8f8ef",
  lightGreen2: "#bcffee",
  lightPink: "#ffdbe3",
  pink: "#ef476f",
  blue: "#0064d6",
  lightBlue: "#eaf4ff",
  yellowPending: "#ffd700",
} as const;

export const designSystemRadiusPx = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
} as const;

export const designSystemSpacePx = {
  gap8: 8,
  gap16: 16,
  gap24: 24,
  gap32: 32,
  gap40: 40,
  sectionSection: 80,
  paddingXs: 8,
  paddingS: 16,
  titleToText: 16,
} as const;

export const designSystemTypographyPx = {
  display1: 64,
  h1: 48,
  h2: 40,
  h3: 32,
  h4: 24,
  h5: 20,
  h6: 18,
  lead: 16,
  bodyS: 14,
  bodyXs: 12,
} as const;
