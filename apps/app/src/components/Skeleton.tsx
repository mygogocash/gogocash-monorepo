import { useEffect, useRef } from "react";
import {
  Animated,
  type DimensionValue,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, spacing } from "@mobile/theme/tokens";
import { runOpacityTiming } from "@mobile/theme/animatedMotion";
import { motion } from "@mobile/theme/motion";

// A3 — skeleton primitives. Perceived-performance placeholders shown while data
// loads. A single block pulses its opacity; composites stack blocks into common
// shapes (text lines, a wallet card). Placeholders are decorative, so they are
// hidden from screen readers (the real content announces itself once loaded).
//
// Reduced-motion (A1): when the platform "reduce motion" flag is on we render the
// placeholder statically at full opacity and never start the Animated.loop — no
// pulsing, no work scheduled.

// Opacity bounds for the pulse — dims toward this floor and back to full.
const PULSE_MIN_OPACITY = 0.4;
const PULSE_MAX_OPACITY = 1;

// Hide every placeholder from assistive tech: the real content announces itself
// once loaded, so a pulsing block is noise to a screen reader. We set the
// React-Native-native props (drive VoiceOver/TalkBack on iOS/Android) AND the
// web `aria-hidden` (react-native-web forwards it verbatim; the RN-native props
// are no-ops on web in this build), so the placeholder is silenced on every
// platform. Spread onto each host view.
const a11yHidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
  "aria-hidden": true,
} as const;

type SkeletonProps = {
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;
  readonly radius?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
};

/** A single pulsing placeholder block. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = radii.sm,
  style,
  testID,
}: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const styles = useThemedStyles(createSkeletonStyles);
  const opacity = useRef(new Animated.Value(reducedMotion ? PULSE_MAX_OPACITY : PULSE_MIN_OPACITY))
    .current;

  useEffect(() => {
    // Reduced motion: hold full opacity, start no animation.
    if (reducedMotion) {
      opacity.setValue(PULSE_MAX_OPACITY);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        runOpacityTiming(opacity, {
          duration: motion.duration.shimmer,
          easing: motion.easing.standard,
          toValue: PULSE_MAX_OPACITY,
        }),
        runOpacityTiming(opacity, {
          duration: motion.duration.shimmer,
          easing: motion.easing.standard,
          toValue: PULSE_MIN_OPACITY,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      {...a11yHidden}
      style={[styles.block, { borderRadius: radius, height, opacity, width }, style]}
      testID={testID}
    />
  );
}

type SkeletonTextProps = {
  readonly lines?: number;
  readonly lineHeight?: number;
  readonly spacing?: number;
  // Width applied to the final (typically shorter) line for a natural ragged edge.
  readonly lastLineWidth?: DimensionValue;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
};

/** A stack of `lines` placeholder rows approximating a block of text. */
export function SkeletonText({
  lines = 3,
  lineHeight = 14,
  spacing: gap = spacing.sm,
  lastLineWidth = "60%",
  style,
  testID,
}: SkeletonTextProps) {
  const count = Math.max(0, Math.floor(lines));

  return (
    <View {...a11yHidden} style={style} testID={testID}>
      {Array.from({ length: count }, (_, index) => {
        const isLast = index === count - 1;
        return (
          <Skeleton
            height={lineHeight}
            key={index}
            style={index > 0 ? { marginTop: gap } : undefined}
            testID={testID ? `${testID}-line` : "skeleton-text-line"}
            width={isLast && count > 1 ? lastLineWidth : "100%"}
          />
        );
      })}
    </View>
  );
}

type WalletSkeletonProps = {
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
};

/**
 * Composite placeholder approximating the wallet/balance card + a few rows,
 * for Phase-B reuse on data-backed screens while the real content loads.
 */
export function WalletSkeleton({ style, testID }: WalletSkeletonProps) {
  const styles = useThemedStyles(createSkeletonStyles);

  return (
    <View {...a11yHidden} style={[styles.walletCard, style]} testID={testID}>
      <Skeleton height={14} radius={radii.sm} width="40%" />
      <Skeleton height={36} radius={radii.md} style={styles.walletBalance} width="65%" />
      <SkeletonText lines={3} style={styles.walletRows} />
    </View>
  );
}

function createSkeletonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    block: {
      backgroundColor: colors.border,
    },
    walletBalance: {
      marginTop: spacing.sm,
    },
    walletCard: {
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    walletRows: {
      marginTop: spacing.md,
    },
  });
}
