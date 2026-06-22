import type { ThemeColors } from "@mobile/theme/colorPalettes";
import type { ResolvedTheme } from "@mobile/theme/resolveTheme";

export type ThemeSurfaces = {
  readonly bottomNavBackground: string;
  readonly bottomNavBorder: string;
  readonly desktopShellShadow: string;
  readonly localeButtonBackground: string;
  readonly localeButtonBorder: string;
  readonly localeButtonOpenBackground: string;
  readonly localeButtonOpenBorder: string;
  readonly footerDivider: string;
  readonly footerHeading: string;
  readonly footerLink: string;
  readonly footerMuted: string;
  readonly metricTilePrimaryBackground: string;
  readonly metricTilePrimaryBorder: string;
  readonly metricIconBackground: string;
  readonly profileSurfaceMobile: string;
  readonly profileContentInner: string;
};

export function getThemeSurfaces(colors: ThemeColors, resolved: ResolvedTheme): ThemeSurfaces {
  const isDark = resolved === "dark";

  return {
    bottomNavBackground: isDark ? "rgba(26,31,29,0.95)" : "rgba(255,255,255,0.95)",
    bottomNavBorder: isDark ? "rgba(58,69,65,0.7)" : "rgba(216,226,217,0.7)",
    desktopShellShadow: isDark
      ? "0 1px 0 rgba(42,48,46,0.75)"
      : "0 1px 0 rgba(229, 231, 235, 0.75)",
    localeButtonBackground: isDark ? "rgba(26,31,29,0.9)" : "rgba(255,255,255,0.9)",
    localeButtonBorder: colors.border,
    localeButtonOpenBackground: colors.primarySoft,
    localeButtonOpenBorder: isDark ? "rgba(0, 204, 153, 0.5)" : "rgba(0, 204, 153, 0.4)",
    footerDivider: colors.border,
    footerHeading: colors.ink,
    footerLink: colors.muted,
    footerMuted: colors.textSoft,
    metricTilePrimaryBackground: colors.primarySoft,
    metricTilePrimaryBorder: isDark ? "rgba(0,204,153,0.35)" : "rgba(0,204,153,0.2)",
    metricIconBackground: isDark ? colors.card : "#F3FCF9",
    profileSurfaceMobile: isDark ? "rgba(26,31,29,0.9)" : "rgba(255,255,255,0.9)",
    profileContentInner: isDark ? "rgba(26,31,29,0.8)" : "rgba(255,255,255,0.8)",
  };
}
