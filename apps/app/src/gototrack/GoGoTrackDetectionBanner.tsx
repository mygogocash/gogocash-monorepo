import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";

import { MotionPressable } from "@mobile/components/MotionPressable";
import { toastErrorMessages } from "@mobile/i18n/toastMessages";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import { motion } from "@mobile/theme/motion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing } from "@mobile/theme/tokens";

import type { GoGoTrackDetector } from "./detector";
import { getGoGoTrackPromptCoordinator } from "./promptCoordinatorInstance";
import { useGoGoTrack, type GoGoTrackHookApi } from "./useGoGoTrack";
import { useGoGoTrackApi } from "./useGoGoTrackApi";

type GoGoTrackDetectionBannerProps = {
  detector: GoGoTrackDetector;
  // Test/override seam; production resolves the authed api via useGoGoTrackApi.
  api?: GoGoTrackHookApi | null;
  openUrl?: (url: string) => void;
};

/**
 * Foreground-only detection + activation nudge. Starts the session while the
 * GoGoTrack surface is mounted and re-polls when the app returns to foreground
 * (the MVP's "you just used Shopee → activate?" path). When a merchant match
 * surfaces it renders an Activate-cashback nudge that opens the affiliate deeplink.
 */
export function GoGoTrackDetectionBanner({
  detector,
  api: apiOverride,
  openUrl,
}: GoGoTrackDetectionBannerProps) {
  const liveApi = useGoGoTrackApi();
  const api = apiOverride ?? liveApi;

  if (!api) {
    return null;
  }

  return (
    <GoGoTrackDetectionBannerLoaded
      api={api}
      detector={detector}
      openUrl={openUrl}
    />
  );
}

function GoGoTrackDetectionBannerLoaded({
  detector,
  api,
  openUrl,
}: {
  detector: GoGoTrackDetector;
  api: GoGoTrackHookApi;
  openUrl?: (url: string) => void;
}) {
  const styles = useThemedStyles(createGoGoTrackDetectionBannerStyles);
  const tc = useCopy();
  const { state, start, poll, activate } = useGoGoTrack({ detector, api });
  const [activationError, setActivationError] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const activationInFlightRef = useRef(false);
  const [activatedMatchKey, setActivatedMatchKey] = useState<string | null>(null);

  useEffect(() => {
    void start().then(() => poll());
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void poll();
      }
    });
    return () => subscription.remove();
  }, [start, poll]);

  const match = state.lastMatch;
  const matchIsActionable =
    match != null &&
    match.response.matched &&
    match.response.recommendedAction === "activate";
  const matchKey = matchIsActionable
    ? `${match.packageName}:${match.response.detectionEventId ?? match.response.merchantId ?? ""}`
    : null;
  const nativePromptActive =
    getGoGoTrackPromptCoordinator()?.getState().nativePromptActive ?? false;
  const showNudge =
    matchIsActionable &&
    matchKey !== activatedMatchKey &&
    !nativePromptActive &&
    !(getGoGoTrackPromptCoordinator()?.shouldSuppressBanner(matchKey) ?? false);

  const onActivate = useCallback(() => {
    if (activationInFlightRef.current) return;

    activationInFlightRef.current = true;
    setIsActivating(true);
    setActivationError(false);
    void haptics.impact();
    void activate()
      .then((result) => {
        if (!result) {
          setActivationError(true);
          return undefined;
        }
        return Promise.resolve((openUrl ?? Linking.openURL)(result.deeplink)).then(() => {
          setActivatedMatchKey(matchKey);
        });
      })
      .catch(() => setActivationError(true))
      .finally(() => {
        activationInFlightRef.current = false;
        setIsActivating(false);
      });
  }, [activate, matchKey, openUrl]);

  useEffect(() => {
    activationInFlightRef.current = false;
    setActivationError(false);
    setIsActivating(false);
  }, [matchKey]);

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
        accessibilityLabel={tc("Activate GoGoTrack cashback")}
        accessibilityRole="button"
        accessibilityState={{ disabled: isActivating }}
        onPress={onActivate}
        pressScale={motion.scale.subtlePress}
        style={[styles.button, isActivating ? styles.buttonDisabled : null]}
        testID="gototrack-activate-cashback-button"
      >
        <Text numberOfLines={1} style={styles.buttonText}>
          {tc(isActivating ? "Activating cashback" : "Activate cashback")}
        </Text>
      </MotionPressable>
      {activationError ? (
        <Text style={styles.error}>{tc(toastErrorMessages.cashbackActivationFailed)}</Text>
      ) : null}
    </View>
  );
}

function createGoGoTrackDetectionBannerStyles(colors: ThemeColors) {
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
  buttonDisabled: {
    opacity: 0.72,
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
