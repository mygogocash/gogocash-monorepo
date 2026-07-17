import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  ScrollView,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";

import shopPromoGogoQuestImage from "../../../assets/shop-promo-gogoquest.png";
import type { SpecificPageBannerTarget } from "@mobile/account/specificPageBannerResource";
import { trackPromotionSelect } from "@mobile/analytics/events";
import { useAnalytics } from "@mobile/analytics/useAnalytics";
import { CarouselDots, getCarouselPageMotionStyle } from "@mobile/components/CarouselDots";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { useCopy } from "@mobile/i18n/useCopy";
import { prefetchRemoteImages } from "@mobile/lib/prefetchRemoteImages";
import { getPagedScrollIndex } from "@mobile/screens/home/homeHelpers";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { shopDirectoryImageAssets } from "./directoryAssets";
import { type DirectoryPromo } from "./discoveryTypes";

const PROMO_AUTO_ADVANCE_MS = 6000;
const PROMO_SLIDE_GAP = 24;

type DirectoryPromoSlide = DirectoryPromo["slides"][number];

function resolveDirectoryPromoSlideSource(
  slide: DirectoryPromoSlide,
): ImageSourcePropType {
  if ("imageUri" in slide && typeof slide.imageUri === "string" && slide.imageUri.length > 0) {
    return { uri: slide.imageUri };
  }

  if ("imageAsset" in slide && slide.imageAsset) {
    return shopDirectoryImageAssets[slide.imageAsset] ?? shopPromoGogoQuestImage;
  }

  return shopPromoGogoQuestImage;
}

function SpecificPageBannerSlideAction({
  children,
  href,
  pageTarget,
  promotionName,
  slideId,
  slot,
  style,
}: {
  children: ReactNode;
  href?: string;
  pageTarget: SpecificPageBannerTarget;
  promotionName: string;
  slideId: string;
  slot: number;
  style: StyleProp<ViewStyle>;
}) {
  const analytics = useAnalytics();

  if (!href) {
    return (
      <View style={style} testID={`specific-page-banner-slide-${slideId}`}>
        {children}
      </View>
    );
  }

  return (
    <Link
      asChild
      href={href as never}
      onPress={() =>
        trackPromotionSelect(analytics, {
          creativeSlot: `${pageTarget}:${slot}`,
          destination: href,
          promotionId: slideId,
          promotionName,
        })
      }
    >
      <MotionPressable
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={style}
        testID={`specific-page-banner-slide-${slideId}`}
      >
        {children}
      </MotionPressable>
    </Link>
  );
}

export function SpecificPageBannerCarousel({
  contentWidth,
  isDesktop,
  pageTarget,
  promo,
}: {
  contentWidth: number;
  isDesktop: boolean;
  pageTarget: SpecificPageBannerTarget;
  promo: DirectoryPromo;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const reducedMotion = useReducedMotion();
  const slides = promo.slides;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const interactingRef = useRef(false);
  const scrollX = useMemo(() => new Animated.Value(0), []);
  const slideWidth = isDesktop ? Math.min(800, contentWidth) : Math.min(800, contentWidth * 0.85);
  const pageStride = slideWidth + PROMO_SLIDE_GAP;
  const slideHeight = slideWidth / promo.aspectRatio;
  const maxPageIndex = Math.max(0, slides.length - 1);

  useEffect(() => {
    prefetchRemoteImages(
      slides.flatMap((slide) =>
        "imageUri" in slide && typeof slide.imageUri === "string" ? [slide.imageUri] : [],
      ),
    );
  }, [slides]);

  useEffect(() => {
    const clampedIndex = Math.min(activeIndex, maxPageIndex);
    if (clampedIndex === activeIndex) {
      return;
    }

    setActiveIndex(clampedIndex);
    scrollRef.current?.scrollTo({ animated: false, x: clampedIndex * pageStride });
  }, [activeIndex, maxPageIndex, pageStride]);

  useEffect(() => {
    if (reducedMotion || slides.length <= 1 || pageStride <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      if (interactingRef.current) {
        return;
      }

      setActiveIndex((current) => {
        const next = (current + 1) % slides.length;
        scrollRef.current?.scrollTo({ animated: true, x: next * pageStride });
        return next;
      });
    }, PROMO_AUTO_ADVANCE_MS);

    return () => clearInterval(intervalId);
  }, [pageStride, reducedMotion, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <View style={styles.shopDirectoryPromo}>
      <View style={styles.shopDirectoryPromoTitleFrame}>
        <Text
          style={[
            styles.shopDirectoryPromoTitle,
            isDesktop ? styles.shopDirectoryPromoTitleDesktop : null,
          ]}
        >
          {tc(promo.title)}
        </Text>
      </View>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={{ gap: PROMO_SLIDE_GAP, paddingRight: PROMO_SLIDE_GAP }}
        decelerationRate="fast"
        disableIntervalMomentum
        horizontal
        onMomentumScrollEnd={(event) => {
          interactingRef.current = false;
          setActiveIndex(getPagedScrollIndex(event, pageStride, maxPageIndex));
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: motion.useNativeDriver },
        )}
        onScrollBeginDrag={() => {
          interactingRef.current = true;
        }}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={pageStride}
      >
        {slides.map((slide, index) => {
          const motionStyle = getCarouselPageMotionStyle(
            scrollX,
            index,
            pageStride,
            reducedMotion,
          );
          const slideLabel = tc(slide.accessibilityLabel);

          return (
            <Animated.View
              key={slide.id}
              style={[
                styles.shopDirectoryPromoSlide,
                motionStyle,
                {
                  height: slideHeight,
                  width: slideWidth,
                },
              ]}
            >
              <SpecificPageBannerSlideAction
                href={slide.href}
                pageTarget={pageTarget}
                promotionName={promo.title}
                slideId={slide.id}
                slot={slide.slot ?? index + 1}
                style={styles.shopDirectoryPromoSlideLink}
              >
                <Image
                  accessibilityLabel={slideLabel}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  source={resolveDirectoryPromoSlideSource(slide)}
                  style={styles.shopDirectoryPromoImage}
                  transition={motion.duration.fast}
                />
                <View style={styles.shopDirectoryPromoVignette} />
              </SpecificPageBannerSlideAction>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      <CarouselDots
        activeIndex={activeIndex}
        color={colors.primary}
        containerStyle={styles.shopDirectoryPromoDots}
        count={slides.length}
        pageWidth={pageStride}
        scrollX={scrollX}
        size={8}
      />
    </View>
  );
}
