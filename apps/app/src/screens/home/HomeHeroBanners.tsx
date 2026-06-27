import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import {
  type BannerHomeDocument,
  type HomeHeroBanner,
  resolveHomeHeroBanners,
} from "@mobile/account/homeBannerResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { CarouselDots } from "@mobile/components/CarouselDots";
import { useReducedMotion } from "@mobile/hooks/useReducedMotion";
import { prefetchRemoteImages } from "@mobile/lib/prefetchRemoteImages";
import { motion } from "@mobile/theme/motion";
import { webHomeHeroBanners } from "@mobile/design/webDesignParity";
import { HeroBannerLink } from "./HeroBannerLink";
import { getPagedScrollIndex, heroBannerSource } from "./homeHelpers";
import { useHomeScreenColors, useHomeScreenStyles } from "./homeScreenHooks";
import { type HomeLayoutMetrics } from "./homeTypes";

export function HomeHeroBanners({ homeLayout }: { homeLayout: HomeLayoutMetrics }) {
  const styles = useHomeScreenStyles();
  const colors = useHomeScreenColors();
  const heroBannerResource = useCustomerAccountResource<readonly HomeHeroBanner[], BannerHomeDocument>({
    fixtureData: webHomeHeroBanners,
    resourceId: "homeBanner",
  });
  const heroBanners = resolveHomeHeroBanners(
    heroBannerResource.source,
    heroBannerResource.data,
    webHomeHeroBanners,
  );
  const mainBanners = heroBanners.filter((banner) => banner.placement === "main");
  const sideBanners = heroBanners.filter((banner) => banner.placement === "side");
  const [activeHeroBannerPage, setActiveHeroBannerPage] = useState(0);
  const [heroBannerWidth, setHeroBannerWidth] = useState(homeLayout.contentWidth);
  const heroMaxPageIndex = Math.max(0, mainBanners.length - 1);
  const heroScrollX = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();
  const heroScrollRef = useRef<ScrollView>(null);
  const heroInteractingRef = useRef(false);

  useEffect(() => {
    prefetchRemoteImages(heroBanners.map((banner) => banner.imageUri));
  }, [heroBanners]);

  // Premium auto-advance: cycle the main hero banners on a gentle interval, but stay out of the way —
  // pause while the user is actively dragging, and disable entirely under reduce-motion.
  useEffect(() => {
    if (reducedMotion || mainBanners.length <= 1 || heroBannerWidth <= 0) {
      return;
    }
    const intervalId = setInterval(() => {
      if (heroInteractingRef.current) {
        return;
      }
      setActiveHeroBannerPage((current) => {
        const next = (current + 1) % mainBanners.length;
        heroScrollRef.current?.scrollTo({ animated: true, x: next * heroBannerWidth });
        return next;
      });
    }, 5000);
    return () => clearInterval(intervalId);
  }, [heroBannerWidth, mainBanners.length, reducedMotion]);

  return (
    <View style={[styles.heroStack, homeLayout.isDesktop ? styles.heroStackDesktop : null]}>
      <View
        style={[
          styles.heroBannerSection,
          homeLayout.isDesktop ? styles.heroBannerSectionDesktop : null,
        ]}
      >
      <View
        onLayout={(event) => setHeroBannerWidth(event.nativeEvent.layout.width)}
        style={[
          styles.mainHeroFrame,
          { aspectRatio: homeLayout.mainBannerAspectRatio },
          homeLayout.isDesktop ? styles.mainHeroFrameDesktop : null,
        ]}
      >
        <Animated.ScrollView
          ref={heroScrollRef}
          contentContainerStyle={styles.heroScrollContent}
          decelerationRate="fast"
          disableIntervalMomentum
          horizontal
          onMomentumScrollEnd={(event) => {
            heroInteractingRef.current = false;
            setActiveHeroBannerPage(getPagedScrollIndex(event, heroBannerWidth, heroMaxPageIndex));
          }}
          onScrollBeginDrag={() => {
            heroInteractingRef.current = true;
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: heroScrollX } } }],
            { useNativeDriver: motion.useNativeDriver }
          )}
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={heroBannerWidth}
          style={styles.heroScroll}
        >
          {mainBanners.map((banner) => (
            <HeroBannerLink
              banner={banner}
              key={banner.id}
              style={[styles.heroBannerLink, styles.heroSlide, { width: heroBannerWidth }]}
            >
              <Image
                accessibilityLabel={`${banner.id} promotion banner`}
                cachePolicy="memory-disk"
                contentFit="cover"
                source={heroBannerSource(banner)}
                style={styles.heroImage}
              />
            </HeroBannerLink>
          ))}
        </Animated.ScrollView>
        <CarouselDots
          activeIndex={activeHeroBannerPage}
          color={colors.white}
          containerStyle={styles.heroDots}
          count={mainBanners.length}
          pageWidth={heroBannerWidth}
          scrollX={heroScrollX}
          size={8}
        />
      </View>

      <View style={[styles.sideHeroRow, homeLayout.isDesktop ? styles.sideHeroRowDesktop : null]}>
        {sideBanners.map((banner) => (
          <HeroBannerLink
            banner={banner}
            key={banner.id}
            style={[
              styles.sideHeroFrame,
              styles.heroBannerLink,
              homeLayout.isDesktop ? styles.sideHeroFrameDesktop : styles.sideHeroFrameMobile,
            ]}
          >
            <Image
              accessibilityLabel={`${banner.id} promotion banner`}
              cachePolicy="memory-disk"
              contentFit="cover"
              source={heroBannerSource(banner)}
              style={styles.heroImage}
            />
          </HeroBannerLink>
        ))}
      </View>
      </View>
    </View>
  );
}
