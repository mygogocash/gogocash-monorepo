import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Animated, Text, View } from "react-native";
import { BrandCard } from "@mobile/components/BrandCard";
import { CarouselDots } from "@mobile/components/CarouselDots";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import {
  chunkCompactBrandCards,
  getPagedScrollIndex,
  getPromoGridCardWidth,
  getPromoSectionCards,
  getPromoSectionLayoutMode,
  getPromoSectionGridHeight,
  getPromoSectionPageSize,
  getPromoSectionRowsPerPage,
} from "./homeHelpers";
import { useHomeScreenColors, useHomeScreenStyles } from "./homeScreenHooks";
import { type CompactBrandLogoOfferCardProps, type HomeLayoutMetrics } from "./homeTypes";

export function PromoSection({
  cards,
  dotCount,
  homeLayout,
  icon,
  id,
  link,
  title,
}: {
  cards: readonly CompactBrandLogoOfferCardProps[];
  dotCount?: number;
  homeLayout: HomeLayoutMetrics;
  icon?: string;
  id: string;
  link: string;
  title: string;
}) {
  const styles = useHomeScreenStyles();
  const colors = useHomeScreenColors();
  const tc = useCopy();
  const sectionCards = getPromoSectionCards(id, cards);
  // Issue #253: Travel / Beauty / Trending use the same size="L" Top Brands card
  // (full-bleed artwork + favorite heart). Layout metrics follow topBrand*.
  const layoutMode = getPromoSectionLayoutMode(homeLayout.isDesktop, sectionCards.length);
  const isPager = layoutMode === "pager";
  const sectionPageSize = getPromoSectionPageSize(id, homeLayout);
  // #499 — travel/makeup are one-row rails, so they must not reserve two rows of height.
  const sectionRows = getPromoSectionRowsPerPage(id, homeLayout);
  const sectionGridHeight = getPromoSectionGridHeight(id, homeLayout);
  const promoPages = chunkCompactBrandCards(sectionCards, sectionPageSize);
  const promoColumns = chunkCompactBrandCards(sectionCards, sectionRows);
  const gridCardWidth = getPromoGridCardWidth(
    homeLayout.brandSectionFrameWidth,
    homeLayout.topBrandGap
  );
  const sectionDotCount = homeLayout.isDesktop
    ? promoPages.length
    : Math.max(promoPages.length, dotCount ?? 0);
  const [activePromoPage, setActivePromoPage] = useState(0);
  const promoMaxPageIndex = Math.max(0, promoPages.length - 1);
  const activePromoDot = Math.min(activePromoPage, sectionDotCount - 1);
  const promoScrollX = useMemo(() => new Animated.Value(0), []);
  const pageWidth = homeLayout.topBrandGroupWidth;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sectionTitleSmall}>
            {tc(title)}
          </Text>
          {icon ? <Text style={styles.sectionEmoji}>{icon}</Text> : null}
        </View>
        <Link asChild href={link as never}>
          <MotionPressable pressScale={motion.scale.subtlePress}>
            <Text style={styles.sectionAction}>{`${tc("View all")}  →`}</Text>
          </MotionPressable>
        </Link>
      </View>
      <View style={styles.promoSectionBody}>
        {layoutMode === "grid" ? (
          <View style={[styles.brandGrid, { gap: homeLayout.topBrandGap, width: "100%" }]}>
            {sectionCards.map((card) => (
              <BrandCard
                cardHeight={homeLayout.topBrandCardHeight}
                cardWidth={gridCardWidth}
                key={`${title}-${card.brand}`}
                brand={card.brand}
                cashback={card.cashback}
                href={card.href}
                logoUri={card.logoUri}
                size="L"
                tint={card.tint}
              />
            ))}
          </View>
        ) : (
          <View
            style={{ height: sectionGridHeight, overflow: "hidden", width: "100%" }}
          >
            <Animated.ScrollView
              contentContainerStyle={[
                styles.promoPagerContent,
                isPager ? null : { gap: homeLayout.topBrandGap },
              ]}
              decelerationRate={isPager ? "fast" : "normal"}
              disableIntervalMomentum={isPager}
              horizontal
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: promoScrollX } } }],
                { useNativeDriver: motion.useNativeDriver }
              )}
              onMomentumScrollEnd={(event) =>
                setActivePromoPage(getPagedScrollIndex(event, pageWidth, promoMaxPageIndex))
              }
              pagingEnabled={isPager}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={isPager ? pageWidth : undefined}
              style={[styles.promoScroll, { height: sectionGridHeight }]}
            >
              {isPager
                ? promoPages.map((pageCards, pageIndex) => (
                    <Animated.View
                      key={`${title}-promo-page-${pageIndex}`}
                      style={[
                        styles.promoPage,
                        styles.brandGrid,
                        {
                          gap: homeLayout.topBrandGap,
                          height: sectionGridHeight,
                          width: pageWidth,
                        },
                      ]}
                    >
                      {pageCards.map((card) => (
                        <BrandCard
                          cardHeight={homeLayout.topBrandCardHeight}
                          cardWidth={homeLayout.topBrandCardWidth}
                          key={`${title}-${card.brand}`}
                          brand={card.brand}
                          cashback={card.cashback}
                          href={card.href}
                          logoUri={card.logoUri}
                          size="L"
                          tint={card.tint}
                        />
                      ))}
                    </Animated.View>
                  ))
                : promoColumns.map((columnCards, columnIndex) => (
                    <View
                      key={`${title}-promo-column-${columnIndex}`}
                      style={{ gap: homeLayout.topBrandGap }}
                    >
                      {columnCards.map((card) => (
                        <BrandCard
                          cardHeight={homeLayout.topBrandCardHeight}
                          cardWidth={homeLayout.topBrandCardWidth}
                          key={`${title}-${card.brand}`}
                          brand={card.brand}
                          cashback={card.cashback}
                          href={card.href}
                          logoUri={card.logoUri}
                          size="L"
                          tint={card.tint}
                        />
                      ))}
                    </View>
                  ))}
            </Animated.ScrollView>
          </View>
        )}
        {isPager && sectionDotCount > 1 ? (
          <CarouselDots
            activeIndex={activePromoDot}
            color={colors.primary}
            containerStyle={styles.promoSectionDots}
            count={sectionDotCount}
            pageWidth={pageWidth}
            scrollX={promoScrollX}
            size={12}
          />
        ) : null}
      </View>
    </View>
  );
}
