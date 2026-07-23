import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";

interface CarouselRailProps {
  /** Shared horizontal scroll offset (px) driven by the rail's Animated.event. */
  scrollX: Animated.Value;
  /** Total scrollable content width (px). */
  contentWidth: number;
  /** Width of the visible frame (px). */
  visibleWidth: number;
  /** Thumb colour. The track is the same colour at low opacity. */
  color: string;
  /** Overall track width (px). Defaults to the visible frame. */
  trackWidth?: number;
  height?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const TRACK_OPACITY = 0.16;

/**
 * #498 — a continuous scroll-progress line for the brand rails, replacing dot pagination.
 *
 * Dots only make sense when content is chunked into discrete pages; these rails now scroll
 * as one continuous group, so a proportional thumb is the honest indicator: its width shows
 * how much of the rail is visible and its position shows where you are.
 *
 * Deliberately NOT a change to CarouselDots, which is shared with HomeHeroBanners and the
 * discovery banner carousel — both genuinely paged, and neither reported a problem.
 *
 * Only `translateX` animates; the thumb's width is static. Animating width would fail the
 * compositor-friendly constraint that perf-wave4 pins for the equivalent dots indicator.
 */
export function CarouselRail({
  scrollX,
  contentWidth,
  visibleWidth,
  color,
  trackWidth,
  height = 4,
  containerStyle,
}: CarouselRailProps) {
  const reducedMotion = useReducedMotion();

  // Nothing to indicate when everything already fits.
  if (contentWidth <= 0 || visibleWidth <= 0 || contentWidth <= visibleWidth) {
    return null;
  }

  const track = trackWidth && trackWidth > 0 ? trackWidth : visibleWidth;
  const visibleFraction = Math.min(1, visibleWidth / contentWidth);
  const thumbWidth = Math.max(24, Math.round(track * visibleFraction));
  const maxScroll = contentWidth - visibleWidth;
  const maxTranslate = Math.max(0, track - thumbWidth);

  const translateX = reducedMotion
    ? 0
    : scrollX.interpolate({
        inputRange: [0, maxScroll],
        outputRange: [0, maxTranslate],
        extrapolate: "clamp",
      });

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: color, borderRadius: height / 2, height, opacity: TRACK_OPACITY, width: track },
        containerStyle,
      ]}
    >
      <Animated.View
        style={{
          backgroundColor: color,
          borderRadius: height / 2,
          height,
          transform: [{ translateX }],
          width: thumbWidth,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: "center",
    overflow: "hidden",
  },
});
