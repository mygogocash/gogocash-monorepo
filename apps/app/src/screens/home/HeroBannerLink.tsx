import { type ReactNode } from "react";
import { Link } from "expo-router";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { type HomeHeroBanner } from "@mobile/account/homeBannerResource";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { trackPromotionSelect } from "@mobile/analytics/events";
import { useAnalytics } from "@mobile/analytics/useAnalytics";
import { motion } from "@mobile/theme/motion";

export function HeroBannerLink({
  banner,
  children,
  style,
}: {
  banner: HomeHeroBanner;
  children: ReactNode;
  style: StyleProp<ViewStyle>;
}) {
  const analytics = useAnalytics();

  return (
    <Link
      asChild
      href={banner.href as never}
      onPress={() =>
        trackPromotionSelect(analytics, {
          promotionId: banner.id,
          promotionName: banner.id,
          creativeSlot: banner.placement,
          destination: banner.href,
        })
      }
    >
      <MotionPressable pressScale={motion.scale.subtlePress} style={StyleSheet.flatten(style)}>
        {children}
      </MotionPressable>
    </Link>
  );
}
