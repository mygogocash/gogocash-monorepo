import { useCallback, useEffect } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing } from "@mobile/theme/tokens";

import type { GoGoTrackDetector } from "./detector";
import { useGoGoTrack } from "./useGoGoTrack";

const permissionsScopeApi = {
  detect: async () => ({ matched: false }),
};

type GoGoTrackUsageAccessBannerProps = {
  detector: GoGoTrackDetector;
};

/**
 * Hub-level gate: impossible-to-miss Usage Access CTA until Android permission
 * is granted. Refreshes when the customer returns from system settings.
 */
export function GoGoTrackUsageAccessBanner({
  detector,
}: GoGoTrackUsageAccessBannerProps) {
  const styles = useThemedStyles(createUsageAccessBannerStyles);
  const tc = useCopy();
  const { state, refreshPermission, requestPermission } = useGoGoTrack({
    detector,
    api: permissionsScopeApi,
  });

  useEffect(() => {
    void refreshPermission();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refreshPermission();
      }
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const onGrant = useCallback(() => {
    void haptics.impact();
    void requestPermission();
  }, [requestPermission]);

  if (!state.supported || state.permissionGranted) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      style={styles.banner}
      testID="gototrack-usage-access-banner"
    >
      <Text style={styles.title}>{tc("Usage access required")}</Text>
      <Text style={styles.body}>
        {tc(
          "GoGoTrack cannot detect Shopee or other supported stores until you grant Usage Access in Android settings.",
        )}
      </Text>
      <MotionPressable
        accessibilityLabel={tc("Open Usage Access settings")}
        accessibilityRole="button"
        onPress={onGrant}
        pressScale={motion.scale.subtlePress}
        style={styles.button}
        testID="gototrack-usage-access-settings-button"
      >
        <Text numberOfLines={1} style={styles.buttonText}>
          {tc("Open Usage Access settings")}
        </Text>
      </MotionPressable>
    </View>
  );
}

function createUsageAccessBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.danger,
      borderRadius: radii.lg,
      borderWidth: 2,
      gap: spacing.sm,
      padding: spacing.md,
    },
    title: {
      color: colors.danger,
      fontSize: 16,
      fontWeight: "800",
    },
    body: {
      color: colors.ink,
      fontSize: 13,
      lineHeight: 18,
    },
    button: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: spacing.md,
    },
    buttonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
