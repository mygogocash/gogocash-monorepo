import { Link } from "expo-router";
import { useEffect, useMemo } from "react";
import { Animated, Image, StyleSheet } from "react-native";

import lineOfficialFabImage from "../../assets/nav/line-official-fab.png";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { webLineOfficialFab } from "@mobile/design/webDesignParity";
import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { motion } from "@mobile/theme/motion";
import { radii } from "@mobile/theme/tokens";

// A friendly "come tap me" idle animation: the button gently rises + grows, settles back,
// then rests for a beat before repeating — alive and inviting without being distracting.
// Transform-only (compositor-friendly) and disabled under reduce-motion.
const GROW_SCALE = 1.08;
const BOB_DISTANCE = 7;
const RISE_DURATION = 720;
const SETTLE_DURATION = 720;
const REST_DELAY = 1400;

export function CustomerLineOfficialFab() {
  const reduced = useReducedMotion();
  const invite = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(invite, {
          toValue: 1,
          duration: RISE_DURATION,
          easing: motion.easing.out,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(invite, {
          toValue: 0,
          duration: SETTLE_DURATION,
          easing: motion.easing.in,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.delay(REST_DELAY),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, invite]);

  return (
    <Animated.View
      style={[
        styles.lineOfficialFabAnchor,
        reduced
          ? null
          : {
              transform: [
                {
                  translateY: invite.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -BOB_DISTANCE],
                  }),
                },
                {
                  scale: invite.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, GROW_SCALE],
                  }),
                },
              ],
            },
      ]}
    >
      <Link asChild href={webLineOfficialFab.href as never} rel="noopener noreferrer" target="_blank">
        <MotionPressable
          accessibilityLabel={webLineOfficialFab.label}
          pressScale={motion.scale.subtlePress}
          style={styles.lineOfficialFab}
        >
          <Image
            alt=""
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={lineOfficialFabImage}
            style={styles.lineOfficialFabImage}
          />
        </MotionPressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lineOfficialFabAnchor: {
    bottom: 32,
    pointerEvents: "box-none",
    position: "absolute",
    right: 32,
    zIndex: 70,
  },
  lineOfficialFab: {
    alignItems: "center",
    backgroundColor: "#06C755",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radii.chip,
    borderWidth: 2,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    width: 64,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
  },
  lineOfficialFabImage: {
    height: "100%",
    width: "100%",
  },
});
