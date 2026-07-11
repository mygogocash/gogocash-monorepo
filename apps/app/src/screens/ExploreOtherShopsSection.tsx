import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Link } from "expo-router";

import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { resolveLiveBrandCards } from "@mobile/account/brandCatalogResource";
import { BrandCard } from "@mobile/components/BrandCard";
import { MotionPressable } from "@mobile/components/MotionPressable";
import {
  getResponsiveHomeLayoutMetrics,
  getScaledCompactBrandCardMetrics,
  getShopDirectoryGridMetrics,
  webHomePromoSections,
} from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { chunkDirectoryGridRows } from "@mobile/screens/discovery/directoryVirtualizedGrid";
import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { spacing, typography } from "@mobile/theme/tokens";

const exploreOtherShops = webHomePromoSections.find((section) => section.id === "travel");

/**
 * THE "Explore other Shops" section — a grid of standard compact BrandCards
 * over the travel promo fixture, upgraded to the live catalog in backend mode.
 *
 * Extracted 2026-07-11 after founder feedback caught a THIRD hand-copied
 * version (Quest #203, then Referral): each clone drifted from the shared
 * BrandCard (single-letter monograms, hearts beside the name, truncating
 * cashback captions). Screens pass their content width; everything else —
 * responsive columns, fixed card sizing, live-catalog resolution — lives here
 * so the next screen renders this component instead of re-cloning the cards.
 */
export function ExploreOtherShopsSection({ contentWidth }: { contentWidth: number }) {
  const styles = useThemedStyles(createExploreOtherShopsStyles);
  const tc = useCopy();
  const { region } = useLocale();
  const { width: viewportWidth } = useWindowDimensions();
  const fallbackCards = exploreOtherShops?.cards ?? [];
  const brandCatalogResource = useCustomerAccountResource({
    fixtureData: fallbackCards,
    resourceId: "brandCatalog",
  });
  const cards = resolveLiveBrandCards(
    brandCatalogResource.source,
    brandCatalogResource.data,
    fallbackCards,
    region,
  );

  if (!exploreOtherShops) {
    return null;
  }

  const gridMetrics = getShopDirectoryGridMetrics({ contentWidth, viewportWidth });
  const scaledCard = getScaledCompactBrandCardMetrics(gridMetrics.cardWidth);
  const cardsPerPage = getResponsiveHomeLayoutMetrics(viewportWidth).compactBrandCardsPerPage;
  const visibleCards = cards.slice(0, cardsPerPage);
  const shopRows = chunkDirectoryGridRows(visibleCards, gridMetrics.columns);

  return (
    <View style={styles.exploreSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tc("Explore other Shops")}</Text>
        <Link asChild href={exploreOtherShops.link as never}>
          <MotionPressable pressScale={0.98}>
            <Text style={styles.viewAll}>{`${tc("View all")} →`}</Text>
          </MotionPressable>
        </Link>
      </View>
      <View style={[styles.shopGrid, { gap: gridMetrics.gap }]}>
        {shopRows.map((row, rowIndex) => (
          <View
            key={`explore-shop-row-${rowIndex}`}
            style={[styles.shopGridRow, { gap: gridMetrics.gap }]}
          >
            {row.map((card) => (
              <BrandCard
                cardHeight={scaledCard.cardHeight}
                cardWidth={gridMetrics.cardWidth}
                key={card.brand}
                logoVisualHeight={scaledCard.logoVisualHeight}
                {...card}
                size="S"
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function createExploreOtherShopsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    exploreSection: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.md,
      paddingTop: spacing.lg,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    sectionTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: typography.title,
      fontWeight: "600",
    },
    viewAll: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: typography.body,
    },
    shopGrid: {
      flexDirection: "column",
    },
    shopGridRow: {
      flexDirection: "row",
    },
  });
}
