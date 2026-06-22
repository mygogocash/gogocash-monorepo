import { StyleSheet, Text, View } from "react-native";

import { useCopy } from "@mobile/i18n/useCopy";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

/**
 * Desktop header "Sign in" pill.
 *
 * Renders a real localized <Text> label (`tc("Sign in")` -> e.g. "เข้าสู่ระบบ") over the brand pill so it
 * switches with the active locale. The previous version baked the English glyphs into an SVG vector path
 * (`d="M62.08 26.912..."`), which could never localize. The wrapping Pressable + `accessibilityLabel`
 * live in CustomerDesktopHeader; this component is just the visual pill.
 */
export function CustomerSignInNavGraphic() {
  const styles = useThemedStyles(createSignInNavGraphicStyles);
  const tc = useCopy();

  return (
    <View style={styles.pill}>
      <Text numberOfLines={1} style={styles.label}>
        {tc("Sign in")}
      </Text>
    </View>
  );
}

function createSignInNavGraphicStyles(colors: ThemeColors) {
  return StyleSheet.create({
  pill: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    minWidth: 160,
    paddingHorizontal: 24,
  },
  label: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.action,
    fontWeight: typography.bodyWeight,
    lineHeight: typography.actionLineHeight,
  },
});
}

