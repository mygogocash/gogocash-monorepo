import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";

interface CarouselDotsProps {
  /** Shared horizontal scroll offset (px) driven by the carousel's Animated.event. */
  scrollX: Animated.Value;
  /** Width of one snapped page (px); the same value passed to snapToInterval. */
  pageWidth: number;
  /** Number of dots / pages. */
  count: number;
  /** Settled active page index — used for the reduced-motion fallback + a11y. */
  activeIndex: number;
  /** Pill colour (active state). Inactive dots are the same colour at lower opacity. */
  color: string;
  /** Base (inactive) dot diameter. Active dot grows to `size * activeScale`. */
  size?: number;
  activeScale?: number;
  gap?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const INACTIVE_OPACITY = 0.4;

/**
 * Premium pagination indicator: each dot's width + opacity is interpolated directly from the
 * carousel's scroll offset, so the active pill smoothly grows as its page centres — without any
 * per-frame React re-render (Animated updates the nodes off the render cycle). Honours reduce-motion
 * by falling back to a static active/inactive style keyed on the settled index.
 */
export function CarouselDots({
  scrollX,
  pageWidth,
  count,
  activeIndex,
  color,
  size = 8,
  activeScale = 2.2,
  gap = 8,
  containerStyle,
}: CarouselDotsProps) {
  const reducedMotion = useReducedMotion();

  if (count <= 1) {
    return null;
  }

  const expandedWidth = Math.round(size * activeScale);
  const inactiveScale = size / expandedWidth;
  // Guard against a zero page width (pre-layout) which would make the interpolation input range
  // collapse and yield NaN.
  const safePageWidth = pageWidth > 0 ? pageWidth : 1;

  return (
    <View style={[styles.row, { gap }, containerStyle]}>
      {Array.from({ length: count }, (_, index) => {
        const inputRange = [(index - 1) * safePageWidth, index * safePageWidth, (index + 1) * safePageWidth];

        const scaleX = reducedMotion
          ? index === activeIndex
            ? 1
            : inactiveScale
          : scrollX.interpolate({
              inputRange,
              outputRange: [inactiveScale, 1, inactiveScale],
              extrapolate: "clamp",
            });

        const opacity = reducedMotion
          ? index === activeIndex
            ? 1
            : INACTIVE_OPACITY
          : scrollX.interpolate({
              inputRange,
              outputRange: [INACTIVE_OPACITY, 1, INACTIVE_OPACITY],
              extrapolate: "clamp",
            });

        return (
          <Animated.View
            key={`carousel-dot-${index}`}
            style={{
              backgroundColor: color,
              borderRadius: size / 2,
              height: size,
              opacity,
              transform: [{ scaleX }],
              width: expandedWidth,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
});

/**
 * Scroll-linked "depth" style for a paged carousel page: the centred page sits at full scale/opacity
 * while the pages on either side recede slightly, so swiping between pages feels layered rather than
 * flat. Driven by the same scrollX as the dots (no per-frame React re-render). Returns null under
 * reduce-motion (or before layout), leaving the page static.
 */
export function getCarouselPageMotionStyle(
  scrollX: Animated.Value,
  pageIndex: number,
  pageWidth: number,
  reducedMotion: boolean
) {
  if (reducedMotion || pageWidth <= 0) {
    return null;
  }

  const inputRange = [(pageIndex - 1) * pageWidth, pageIndex * pageWidth, (pageIndex + 1) * pageWidth];

  return {
    opacity: scrollX.interpolate({ inputRange, outputRange: [0.65, 1, 0.65], extrapolate: "clamp" }),
    transform: [
      { scale: scrollX.interpolate({ inputRange, outputRange: [0.95, 1, 0.95], extrapolate: "clamp" }) },
    ],
  };
}
