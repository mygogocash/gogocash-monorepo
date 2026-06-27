import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";

/** Closed = accent ink on light chrome, high-contrast white on dark chrome. */
export function resolveLocaleGlobeColor(colors: ThemeColors, open: boolean): string {
  if (open) {
    return colors.primary;
  }

  return pickThemed(colors, colors.accent, colors.white);
}
