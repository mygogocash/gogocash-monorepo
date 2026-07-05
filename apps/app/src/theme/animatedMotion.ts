import { Animated, type EasingFunction } from "react-native";

import { motion } from "@mobile/theme/motion";

type CompositorTimingConfig = {
  toValue: number;
  duration?: number;
  easing?: EasingFunction;
  useNativeDriver?: boolean;
};

function createCompositorTiming(
  value: Animated.Value,
  config: CompositorTimingConfig
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    duration: config.duration ?? motion.duration.base,
    easing: config.easing ?? motion.easing.out,
    toValue: config.toValue,
    useNativeDriver: config.useNativeDriver ?? motion.useNativeDriver,
  });
}

/** Opacity-only animation — compositor-safe on web and native. */
export function runOpacityTiming(
  value: Animated.Value,
  config: CompositorTimingConfig
): Animated.CompositeAnimation {
  return createCompositorTiming(value, config);
}

/** Transform-driven animation (translate/scale/rotate) — compositor-safe. */
export function runTransformTiming(
  value: Animated.Value,
  config: CompositorTimingConfig
): Animated.CompositeAnimation {
  return createCompositorTiming(value, config);
}

type FadeSlideConfig = {
  opacity: Animated.Value;
  translateY: Animated.Value;
  visible: boolean;
  durationIn?: number;
  durationOut?: number;
  slideOffset?: number;
  reducedMotion?: boolean;
};

/** Shared enter/exit for overlays, toasts, and popovers. */
export function runFadeSlideTiming({
  opacity,
  translateY,
  visible,
  durationIn = motion.duration.fast,
  durationOut = motion.duration.fast,
  slideOffset = 12,
  reducedMotion = false,
}: FadeSlideConfig): Animated.CompositeAnimation {
  if (reducedMotion) {
    opacity.setValue(visible ? 1 : 0);
    translateY.setValue(0);
    return Animated.parallel([]);
  }

  const duration = visible ? durationIn : durationOut;
  const easing = visible ? motion.easing.out : motion.easing.in;

  return Animated.parallel([
    runOpacityTiming(opacity, {
      duration,
      easing,
      toValue: visible ? 1 : 0,
    }),
    runTransformTiming(translateY, {
      duration,
      easing,
      toValue: visible ? 0 : slideOffset,
    }),
  ]);
}
