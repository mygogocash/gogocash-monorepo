import { Image } from "expo-image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  LOGO_RETRY_DELAY_MS,
  shouldScheduleLogoRetry,
} from "@mobile/components/logoRetryPolicy";
import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, typography } from "@mobile/theme/tokens";

/**
 * THE brand-logo tile — the one piece every brand card kept hand-copying and
 * drifting on (founder feedback 2026-07-11: Quest "Explore other Shops" and
 * Favorite Brands tiles missed the retry + corner fixes that landed in
 * BrandCard). It owns:
 *
 * - bounded transient-failure retry (logoRetryPolicy) — one flaky response
 *   must not pin the fallback for the whole session
 * - the tinted fallback (initials or a caller-supplied monogram)
 * - corner clipping that actually works on Android: radius lives on the
 *   image itself, and non-square tiles pass `imageSquare` so square bitmaps
 *   fill a centered square viewport edge-to-edge instead of floating inside
 *   with their own sharp corners
 *
 * Overlays (favorite hearts, coupon chips) render as `children` on top.
 */
export function brandInitials(brand: string): string {
  const parts = brand
    .replace(/&/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "GO";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BrandLogoTile({
  brand,
  children,
  containerStyle,
  fallbackText,
  fallbackTextStyle,
  imageSquare,
  source,
  sourceKey,
  tint,
}: {
  readonly brand: string;
  readonly children?: ReactNode;
  /** Sizing/shape overrides (height, aspectRatio, radius) for the tile. */
  readonly containerStyle?: StyleProp<ViewStyle>;
  readonly fallbackText?: string;
  readonly fallbackTextStyle?: StyleProp<TextStyle>;
  /**
   * Side (pt) of the centered square the image renders in. REQUIRED whenever
   * the tile is not square itself — without it, contentFit=contain insets a
   * square bitmap and its sharp corners float inside the rounded viewport.
   */
  readonly imageSquare?: number;
  readonly source: ImageSourcePropType | null;
  /** Stable identity of the source; resets the retry state when it changes. */
  readonly sourceKey?: string;
  readonly tint: string;
}) {
  const styles = useThemedStyles(createBrandLogoTileStyles);
  const [logoFailed, setLogoFailed] = useState(false);
  const logoAttemptsRef = useRef(0);
  const logoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    logoAttemptsRef.current = 0;
    setLogoFailed(false);
    return () => {
      if (logoRetryTimerRef.current) {
        clearTimeout(logoRetryTimerRef.current);
        logoRetryTimerRef.current = null;
      }
    };
  }, [sourceKey]);

  const onLogoError = () => {
    logoAttemptsRef.current += 1;
    setLogoFailed(true);
    if (shouldScheduleLogoRetry(logoAttemptsRef.current)) {
      logoRetryTimerRef.current = setTimeout(() => {
        logoRetryTimerRef.current = null;
        setLogoFailed(false);
      }, LOGO_RETRY_DELAY_MS);
    }
  };

  const showImage = source !== null && !logoFailed;

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: showImage ? styles.tileCardBackground.backgroundColor : tint },
        containerStyle,
      ]}
    >
      {showImage ? (
        <Image
          accessibilityLabel={`${brand} logo`}
          cachePolicy="memory-disk"
          contentFit="contain"
          onError={onLogoError}
          recyclingKey={sourceKey ?? `${brand}-logo`}
          source={source}
          style={[styles.logoImage, imageSquare ? { width: imageSquare } : styles.logoImageFill]}
        />
      ) : (
        <Text numberOfLines={2} style={[styles.logoFallback, fallbackTextStyle]}>
          {fallbackText ?? brandInitials(brand)}
        </Text>
      )}
      {children}
    </View>
  );
}

function createBrandLogoTileStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tile: {
      alignItems: "center",
      borderRadius: radii.sm,
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      width: "100%",
    },
    tileCardBackground: {
      backgroundColor: colors.card,
    },
    logoImage: {
      // Radius on the image itself — Android's new architecture does not
      // reliably clip a child image to the parent's rounded overflow.
      // Device-verified 2026-07-11 (King Power 288x288 in a 128x117 visual).
      borderRadius: radii.sm,
      height: "100%",
    },
    logoImageFill: {
      width: "100%",
    },
    logoFallback: {
      color: colors.accent,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "700",
      paddingHorizontal: 8,
      textAlign: "center",
    },
  });
}
