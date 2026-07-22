import { StyleSheet, Text, View } from "react-native";

import { resolveGoLinkMode } from "@mobile/config/featureFlags";
import { useCopy } from "@mobile/i18n/useCopy";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { radii, typography } from "@mobile/theme/tokens";

// Shared GoLink coming-soon nav helpers so BOTH bottom-nav components (the home
// screen's and the shell's) render the "GoGoLink" tab identically while it is in
// the coming-soon state: dimmed, badged "Soon", and non-interactive.

/** Opacity applied to the GoLink tab / box while it is in the coming-soon state. */
export const GOLINK_COMING_SOON_OPACITY = 0.5;

/** True when THIS nav item is the GoLink tab AND GoLink is in coming-soon mode. */
export function isGoLinkComingSoonTab(href: string): boolean {
  return href === "/golink" && resolveGoLinkMode() === "comingSoon";
}

/** Small "Soon" pill overlaid on the GoGoLink tab icon in coming-soon mode. */
export function GoLinkSoonBadge() {
  const tc = useCopy();
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
      <Text style={styles.badgeText}>{tc("Soon")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.chip,
    paddingHorizontal: 5,
    paddingVertical: 1,
    position: "absolute",
    right: -12,
    top: -8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontFamily: typography.family,
    fontSize: 9,
    fontWeight: "700",
  },
});
