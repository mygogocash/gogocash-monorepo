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
  getPromoSectionCards,
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
  const sectionPageSize = getPromoSectionPageSize(homeLayout);
  const promoPages = chunkCompactBrandCards(sectionCards, sectionPageSize);
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
        <View
          style={{ height: homeLayout.compactBrandGridHeight, overflow: "hidden", width: "100%" }}
        >
        <Animated.ScrollView
          contentContainerStyle={styles.promoPagerContent}
          decelerationRate="fast"
          disableIntervalMomentum
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
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={homeLayout.compactBrandGroupWidth}
          style={[styles.promoScroll, { height: homeLayout.compactBrandGridHeight }]}
        >
          {promoPages.map((pageCards, pageIndex) => (
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
          ))}
        </Animated.ScrollView>
        </View>
        {sectionDotCount > 1 ? (
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
