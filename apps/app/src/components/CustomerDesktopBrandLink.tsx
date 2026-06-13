import { Link } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";

import logoMarkImage from "../../assets/nav/logo.png";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getInteractionTransformStyle, motion } from "@mobile/theme/motion";
import { radii, spacing, typography } from "@mobile/theme/tokens";

type CustomerDesktopBrandLinkProps = {
  accessibilityLabel?: string;
  label?: string;
};

const webPressableFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as ViewStyle;

const webLogoMarkMotionStyle = {
  borderRadius: 16,
  transitionDuration: motion.cssTransition.duration,
  transitionProperty: motion.cssTransition.property,
  transitionTimingFunction: motion.cssTransition.timingFunction,
  willChange: "transform",
} as unknown as ViewStyle;

const webLogoMarkHoverStyle = {
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
} as unknown as ViewStyle;

export function CustomerDesktopBrandLink({
  accessibilityLabel,
  label = "GoGoCash",
}: CustomerDesktopBrandLinkProps) {
  const [logoHovered, setLogoHovered] = useState(false);

  return (
    <Link asChild href="/">
      <MotionPressable
        accessibilityLabel={accessibilityLabel}
        hoverLift={false}
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([styles.logoLink, webPressableFocusReset])}
      >
        <View
          onPointerEnter={() => setLogoHovered(true)}
          onPointerLeave={() => setLogoHovered(false)}
          style={[
            webLogoMarkMotionStyle,
            getInteractionTransformStyle({ hovered: logoHovered, hoverLift: true }),
            logoHovered ? webLogoMarkHoverStyle : null,
          ]}
        >
          <Image
            alt="GoGoCash logo"
            accessibilityLabel="GoGoCash logo"
            source={logoMarkImage}
            style={styles.logoMark}
          />
        </View>
        <Text style={styles.logoText}>{label}</Text>
      </MotionPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  logoLink: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  logoMark: {
    borderRadius: 16,
    height: 56,
    width: 56,
  },
  logoText: {
    color: "#1F2937",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 28,
  },
});
