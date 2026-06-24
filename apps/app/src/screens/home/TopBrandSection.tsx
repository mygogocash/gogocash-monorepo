import { useMemo, useState } from "react";
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
import { useCopy } from "@mobile/i18n/useCopy";
import { getCarouselDotCount, webTopBrandCards } from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { viewAllLabel } from "./homeAssets";
import {
  chunkTopBrandCards,
  getPagedScrollIndex,
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
  const topBrandResource = useCustomerAccountResource<readonly TopBrandCardProps[], TopBrandsPayload>({
    fixtureData: webTopBrandCards,
    resourceId: "topBrand",
  });
  const topBrands = resolveTopBrands(
    topBrandResource.source,
    topBrandResource.data,
    webTopBrandCards,
    brandCatalogData,
  );
  const topBrandPages = chunkTopBrandCards(topBrands, homeLayout.topBrandCardsPerPage);
  const [activeTopBrandPage, setActiveTopBrandPage] = useState(0);
  const topBrandDotCount = getCarouselDotCount(
    topBrands.length,
    homeLayout.topBrandCardsPerPage
  );
  const topBrandMaxPageIndex = Math.max(0, topBrandPages.length - 1);
  const activeTopBrandDot = Math.min(activeTopBrandPage, topBrandDotCount - 1);
  const topBrandScrollX = useMemo(() => new Animated.Value(0), []);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitle}>
            {tc("Top Brands")}
          </Text>
          <Text style={styles.topBrandEmoji}>🔥</Text>
        </View>
        <Link asChild href="/brand">
          <MotionPressable pressScale={motion.scale.subtlePress}>
            <Text style={styles.sectionAction}>{tc(viewAllLabel)}</Text>
          </MotionPressable>
        </Link>
      </View>

      <View style={styles.topBrandPager}>
        <View style={{ height: homeLayout.topBrandGridHeight, overflow: "hidden", width: "100%" }}>
        <Animated.ScrollView
          contentContainerStyle={styles.topBrandPagerContent}
          decelerationRate="fast"
          disableIntervalMomentum
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
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={homeLayout.topBrandGroupWidth}
          style={[styles.topBrandScroll, { height: homeLayout.topBrandGridHeight }]}
        >
          {topBrandPages.map((pageCards, pageIndex) => (
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
          ))}
        </Animated.ScrollView>
        </View>
        <CarouselDots
          activeIndex={activeTopBrandDot}
          color={colors.primary}
          containerStyle={styles.topBrandDots}
          count={topBrandDotCount}
          pageWidth={homeLayout.topBrandGroupWidth}
          scrollX={topBrandScrollX}
          size={12}
        />
      </View>
    </View>
  );
}
