import { useEffect, useMemo } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { motion } from "@mobile/theme/motion";

const DOT_SIZE = 6;
const DOT_GAP = 10;
// Each dot scales/brightens up then back down; staggered left->right so the pulse
// reads as a bubble "flowing" from the MyCashback icon into GoGoCash, then loops.
const PULSE_DURATION = 460;
const PULSE_STAGGER = 160;
const PULSE_SCALE = 1.85;
const PULSE_MIN_OPACITY = 0.55;

type LinkMyCashbackConnectorDotsProps = {
  /** Dot colors, left-to-right (web parity gradient from webLinkMyCashbackIntro.connectorDots). */
  colors: readonly string[];
  testID?: string;
};

/**
 * The MyCashback <-> GoGoCash connector dots. Each dot "bubbles" (scales up + brightens) in a
 * staggered left-to-right wave that loops forever, suggesting balances flowing from a linked
 * MyCashback account into GoGoCash. Shared by CustomerLinkCashbackScreen and
 * CustomerMyCashbackSignInScreen so the two intro surfaces cannot drift.
 *
 * Accessibility: honors the OS / browser reduce-motion preference — when set, the dots render
 * static (no loop), which also keeps render tests deterministic. Animates only transform +
 * opacity (compositor-friendly; scale is a visual transform so the row layout never reflows).
 */
export function LinkMyCashbackConnectorDots({ colors, testID }: LinkMyCashbackConnectorDotsProps) {
  const reduced = useReducedMotion();
  // One driver per dot. `colors` is a stable module fixture, so this initializes once.
  const values = useMemo(() => colors.map(() => new Animated.Value(0)), [colors]);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const pulses = values.map((value) =>
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: PULSE_DURATION,
          easing: motion.easing.out,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: PULSE_DURATION,
          easing: motion.easing.in,
          useNativeDriver: motion.useNativeDriver,
        }),
      ]),
    );
    const loop = Animated.loop(Animated.stagger(PULSE_STAGGER, pulses));
    loop.start();
    return () => loop.stop();
  }, [reduced, values]);

  return (
    <View style={styles.dots} testID={testID}>
      {colors.map((color, index) => (
        <Animated.View
          key={`${color}-${index}`}
          style={[
            styles.dot,
            { backgroundColor: color },
            reduced
              ? null
              : {
                  opacity: values[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [PULSE_MIN_OPACITY, 1],
                  }),
                  transform: [
                    {
                      scale: values[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, PULSE_SCALE],
                      }),
                    },
                  ],
                },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: DOT_GAP,
  },
  dot: {
    borderRadius: DOT_SIZE / 2,
    height: DOT_SIZE,
    width: DOT_SIZE,
  },
});
