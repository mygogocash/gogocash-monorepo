import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

import logoMarkImage from "../../assets/nav/logo.png";
import { motion } from "@mobile/theme/motion";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, typography } from "@mobile/theme/tokens";

// The "Moving to <brand> . . ." interstitial shown after Shop Now. Completion is
// driven by the PARENT (CustomerShopDetailScreen): it opens the merchant the
// moment the per-user tracking link is minted — or the mint times out and it
// falls back to the raw link — so there is NO fixed minimum wait here (a ready
// link redirects immediately). The GoGoCash -> brand logo pair signals the
// hand-off; "Tap here" lets an impatient user skip straight to the raw link.
const REDIRECT_BRAND_GREEN = "#00B14F";
const FALLBACK_LINK_BLUE = "#5D87FF";

export function ShopRedirectOverlay({
  brand,
  logoUri,
  onComplete,
}: {
  brand: string;
  /** Brand-partner square logo (shop.logoUri); falls back to the initial. */
  logoUri?: string;
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
  }, [fade]);

  return (
    <Animated.View
      accessibilityLabel={`Moving to ${brand}`}
      accessibilityRole="alert"
      style={[styles.overlay, { opacity: fade }]}
    >
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <Image
            accessibilityLabel="GoGoCash"
            resizeMode="contain"
            source={logoMarkImage}
            style={styles.gogocashLogo}
            testID="shop-redirect-gogocash-logo"
          />
          <Text accessibilityElementsHidden style={styles.arrow}>
            {"→"}
          </Text>
          {logoUri ? (
            <Image
              accessibilityLabel={`${brand} logo`}
              resizeMode="contain"
              source={{ uri: logoUri }}
              style={styles.partnerLogo}
              testID="shop-redirect-partner-logo"
            />
          ) : (
            <View
              style={[styles.partnerLogo, styles.partnerLogoFallback]}
              testID="shop-redirect-partner-logo-fallback"
            >
              <Text style={styles.partnerLogoFallbackText}>
                {brand.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.heading}>
          Moving to <Text style={styles.brand}>{brand}</Text> . . .
        </Text>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={REDIRECT_BRAND_GREEN} size="large" />
        </View>
        <Text style={styles.fallback}>
          Waiting too long?{" "}
          <Text
            accessibilityRole="button"
            onPress={onComplete}
            style={styles.fallbackLink}
          >
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
      backgroundColor: pickThemed(
        colors,
        "rgba(255, 255, 255, 0.97)",
        colors.background,
      ),
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
    logoRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 16,
      justifyContent: "center",
      marginBottom: 28,
    },
    gogocashLogo: {
      height: 56,
      width: 56,
    },
    arrow: {
      color: REDIRECT_BRAND_GREEN,
      fontFamily: typography.family,
      fontSize: 28,
      fontWeight: "700",
    },
    partnerLogo: {
      backgroundColor: pickThemed(colors, "#FFFFFF", colors.card),
      borderColor: pickThemed(colors, "rgba(0,0,0,0.06)", colors.border),
      borderRadius: radii.md,
      borderWidth: 1,
      height: 56,
      width: 56,
    },
    partnerLogoFallback: {
      alignItems: "center",
      justifyContent: "center",
    },
    partnerLogoFallbackText: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 24,
      fontWeight: "700",
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
