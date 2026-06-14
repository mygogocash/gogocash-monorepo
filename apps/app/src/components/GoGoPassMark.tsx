import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// Compact icon-only premium indicator — parity with the web `PremiumMark`
// (src/components/premium/PremiumMark.tsx). A gold verification "burst" (rounded
// 12-point star) used inline after a username in dense UI like the header pill,
// where the full "GOGOPASS" text label would compete with the name.
// Renders nothing for free / undefined tiers.

type MarkStyle = { readonly accent: string; readonly accentSoft: string };

const TIER_STYLES: Record<string, MarkStyle> = {
  gogopass: { accent: "#D4AF37", accentSoft: "#F4E4A8" },
  "gogopass-pro": { accent: "#C9A227", accentSoft: "#FFE680" },
};

export function GoGoPassMark({
  tier,
  size = 14,
  marginLeft = 4,
}: {
  tier?: string;
  size?: number;
  marginLeft?: number;
}) {
  const style = tier ? TIER_STYLES[tier] : undefined;
  if (!style) {
    return null;
  }

  const gradientId = `gg-mark-${tier}`;
  return (
    <View
      accessibilityLabel="GoGoPass member"
      style={{ alignItems: "center", height: size, justifyContent: "center", marginLeft, width: size }}
    >
      <Svg fill="none" height={size} viewBox="0 0 16 16" width={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={style.accentSoft} />
            <Stop offset="0.6" stopColor={style.accent} />
            <Stop offset="1" stopColor="#8B6914" />
          </LinearGradient>
        </Defs>
        {/* Soft verification burst — rounded 12-point star, reads as "premium tick". */}
        <Path
          d="M8 1l1.3 1.8L11.5 2l.3 2.2L14 5l-1.1 1.9L14 9l-2.2.8L11.5 12l-2.2-.2L8 13.5 6.7 11.8 4.5 12l-.3-2.2L2 9l1.1-1.9L2 5l2.2-.8L4.5 2l2.2.2L8 1z"
          fill={`url(#${gradientId})`}
        />
        {/* Inner sparkle — a 4-point gleam centered in the star. */}
        <Path
          d="M8 5.2l.6 1.4 1.4.6-1.4.6L8 9.2l-.6-1.4L6 7.2l1.4-.6L8 5.2z"
          fill={style.accentSoft}
          opacity={0.9}
        />
      </Svg>
    </View>
  );
}
