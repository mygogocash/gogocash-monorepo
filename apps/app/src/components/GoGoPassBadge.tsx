import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { isGoGoPassEnabled } from "@mobile/config/featureFlags";
import { isGoGoPassSubscriber } from "@mobile/lib/membershipTier";
import { typography } from "@mobile/theme/tokens";

// "GOGOPASS" gold pill shown next to the member name. Renders null unless subscribed.
export function GoGoPassBadge({ tier }: { tier?: string }) {
  // GoGoPass rollout flag: hidden builds render no badge for any tier.
  if (!isGoGoPassEnabled() || !isGoGoPassSubscriber(tier)) {
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
    alignSelf: "flex-start",
    backgroundColor: "#D4AF37",
    borderRadius: 999,
    flexDirection: "row",
    flexShrink: 0,
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
