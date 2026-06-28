import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";

import { motion } from "@mobile/theme/motion";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

// Mirrors the web LoadingShop interstitial ("Moving to <brand> . . ." + spinner + manual
// fallback) shown after Shop Now. The mock has no real merchant URL, so the redirect
// auto-completes after a realistic minimum delay; the "Tap here" fallback completes immediately.
const REDIRECT_MIN_DURATION_MS = 2500;
const REDIRECT_BRAND_GREEN = "#00B14F";
const FALLBACK_LINK_BLUE = "#5D87FF";

export function ShopRedirectOverlay({
  brand,
  onComplete,
}: {
  brand: string;
  onComplete: () => void;
}) {
  const styles = useThemedStyles(createShopRedirectOverlayStyles);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      duration: motion.duration.base,
      easing: motion.easing.out,
      toValue: 1,
      useNativeDriver: motion.useNativeDriver,
    }).start();
    const timer = setTimeout(onComplete, REDIRECT_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [fade, onComplete]);

  return (
    <Animated.View
      accessibilityLabel={`Moving to ${brand}`}
      accessibilityRole="alert"
      style={[styles.overlay, { opacity: fade }]}
    >
      <View style={styles.content}>
        <Text style={styles.heading}>
          Moving to <Text style={styles.brand}>{brand}</Text> . . .
        </Text>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={REDIRECT_BRAND_GREEN} size="large" />
        </View>
        <Text style={styles.fallback}>
          Waiting too long?{" "}
          <Text accessibilityRole="button" onPress={onComplete} style={styles.fallbackLink}>
            Tap here
          </Text>{" "}
          to get your merchant page ready.
        </Text>
      </View>
    </Animated.View>
  );
}

function createShopRedirectOverlayStyles(colors: ThemeColors) {
  return StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "rgba(255, 255, 255, 0.97)", colors.background),
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 32,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 100,
  },
  content: {
    alignItems: "center",
    maxWidth: 420,
    width: "100%",
  },
  heading: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "600",
    lineHeight: 34,
    textAlign: "center",
  },
  brand: {
    color: REDIRECT_BRAND_GREEN,
    fontWeight: "700",
  },
  spinnerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
    minHeight: 80,
  },
  fallback: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  fallbackLink: {
    color: pickThemed(colors, FALLBACK_LINK_BLUE, colors.link),
    fontWeight: "600",
  },
});
}

