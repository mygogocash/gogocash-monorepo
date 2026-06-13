import { Link } from "expo-router";
import { Image, StyleSheet } from "react-native";

import lineOfficialFabImage from "../../assets/nav/line-official-fab.png";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { webLineOfficialFab } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { radii } from "@mobile/theme/tokens";

export function CustomerLineOfficialFab() {
  return (
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
  );
}

const styles = StyleSheet.create({
  lineOfficialFab: {
    alignItems: "center",
    backgroundColor: "#06C755",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radii.chip,
    borderWidth: 2,
    bottom: 32,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    position: "absolute",
    right: 32,
    width: 64,
    zIndex: 70,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
  },
  lineOfficialFabImage: {
    height: "100%",
    width: "100%",
  },
});
