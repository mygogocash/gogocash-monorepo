import { type ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { isGoGoPassEnabled } from "@mobile/config/featureFlags";
import { motion } from "@mobile/theme/motion";
import { useThemeColors } from "@mobile/theme/ThemeProvider";

// GoGoPass profile ring. RN has no CSS conic-gradient or @keyframes, so the web's rotating gold
// conic ring is approximated with a react-native-svg gradient-stroked circle spun by Animated.loop.
// Non-premium tiers render children unchanged (zero overhead).
const RING_WIDTH = 3;

function isPremiumTier(tier?: string): boolean {
  return tier === "gogopass" || tier === "gogopass-pro";
}

export function GoGoPassAvatar({
  children,
  ringWidth = RING_WIDTH,
  size,
  tier,
}: {
  children: ReactNode;
  ringWidth?: number;
  size: number;
  tier?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();
  // GoGoPass rollout flag: hidden builds always take the plain-avatar branch.
  const premium = isGoGoPassEnabled() && isPremiumTier(tier);

  useEffect(() => {
    if (!premium) {
      return undefined;
    }
    const animation = Animated.loop(
      Animated.timing(spin, {
        duration: 6000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: motion.useNativeDriver,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [premium, spin]);

  if (!premium) {
    return <View style={{ height: size, width: size }}>{children}</View>;
  }

  const outerSize = size + ringWidth * 2 + 2;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const radius = (outerSize - ringWidth) / 2;

  return (
    <View
      accessibilityLabel="GoGoPass member"
      style={{
        alignItems: "center",
        height: outerSize,
        justifyContent: "center",
        width: outerSize,
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg height={outerSize} width={outerSize}>
          <Defs>
            <LinearGradient id="gogopassRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F4E4A8" />
              <Stop offset="0.5" stopColor="#D4AF37" />
              <Stop offset="1" stopColor="#B8860B" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={outerSize / 2}
            cy={outerSize / 2}
            fill="none"
            r={radius}
            stroke="url(#gogopassRing)"
            strokeWidth={ringWidth}
          />
        </Svg>
      </Animated.View>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: size / 2,
          height: size,
          overflow: "hidden",
          width: size,
        }}
      >
        {children}
      </View>
    </View>
  );
}
