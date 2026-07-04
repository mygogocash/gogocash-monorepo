import { useEffect, useMemo, useState } from "react";
import { Animated, View } from "react-native";

import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { runTransformTiming } from "@mobile/theme/animatedMotion";
import { motion } from "@mobile/theme/motion";

import { DesktopGoLinkBanner } from "./DesktopGoLinkBanner";

type MobileTabletGoLinkBannerCollapseProps = {
  readonly isCovered: boolean;
  readonly onOpenGuideline: () => void;
  readonly onResultHref: (href: string) => void;
};

const collapsedScaleY = 0.001;

export function MobileTabletGoLinkBannerCollapse({
  isCovered,
  onOpenGuideline,
  onResultHref,
}: MobileTabletGoLinkBannerCollapseProps) {
  const reducedMotion = useReducedMotion();
  const [bannerMounted, setBannerMounted] = useState(!isCovered);
  const expandProgress = useMemo(() => new Animated.Value(isCovered ? 0 : 1), []);

  useEffect(() => {
    expandProgress.stopAnimation();

    if (isCovered) {
      if (reducedMotion) {
        expandProgress.setValue(0);
        setBannerMounted(false);
        return undefined;
      }

      runTransformTiming(expandProgress, {
        duration: motion.duration.accordionExpand,
        easing: motion.easing.in,
        toValue: 0,
      }).start(({ finished }) => {
        if (finished) {
          setBannerMounted(false);
        }
      });

      return () => expandProgress.stopAnimation();
    }

    setBannerMounted(true);
    if (reducedMotion) {
      expandProgress.setValue(1);
      return undefined;
    }

    expandProgress.setValue(0);
    runTransformTiming(expandProgress, {
      duration: motion.duration.accordionExpand,
      easing: motion.easing.out,
      toValue: 1,
    }).start();

    return () => expandProgress.stopAnimation();
  }, [expandProgress, isCovered, reducedMotion]);

  if (!bannerMounted) {
    return null;
  }

  return (
    <Animated.View
      style={{
        marginBottom: 12,
        opacity: expandProgress,
        overflow: "hidden",
        pointerEvents: isCovered ? "none" : "auto",
        transform: [
          {
            scaleY: expandProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [collapsedScaleY, 1],
            }),
          },
        ],
        transformOrigin: "top",
      }}
    >
      <View>
        <DesktopGoLinkBanner
          onOpenGuideline={onOpenGuideline}
          onResultHref={onResultHref}
          variant="mobileTabletHeader"
        />
      </View>
    </Animated.View>
  );
}
