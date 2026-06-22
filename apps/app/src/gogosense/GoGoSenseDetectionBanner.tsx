import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing } from "@mobile/theme/tokens";

import type { GoGoSenseDetector } from "./detector";
import { useGoGoSense, type GoGoSenseHookApi } from "./useGoGoSense";
import { useGoGoSenseApi } from "./useGoGoSenseApi";

// Off-device / logged-out fallback: detection is inert (never matches).
const inertApi: GoGoSenseHookApi = { detect: async () => ({ matched: false }) };

type GoGoSenseDetectionBannerProps = {
  detector: GoGoSenseDetector;
  // Test/override seam; production resolves the authed api via useGoGoSenseApi.
  api?: GoGoSenseHookApi | null;
  openUrl?: (url: string) => void;
};

/**
 * Foreground-only detection + activation nudge. Starts the session while the
 * GoGoSense surface is mounted and re-polls when the app returns to foreground
 * (the MVP's "you just used Shopee → activate?" path). When a merchant match
 * surfaces it renders an Activate-cashback nudge that opens the affiliate deeplink.
 */
export function GoGoSenseDetectionBanner({
  detector,
  api: apiOverride,
  openUrl,
}: GoGoSenseDetectionBannerProps) {
  const styles = useThemedStyles(createGoGoSenseDetectionBannerStyles);
  const tc = useCopy();
  const liveApi = useGoGoSenseApi();
  const api = apiOverride ?? liveApi ?? inertApi;
  const { state, start, poll, activate } = useGoGoSense({ detector, api });
  const [activationError, setActivationError] = useState(false);

  useEffect(() => {
    void start().then(() => poll());
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void poll();
      }
    });
    return () => subscription.remove();
  }, [start, poll]);

  const onActivate = useCallback(() => {
    setActivationError(false);
    void haptics.impact();
    void activate()
      .then((result) => {
        if (result) {
          return (openUrl ?? Linking.openURL)(result.deeplink);
        }
        return undefined;
      })
      .catch(() => setActivationError(true));
  }, [activate, openUrl]);

  const match = state.lastMatch;
  const showNudge =
    match != null &&
    match.response.matched &&
    match.response.recommendedAction === "activate";

  if (!showNudge) {
    return null;
  }

  const merchantSuffix = match.response.merchantName
    ? ` · ${match.response.merchantName}`
    : "";

  return (
    <View style={styles.banner}>
      <Text numberOfLines={1} style={styles.title}>
        {tc("Cashback available")}
      </Text>
      <Text style={styles.body}>
        {tc("Activate cashback before you keep shopping")}
        {merchantSuffix}
      </Text>
      <MotionPressable
        onPress={onActivate}
        pressScale={motion.scale.subtlePress}
        style={styles.button}
      >
        <Text numberOfLines={1} style={styles.buttonText}>
          {tc("Activate cashback")}
        </Text>
      </MotionPressable>
      {activationError ? (
        <Text style={styles.error}>{tc("Cashback activation failed. Please try again.")}</Text>
      ) : null}
    </View>
  );
}

function createGoGoSenseDetectionBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
  banner: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    color: colors.accent,
    fontSize: 13,
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
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
}
