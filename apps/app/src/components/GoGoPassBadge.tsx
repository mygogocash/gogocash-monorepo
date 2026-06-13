import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { typography } from "@mobile/theme/tokens";

// "GOGOPASS" gold pill shown next to the member name. Renders null for free/undefined tiers.
function isPremiumTier(tier?: string): boolean {
  return tier === "gogopass" || tier === "gogopass-pro";
}

export function GoGoPassBadge({ tier }: { tier?: string }) {
  if (!isPremiumTier(tier)) {
    return null;
  }
  const label = tier === "gogopass-pro" ? "GOGOPASS PRO" : "GOGOPASS";
  return (
    <View accessibilityLabel={`${label} member`} style={styles.badge}>
      <Svg height={9} viewBox="0 0 12 12" width={9}>
        <Path d="M6 1l1.5 3.2L11 5l-2.5 2.5L9 11 6 9.3 3 11l.5-3.5L1 5l3.5-.8L6 1z" fill="#1A1400" />
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: "#D4AF37",
    borderRadius: 999,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    color: "#1A1400",
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
