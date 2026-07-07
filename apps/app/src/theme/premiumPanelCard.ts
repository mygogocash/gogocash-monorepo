import type { TextStyle, ViewStyle } from "react-native";

import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

/** White elevated card shell — matches GoGoTrack GRANT ACCESS / consent hero panels. */
export function premiumPanelCardStyle(
  colors: ThemeColors,
  overrides: ViewStyle = {},
): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    ...overrides,
  };
}

export function premiumOutlineButtonStyle(
  colors: ThemeColors,
  overrides: ViewStyle = {},
): ViewStyle {
  return {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: pickThemed(colors, colors.white, colors.field),
    borderColor: pickThemed(colors, "rgba(0, 204, 153, 0.35)", colors.borderStrong),
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: pickThemed(colors, "0 2px 8px rgba(16, 53, 34, 0.06)", "none"),
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...overrides,
  };
}

export function premiumOutlineButtonDisabledStyle(colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: pickThemed(colors, colors.primarySoft, colors.fieldMuted),
    borderColor: pickThemed(colors, "#D1FAE5", colors.border),
    boxShadow: "none",
  };
}

export function premiumOutlineButtonTextStyle(colors: ThemeColors): TextStyle {
  return {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.action,
    fontWeight: "600",
    letterSpacing: 0.2,
    lineHeight: typography.actionLineHeight,
    textAlign: "center",
  };
}

export function premiumOutlineButtonTextDisabledStyle(colors: ThemeColors): TextStyle {
  return {
    color: colors.muted,
  };
}

/** Compact outline pill for inline grant actions inside permission rows. */
export function premiumCompactOutlineButtonStyle(
  colors: ThemeColors,
  overrides: ViewStyle = {},
): ViewStyle {
  return premiumOutlineButtonStyle(colors, {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...overrides,
  });
}
