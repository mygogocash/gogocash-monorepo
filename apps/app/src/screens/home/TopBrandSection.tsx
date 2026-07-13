import { useMemo, useState, useEffect } from "react";
import { Link } from "expo-router";
import { Animated, Text, View } from "react-native";
import {
  resolveTopBrands,
  type TopBrandsPayload,
} from "@mobile/account/topBrandResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { BrandCard } from "@mobile/components/BrandCard";
import { CarouselDots } from "@mobile/components/CarouselDots";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getMobileEnv } from "@mobile/config/env";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { prefetchRemoteImages } from "@mobile/lib/prefetchRemoteImages";
import { getCarouselDotCount, webTopBrandCards } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import {
  chunkTopBrandCards,
  getPagedScrollIndex,
  getPromoGridCardWidth,
  getPromoSectionLayoutMode,
} from "./homeHelpers";
import { useHomeScreenColors, useHomeScreenStyles } from "./homeScreenHooks";
import { type HomeLayoutMetrics, type TopBrandCardProps } from "./homeTypes";

export function TopBrandSection({
  brandCatalogData,
  homeLayout,
}: {
  brandCatalogData: unknown;
  homeLayout: HomeLayoutMetrics;
}) {
  const styles = useHomeScreenStyles();
  const colors = useHomeScreenColors();
  const tc = useCopy();
  const { region } = useLocale();
  const topBrandResource = useCustomerAccountResource<readonly TopBrandCardProps[], TopBrandsPayload>({
    fixtureData: webTopBrandCards,
    resourceId: "topBrand",
  });
  const apiBaseUrl = useMemo(() => getMobileEnv().apiUrl, []);
  const topBrands = resolveTopBrands(
    topBrandResource.source,
    topBrandResource.data,
    webTopBrandCards,
    brandCatalogData,
    region,
    apiBaseUrl,
  );
  const topBrandPages = chunkTopBrandCards(topBrands, homeLayout.topBrandCardsPerPage);
  // Same mobile treatment as the promo rails (founder feedback 2026-07-11):
  // few cards → static grid; more → free momentum scroll; desktop pager.
  const layoutMode = getPromoSectionLayoutMode(homeLayout.isDesktop, topBrands.length);
  const isPager = layoutMode === "pager";
  const topBrandColumns = chunkTopBrandCards(topBrands, homeLayout.topBrandRowsPerPage);
  const gridCardWidth = getPromoGridCardWidth(
    homeLayout.brandSectionFrameWidth,
    homeLayout.topBrandGap
  );
  const [activeTopBrandPage, setActiveTopBrandPage] = useState(0);
  const topBrandDotCount = getCarouselDotCount(
    topBrands.length,
    homeLayout.topBrandCardsPerPage
  );
  const topBrandMaxPageIndex = Math.max(0, topBrandPages.length - 1);
  const activeTopBrandDot = Math.min(activeTopBrandPage, topBrandDotCount - 1);
  const topBrandScrollX = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    prefetchRemoteImages(topBrands.map((brand) => brand.logoUri));
  }, [topBrands]);

  return (
    <View style={styles.section} testID="home-top-brands">
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitle}>
            {tc("Top Brands")}
          </Text>
          <Text style={styles.topBrandEmoji}>🔥</Text>
        </View>
        <Link asChild href="/brand">
          <MotionPressable pressScale={motion.scale.subtlePress}>
            {/* Only the words go through tc — the arrow suffix breaks the catalog match. */}
            <Text style={styles.sectionAction}>{`${tc("View all")}  →`}</Text>
          </MotionPressable>
        </Link>
      </View>

      <View style={styles.topBrandPager}>
        {layoutMode === "grid" ? (
          <View style={[styles.brandGrid, { gap: homeLayout.topBrandGap, width: "100%" }]}>
            {topBrands.map((card) => (
              <BrandCard
                cardHeight={homeLayout.topBrandCardHeight}
                cardWidth={gridCardWidth}
                key={card.id ?? card.brand}
                {...card}
                size="L"
              />
            ))}
          </View>
        ) : (
        <View style={{ height: homeLayout.topBrandGridHeight, overflow: "hidden", width: "100%" }}>
        <Animated.ScrollView
          contentContainerStyle={[
            styles.topBrandPagerContent,
            isPager ? null : { gap: homeLayout.topBrandGap },
          ]}
          decelerationRate={isPager ? "fast" : "normal"}
          disableIntervalMomentum={isPager}
          horizontal
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: topBrandScrollX } } }],
            { useNativeDriver: motion.useNativeDriver }
          )}
          onMomentumScrollEnd={(event) =>
            setActiveTopBrandPage(
              getPagedScrollIndex(event, homeLayout.topBrandGroupWidth, topBrandMaxPageIndex)
            )
          }
          pagingEnabled={isPager}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={isPager ? homeLayout.topBrandGroupWidth : undefined}
          style={[styles.topBrandScroll, { height: homeLayout.topBrandGridHeight }]}
        >
          {isPager
            ? topBrandPages.map((pageCards, pageIndex) => (
                <Animated.View
                  key={`top-brand-page-${pageIndex}`}
                  style={[
                    styles.topBrandPage,
                    styles.brandGrid,
                    {
                      gap: homeLayout.topBrandGap,
                      height: homeLayout.topBrandGridHeight,
                      width: homeLayout.topBrandGroupWidth,
                    },
                  ]}
                >
                  {pageCards.map((card) => (
                    <BrandCard
                      cardHeight={homeLayout.topBrandCardHeight}
                      cardWidth={homeLayout.topBrandCardWidth}
                      key={card.id ?? card.brand}
                      {...card}
                      size="L"
                    />
                  ))}
                </Animated.View>
              ))
            : topBrandColumns.map((columnCards, columnIndex) => (
                <View
                  key={`top-brand-column-${columnIndex}`}
                  style={{ gap: homeLayout.topBrandGap }}
                >
                  {columnCards.map((card) => (
                    <BrandCard
                      cardHeight={homeLayout.topBrandCardHeight}
                      cardWidth={homeLayout.topBrandCardWidth}
                      key={card.id ?? card.brand}
                      {...card}
                      size="L"
                    />
                  ))}
                </View>
              ))}
        </Animated.ScrollView>
        </View>
        )}
        {isPager ? (
          <CarouselDots
            activeIndex={activeTopBrandDot}
            color={colors.primary}
            containerStyle={styles.topBrandDots}
            count={topBrandDotCount}
            pageWidth={homeLayout.topBrandGroupWidth}
            scrollX={topBrandScrollX}
            size={12}
          />
        ) : null}
      </View>
    </View>
  );
}
