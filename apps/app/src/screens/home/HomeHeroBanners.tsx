import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
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
import { HeroBannerImage } from "./HeroBannerImage";
import { HeroBannerLink } from "./HeroBannerLink";
import {
  buildLoopedHeroBannerSlides,
  getLoopedHeroBannerActiveIndex,
  getLoopedHeroBannerAutoAdvanceTarget,
  getLoopedHeroBannerDotScrollX,
  resolveLoopedHeroBannerJumpTarget,
} from "./homeHelpers";
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
  const loopedMainBanners = useMemo(
    () => buildLoopedHeroBannerSlides(mainBanners),
    [mainBanners],
  );
  const heroCarouselSlides = loopedMainBanners.slides;
  const heroCarouselStartIndex = loopedMainBanners.startIndex;
  const [activeHeroBannerPage, setActiveHeroBannerPage] = useState(0);
  const [heroBannerWidth, setHeroBannerWidth] = useState(homeLayout.contentWidth);
  const heroScrollX = useMemo(() => new Animated.Value(0), []);
  const heroDotScrollX = useMemo(() => new Animated.Value(0), []);
  const reducedMotion = useReducedMotion();
  const heroScrollRef = useRef<ScrollView>(null);
  const heroInteractingRef = useRef(false);
  const heroCarouselReadyRef = useRef(false);

  useEffect(() => {
    prefetchRemoteImages(heroBanners.map((banner) => banner.imageUri));
  }, [heroBanners]);

  useEffect(() => {
    heroCarouselReadyRef.current = false;
    setActiveHeroBannerPage(0);
  }, [mainBanners.length]);

  useEffect(() => {
    if (mainBanners.length <= 1 || heroBannerWidth <= 0) {
      return;
    }

    const startOffset = heroCarouselStartIndex * heroBannerWidth;
    heroScrollRef.current?.scrollTo({ animated: false, x: startOffset });
    heroScrollX.setValue(startOffset);
    heroDotScrollX.setValue(0);
    heroCarouselReadyRef.current = true;
  }, [heroBannerWidth, heroCarouselStartIndex, heroDotScrollX, heroScrollX, mainBanners.length]);

  // Premium auto-advance: cycle the main hero banners on a gentle interval, but stay out of the way —
  // pause while the user is actively dragging, and disable entirely under reduce-motion.
  useEffect(() => {
    if (reducedMotion || mainBanners.length <= 1 || heroBannerWidth <= 0) {
      return;
    }
    const intervalId = setInterval(() => {
      if (heroInteractingRef.current || !heroCarouselReadyRef.current) {
        return;
      }
      setActiveHeroBannerPage((current) => {
        const { activeIndex, extendedIndex } = getLoopedHeroBannerAutoAdvanceTarget(
          current,
          mainBanners.length,
        );
        heroScrollRef.current?.scrollTo({
          animated: true,
          x: extendedIndex * heroBannerWidth,
        });
        return activeIndex;
      });
    }, 5000);
    return () => clearInterval(intervalId);
  }, [heroBannerWidth, mainBanners.length, reducedMotion]);

  const syncHeroBannerScrollState = (contentOffsetX: number) => {
    if (mainBanners.length <= 1 || heroBannerWidth <= 0) {
      return;
    }

    heroDotScrollX.setValue(
      getLoopedHeroBannerDotScrollX(contentOffsetX, heroBannerWidth, mainBanners.length),
    );
  };

  const handleHeroBannerMomentumEnd = (contentOffsetX: number) => {
    heroInteractingRef.current = false;

    if (mainBanners.length <= 1 || heroBannerWidth <= 0) {
      return;
    }

    const extendedIndex = Math.round(contentOffsetX / heroBannerWidth);
    const jumpTarget = resolveLoopedHeroBannerJumpTarget(extendedIndex, mainBanners.length);

    if (jumpTarget !== null) {
      const jumpOffset = jumpTarget * heroBannerWidth;
      heroScrollRef.current?.scrollTo({ animated: false, x: jumpOffset });
      heroScrollX.setValue(jumpOffset);
      heroDotScrollX.setValue(
        getLoopedHeroBannerDotScrollX(jumpOffset, heroBannerWidth, mainBanners.length),
      );
      setActiveHeroBannerPage(getLoopedHeroBannerActiveIndex(jumpTarget, mainBanners.length));
      return;
    }

    syncHeroBannerScrollState(contentOffsetX);
  };

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
            handleHeroBannerMomentumEnd(event.nativeEvent.contentOffset.x);
          }}
          onScrollBeginDrag={() => {
            heroInteractingRef.current = true;
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: heroScrollX } } }],
            {
              listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                syncHeroBannerScrollState(event.nativeEvent.contentOffset.x);
              },
              useNativeDriver: motion.useNativeDriver,
            },
          )}
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={heroBannerWidth}
          style={styles.heroScroll}
        >
          {heroCarouselSlides.map((banner, index) => (
            <HeroBannerLink
              banner={banner}
              key={`${banner.id}-${index}`}
              style={[styles.heroBannerLink, styles.heroSlide, { width: heroBannerWidth }]}
            >
              <HeroBannerImage banner={banner} style={styles.heroImage} />
            </HeroBannerLink>
          ))}
        </Animated.ScrollView>
        <CarouselDots
          activeIndex={activeHeroBannerPage}
          color={colors.white}
          containerStyle={styles.heroDots}
          count={mainBanners.length}
          pageWidth={heroBannerWidth}
          scrollX={heroDotScrollX}
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
            <HeroBannerImage banner={banner} style={styles.heroImage} />
          </HeroBannerLink>
        ))}
      </View>
      </View>
    </View>
  );
}
