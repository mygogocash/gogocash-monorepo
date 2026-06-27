import { useEffect, useMemo, useState } from "react";
import { Animated, View } from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { motion } from "@mobile/theme/motion";

import { DesktopGoLinkBanner } from "./DesktopGoLinkBanner";

type MobileTabletGoLinkBannerCollapseProps = {
  readonly isCovered: boolean;
  readonly onOpenGuideline: () => void;
  readonly onResultHref: (href: string) => void;
};

export function MobileTabletGoLinkBannerCollapse({
  isCovered,
  onOpenGuideline,
  onResultHref,
}: MobileTabletGoLinkBannerCollapseProps) {
  const reducedMotion = useReducedMotion();
  const expandProgress = useMemo(() => new Animated.Value(isCovered ? 0 : 1), []);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    expandProgress.stopAnimation();
    Animated.timing(expandProgress, {
      duration: reducedMotion ? 0 : motion.duration.accordionExpand,
      easing: isCovered ? motion.easing.in : motion.easing.out,
      toValue: isCovered ? 0 : 1,
      useNativeDriver: motion.useLayoutNativeDriver,
    }).start();
  }, [expandProgress, isCovered, reducedMotion]);

  const animatedHeight =
    contentHeight > 0
      ? expandProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, contentHeight],
        })
      : isCovered
        ? 0
        : undefined;

  return (
    <Animated.View
      style={[
        {
          marginBottom: expandProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 12],
          }),
          opacity: expandProgress,
          overflow: "hidden",
          pointerEvents: isCovered ? "none" : "auto",
        },
        animatedHeight != null ? { height: animatedHeight } : null,
      ]}
    >
      <View
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0 && nextHeight !== contentHeight) {
            setContentHeight(nextHeight);
          }
        }}
      >
        <DesktopGoLinkBanner
          onOpenGuideline={onOpenGuideline}
          onResultHref={onResultHref}
          variant="mobileTabletHeader"
        />
      </View>
    </Animated.View>
  );
}
