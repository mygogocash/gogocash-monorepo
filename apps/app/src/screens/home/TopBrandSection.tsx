import { useMemo, useState, useEffect } from "react";
import { Link } from "expo-router";
import { Animated, Text, View } from "react-native";
import {
  resolveTopBrands,
  type TopBrandsPayload,
} from "@mobile/account/topBrandResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { BrandCard } from "@mobile/components/BrandCard";
import { CarouselRail } from "@mobile/components/CarouselRail";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { getMobileEnv } from "@mobile/config/env";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { prefetchRemoteImages } from "@mobile/lib/prefetchRemoteImages";
import { webTopBrandCards } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import {
  chunkTopBrandCards,
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
    homeLayout.isDesktop ? "desktop" : "mobile",
  );
  // Same mobile treatment as the promo rails (founder feedback 2026-07-11):
  // few cards → static grid; more → free momentum scroll; desktop pager.
  const layoutMode = getPromoSectionLayoutMode(homeLayout.isDesktop, topBrands.length);
  const isPager = layoutMode === "pager";
  const topBrandColumns = chunkTopBrandCards(topBrands, homeLayout.topBrandRowsPerPage);
  const gridCardWidth = getPromoGridCardWidth(
    homeLayout.brandSectionFrameWidth,
    homeLayout.topBrandGap
  );
  const topBrandScrollX = useMemo(() => new Animated.Value(0), []);
  // #498 — the rail is proportional, so it needs the real scroll geometry rather than a
  // page count. Measured from the ScrollView instead of derived, so it stays correct
  // whatever the column count works out to be.
  const [railContentWidth, setRailContentWidth] = useState(0);
  const [railVisibleWidth, setRailVisibleWidth] = useState(0);

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
            { gap: homeLayout.topBrandGap },
          ]}
          decelerationRate="normal"

          horizontal
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: topBrandScrollX } } }],
            { useNativeDriver: motion.useNativeDriver }
          )}

          onContentSizeChange={(width) => setRailContentWidth(width)}
          onLayout={(event) => setRailVisibleWidth(event.nativeEvent.layout.width)}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}


          style={[styles.topBrandScroll, { height: homeLayout.topBrandGridHeight }]}
        >
          {/* #498 — one continuous group, column-major, instead of fixed-width pages.
              The page chunking is what produced the visible boundary gap between cards;
              this is the ordering the ticket asks for:
                row 1: [1] [3] [5] [7] [9] [11]
                row 2: [2] [4] [6] [8] [10]          */}
          {topBrandColumns.map((columnCards, columnIndex) => (
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
          <CarouselRail
            color={colors.primary}
            containerStyle={styles.topBrandDots}
            contentWidth={railContentWidth}
            scrollX={topBrandScrollX}
            visibleWidth={railVisibleWidth}
          />
        ) : null}
      </View>
    </View>
  );
}
