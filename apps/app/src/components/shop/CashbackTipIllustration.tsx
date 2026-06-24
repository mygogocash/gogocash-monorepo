import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  type ShopCashbackTipId,
} from "@mobile/components/shop/shopCashbackTipsTypes";
import {
  ArrowLeftRight,
  Camera,
  CheckCircle,
  ClipboardText,
  Cookie,
  CreditCard,
  Globe,
  Link2,
  Monitor,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Storefront,
  type IconComponent,
} from "@mobile/theme/icons";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

type CashbackTipIllustrationProps = {
  readonly tipId: ShopCashbackTipId;
};

type IllustrationSpec = {
  readonly accentColor: keyof Pick<ThemeColors, "primary" | "accent" | "danger" | "link">;
  readonly bubble: keyof Pick<ThemeColors, "primarySoft" | "warningSoft" | "accentSoft">;
  readonly Icon: IconComponent;
  readonly MiniIcon?: IconComponent;
};

const illustrationSpecs: Record<ShopCashbackTipId, IllustrationSpec> = {
  "excluded-products": {
    bubble: "warningSoft",
    accentColor: "danger",
    Icon: ShoppingCart,
    MiniIcon: Camera,
  },
  "check-terms": {
    bubble: "primarySoft",
    accentColor: "primary",
    Icon: ClipboardText,
    MiniIcon: CheckCircle,
  },
  "restart-platform": {
    bubble: "primarySoft",
    accentColor: "accent",
    Icon: Globe,
    MiniIcon: Storefront,
  },
  "no-adblock": {
    bubble: "primarySoft",
    accentColor: "primary",
    Icon: ShieldCheck,
    MiniIcon: Link2,
  },
  "empty-cart": {
    bubble: "warningSoft",
    accentColor: "accent",
    Icon: ShoppingCart,
    MiniIcon: Sparkles,
  },
  "payment-fail": {
    bubble: "warningSoft",
    accentColor: "danger",
    Icon: CreditCard,
    MiniIcon: ArrowLeftRight,
  },
  "accept-cookies": {
    bubble: "primarySoft",
    accentColor: "primary",
    Icon: Cookie,
    MiniIcon: CheckCircle,
  },
};

export function CashbackTipIllustration({ tipId }: CashbackTipIllustrationProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const spec = illustrationSpecs[tipId];
  const bubbleColor = colors[spec.bubble];
  const iconColor = colors[spec.accentColor];
  const MainIcon = spec.Icon;
  const MiniIcon = spec.MiniIcon;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.wrap}>
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        <Svg height={56} style={styles.glow} viewBox="0 0 56 56" width={56}>
          <Circle cx="18" cy="16" fill={pickThemed(colors, "rgba(0, 204, 153, 0.18)", "rgba(94, 234, 212, 0.16)")} r="10" />
          <Circle cx="40" cy="38" fill={pickThemed(colors, "rgba(0, 170, 128, 0.12)", "rgba(0, 204, 153, 0.14)")} r="8" />
        </Svg>
        <MainIcon color={iconColor} size={26} strokeWidth={typography.iconStrokeWidth} weight="duotone" />
        {MiniIcon ? (
          <View style={styles.miniBadge}>
            <MiniIcon color={colors.primaryDark} size={12} strokeWidth={2.2} weight="fill" />
          </View>
        ) : null}
      </View>
      {tipId === "excluded-products" ? (
        <View style={styles.liveVideoHint}>
          <Monitor color={colors.muted} size={11} strokeWidth={2} />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      height: 56,
      position: "relative",
      width: 56,
    },
    bubble: {
      alignItems: "center",
      borderColor: pickThemed(colors, colors.border, colors.borderStrong),
      borderRadius: 20,
      borderWidth: 1,
      height: 56,
      justifyContent: "center",
      overflow: "hidden",
      width: 56,
    },
    glow: {
      ...StyleSheet.absoluteFill,
    },
    miniBadge: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 11,
      borderWidth: 1.5,
      bottom: -2,
      height: 22,
      justifyContent: "center",
      position: "absolute",
      right: -2,
      width: 22,
    },
    liveVideoHint: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 9,
      borderWidth: 1,
      bottom: 0,
      height: 18,
      justifyContent: "center",
      left: -4,
      position: "absolute",
      width: 18,
    },
  });
}
