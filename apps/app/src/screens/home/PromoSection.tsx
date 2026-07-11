import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Animated, Text, View } from "react-native";
import { BrandCard } from "@mobile/components/BrandCard";
import { CarouselDots } from "@mobile/components/CarouselDots";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { viewAllLabel } from "./homeAssets";
import {
  chunkCompactBrandCards,
  getPagedScrollIndex,
  getPromoGridCardWidth,
  getPromoSectionCards,
  getPromoSectionLayoutMode,
  getPromoSectionPageSize,
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
  // Founder feedback 2026-07-11: mobile rails snapped by a whole 8-column
  // group and a 4-card section hid half its cards behind a swipe. Mobile now
  // has two modes — "grid" (few cards: all visible, no swiping) and "scroll"
  // (free momentum, no snap). Desktop keeps the web-parity "pager".
  const layoutMode = getPromoSectionLayoutMode(homeLayout.isDesktop, sectionCards.length);
  const isPager = layoutMode === "pager";
  const sectionPageSize = getPromoSectionPageSize(homeLayout);
  const promoPages = chunkCompactBrandCards(sectionCards, sectionPageSize);
  // Scroll mode flows column-major (rows per column) so the rail is one
  // continuous grid with no page seams or trailing dead space.
  const promoColumns = chunkCompactBrandCards(sectionCards, homeLayout.compactBrandRowsPerPage);
  const gridCardWidth = getPromoGridCardWidth(
    homeLayout.brandSectionFrameWidth,
    homeLayout.compactBrandGap
  );
  const sectionDotCount = homeLayout.isDesktop
    ? promoPages.length
    : Math.max(promoPages.length, dotCount ?? 0);
  const [activePromoPage, setActivePromoPage] = useState(0);
  const promoMaxPageIndex = Math.max(0, promoPages.length - 1);
  const activePromoDot = Math.min(activePromoPage, sectionDotCount - 1);
  const promoScrollX = useMemo(() => new Animated.Value(0), []);
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
            <Text style={styles.sectionAction}>{tc(viewAllLabel)}</Text>
          </MotionPressable>
        </Link>
      </View>
      <View style={styles.promoSectionBody}>
        {layoutMode === "grid" ? (
          <View
            style={[styles.compactBrandGrid, { gap: homeLayout.compactBrandGap, width: "100%" }]}
          >
            {sectionCards.map((card) => (
              <BrandCard
                cardHeight={homeLayout.compactBrandCardHeight}
                cardWidth={gridCardWidth}
                logoVisualHeight={homeLayout.compactBrandLogoVisualHeight}
                key={`${title}-${card.brand}`}
                {...card}
                size="S"
              />
            ))}
          </View>
        ) : (
        <View
          style={{ height: homeLayout.compactBrandGridHeight, overflow: "hidden", width: "100%" }}
        >
        <Animated.ScrollView
          contentContainerStyle={[
            styles.promoPagerContent,
            isPager ? null : { gap: homeLayout.compactBrandGap },
          ]}
          decelerationRate={isPager ? "fast" : "normal"}
          disableIntervalMomentum={isPager}
          horizontal
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: promoScrollX } } }],
            { useNativeDriver: motion.useNativeDriver }
          )}
          onMomentumScrollEnd={(event) =>
            setActivePromoPage(
              getPagedScrollIndex(event, homeLayout.compactBrandGroupWidth, promoMaxPageIndex)
            )
          }
          pagingEnabled={isPager}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={isPager ? homeLayout.compactBrandGroupWidth : undefined}
          style={[styles.promoScroll, { height: homeLayout.compactBrandGridHeight }]}
        >
          {isPager
            ? promoPages.map((pageCards, pageIndex) => (
                <Animated.View
                  key={`${title}-promo-page-${pageIndex}`}
                  style={[
                    styles.promoPage,
                    styles.compactBrandGrid,
                    {
                      gap: homeLayout.compactBrandGap,
                      height: homeLayout.compactBrandGridHeight,
                      width: homeLayout.compactBrandGroupWidth,
                    },
                  ]}
                >
                  {pageCards.map((card) => (
                    <BrandCard
                      cardHeight={homeLayout.compactBrandCardHeight}
                      cardWidth={homeLayout.compactBrandCardWidth}
                      logoVisualHeight={homeLayout.compactBrandLogoVisualHeight}
                      key={`${title}-${card.brand}`}
                      {...card}
                      size="S"
                    />
                  ))}
                </Animated.View>
              ))
            : promoColumns.map((columnCards, columnIndex) => (
                <View
                  key={`${title}-promo-column-${columnIndex}`}
                  style={{ gap: homeLayout.compactBrandGap }}
                >
                  {columnCards.map((card) => (
                    <BrandCard
                      cardHeight={homeLayout.compactBrandCardHeight}
                      cardWidth={homeLayout.compactBrandCardWidth}
                      logoVisualHeight={homeLayout.compactBrandLogoVisualHeight}
                      key={`${title}-${card.brand}`}
                      {...card}
                      size="S"
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
            pageWidth={homeLayout.compactBrandGroupWidth}
            scrollX={promoScrollX}
            size={12}
          />
        ) : null}
      </View>
    </View>
  );
}
