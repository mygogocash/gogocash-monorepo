import { Text, View } from "react-native";

import type { LiveCompactBrandCard } from "@mobile/account/brandCatalogResource";
import { resolveSearchSuggestionItem } from "@mobile/account/searchSuggestionResource";
import { BrandCard } from "@mobile/components/BrandCard";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  getScaledCompactBrandCardMetrics,
  mobileShellLayout,
} from "@mobile/design/webDesignParity";
import { pickThemed } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { spacing } from "@mobile/theme/tokens";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";

import { createSearchScreenStyles } from "./createSearchScreenStyles";

const SEARCH_SUGGESTION_LOGO_MAX_HEIGHT = 132;
const COMPACT_CARD_VERTICAL_PADDING = 16;

type SearchSuggestionsGridProps = {
  readonly columnCount: number;
  readonly contentWidth: number;
  readonly liveCards?: readonly LiveCompactBrandCard[];
  readonly onSelectTerm: (term: string) => void;
  readonly onShowAll?: () => void;
  readonly showSeeAll?: boolean;
  readonly terms: readonly string[];
  readonly title?: string;
};

export function SearchSuggestionsGrid({
  columnCount,
  contentWidth,
  liveCards = [],
  onSelectTerm,
  onShowAll,
  showSeeAll = false,
  terms,
  title,
}: SearchSuggestionsGridProps) {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const gap = spacing.sm;
  const cardWidth = (contentWidth - gap * (columnCount - 1)) / columnCount;
  const scaledCard = getScaledCompactBrandCardMetrics(cardWidth);
  // Search columns can grow wider than the fixed compact cards used elsewhere.
  // Cap only this screen's logo stage, then recompute the card height so the
  // shared title/cashback metadata keeps its full reserved space.
  const logoVisualHeight = Math.min(
    scaledCard.logoVisualHeight,
    SEARCH_SUGGESTION_LOGO_MAX_HEIGHT,
  );
  const cardHeight =
    COMPACT_CARD_VERTICAL_PADDING + logoVisualHeight + mobileShellLayout.compactBrandMetaHeight;
  const fallbackTint = pickThemed(colors, colors.fieldMuted, colors.field);
  const sectionTitle = title ?? tc("Popular brands");

  if (terms.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <Text style={styles.sectionSubtitle}>{tc("Explore standout cashback offers.")}</Text>
      <View style={[styles.suggestionsGrid, { gap }]}>
        {terms.map((term, index) => {
          const item = resolveSearchSuggestionItem(term, liveCards, fallbackTint);
          const logoFallbackText =
            item.logoText.trim().length > 0 ? item.logoText : item.brand.slice(0, 2).toUpperCase();

          return (
            <BrandCard
              accessibilityLabel={item.brand}
              brand={item.brand}
              cardHeight={cardHeight}
              cardWidth={cardWidth}
              cashback={item.cashback}
              cashbackCaption="Cashback up to"
              key={`${term}-${index}`}
              logoFallbackText={item.logoUri ? undefined : logoFallbackText}
              logoUri={item.logoUri}
              logoVisualHeight={logoVisualHeight}
              onPress={() => onSelectTerm(item.brand)}
              size="S"
              tint={item.logoBackground}
            />
          );
        })}
      </View>
      {showSeeAll && onShowAll ? (
        <MotionPressable
          accessibilityLabel={tc("See all suggestions")}
          accessibilityRole="button"
          onPress={onShowAll}
          pressScale={motion.scale.subtlePress}
          style={styles.seeAllButton}
        >
          <Text style={styles.seeAllLabel}>{tc("See all")}</Text>
        </MotionPressable>
      ) : null}
    </View>
  );
}
