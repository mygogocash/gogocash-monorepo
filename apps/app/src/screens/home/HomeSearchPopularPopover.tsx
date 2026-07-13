import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import type { LiveCompactBrandCard } from "@mobile/account/brandCatalogResource";
import {
  rankPopularLiveBrandTerms,
  resolveSearchSuggestionItem,
} from "@mobile/account/searchSuggestionResource";
import { useFeaturedSearchTerms } from "@mobile/account/useFeaturedSearch";
import { useOfferSearch } from "@mobile/account/useOfferSearch";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
} from "@mobile/search/searchHistory";
import { SearchRecentChips } from "@mobile/screens/search/SearchRecentChips";
import { pickThemed } from "@mobile/theme/colorPalettes";
import { runFadeSlideTiming } from "@mobile/theme/animatedMotion";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { HomeSearchIntro } from "./HomeSearchIntro";
import { HomeSearchResultRow } from "./HomeSearchResultRow";
import { useHomeScreenStyles } from "./homeScreenHooks";
import { resolveSearchPopoverFrame, type SearchAnchorFrame } from "./searchPopoverFrame";

export function HomeSearchPopularPopover({
  // REQUIRED on purpose: without the measured anchor the popover falls back to
  // a centered panel instead of hugging the search input, so every caller must
  // wire the frame reported by DesktopHeaderSearch.
  anchor,
  horizontalPadding,
  liveCards = [],
  onClose,
  onExited,
  onSelectRecent,
  query,
  top,
  viewportWidth,
  visible,
}: {
  anchor: SearchAnchorFrame | null;
  horizontalPadding: number;
  liveCards?: readonly LiveCompactBrandCard[];
  onClose: () => void;
  onExited: () => void;
  onSelectRecent: (term: string) => void;
  query: string;
  top: number;
  viewportWidth: number;
  visible: boolean;
}) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const { colors } = useTheme();
  const { matches: searchMatches, status: searchStatus } = useOfferSearch(query);
  const fallbackTint = pickThemed(colors, colors.fieldMuted, colors.field);
  const liveFallbackTerms = useMemo(() => rankPopularLiveBrandTerms(liveCards), [liveCards]);
  const popularTerms = useFeaturedSearchTerms(liveFallbackTerms);
  const popularItems = useMemo(
    () => popularTerms.map((term) => resolveSearchSuggestionItem(term, liveCards, fallbackTint)),
    [fallbackTint, liveCards, popularTerms],
  );
  const popoverFrame = resolveSearchPopoverFrame({
    anchor,
    fallbackHorizontalPadding: horizontalPadding,
    fallbackTop: top,
    viewportWidth,
  });
  const hasSearchQuery = query.trim().length > 0;
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const popoverOpacity = useMemo(() => new Animated.Value(0), []);
  const popoverTranslateY = useMemo(() => new Animated.Value(-8), []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let active = true;
    void readSearchHistory().then((history) => {
      if (active) {
        setRecentSearches(history);
      }
    });

    return () => {
      active = false;
    };
  }, [visible]);

  const handleClearHistory = useCallback(async () => {
    await clearSearchHistory();
    setRecentSearches([]);
  }, []);

  const handleRemoveRecent = useCallback(async (term: string) => {
    const history = await removeSearchHistoryItem(term);
    setRecentSearches(history);
  }, []);

  useEffect(() => {
    popoverOpacity.stopAnimation();
    popoverTranslateY.stopAnimation();

    if (visible) {
      popoverTranslateY.setValue(-8);
      runFadeSlideTiming({
        durationIn: motion.duration.base,
        opacity: popoverOpacity,
        slideOffset: -8,
        translateY: popoverTranslateY,
        visible: true,
      }).start();

      return () => {
        popoverOpacity.stopAnimation();
        popoverTranslateY.stopAnimation();
      };
    }

    runFadeSlideTiming({
      opacity: popoverOpacity,
      slideOffset: -8,
      translateY: popoverTranslateY,
      visible: false,
    }).start(({ finished }) => {
      if (finished) {
        onExited();
      }
    });

    return () => {
      popoverOpacity.stopAnimation();
      popoverTranslateY.stopAnimation();
    };
  }, [onExited, popoverOpacity, popoverTranslateY, visible]);

  return (
    <View style={[styles.searchPopoverLayer, { pointerEvents: visible ? "box-none" : "none" }]}>
      <Pressable
        accessibilityLabel={tc("Close search suggestions")}
        accessibilityRole="button"
        onPress={onClose}
        style={styles.searchPopoverBackdrop}
      />
      <Animated.View
        style={[
          styles.searchPopoverPosition,
          {
            left: popoverFrame.left,
            opacity: popoverOpacity,
            top: popoverFrame.top,
            transform: [{ translateY: popoverTranslateY }],
            width: popoverFrame.width,
          },
        ]}
      >
        <View style={styles.searchPopover}>
          <ScrollView
            contentContainerStyle={styles.searchPopoverContent}
            showsVerticalScrollIndicator={false}
            style={styles.searchPopoverScroll}
          >
            {hasSearchQuery ? (
              <View style={styles.searchTypedContent}>
                {searchStatus === "loading" ? (
                  <Text style={styles.searchResultsSubtitle}>
                    {tc("Searching brands and shops…")}
                  </Text>
                ) : null}
                {searchStatus === "error" ? (
                  <Text style={styles.searchNoMatchCard}>
                    {tc("Search is temporarily unavailable. Try again in a moment.")}
                  </Text>
                ) : null}
                {searchStatus === "ready" && searchMatches.length > 0 ? (
                  <>
                    <View style={styles.searchResultsHeading}>
                      <Text style={styles.searchResultsTitle}>
                        {tc(webHomeSearchPopularPanel.resultsTitle)}
                      </Text>
                      <Text style={styles.searchResultsSubtitle}>
                        {tc(webHomeSearchPopularPanel.resultsSubtitle)}
                      </Text>
                    </View>
                    <View style={styles.searchResultListCompact}>
                      {searchMatches.map((item, index) => (
                        <HomeSearchResultRow
                          item={item}
                          key={item.id ?? `${item.brand}-${index}`}
                          variant="compact"
                        />
                      ))}
                    </View>
                    <View style={styles.searchDivider} />
                  </>
                ) : null}
                {searchStatus === "ready" && searchMatches.length === 0 ? (
                  <Text style={styles.searchNoMatchCard}>
                    {tc(webHomeSearchPopularPanel.noMatches)}
                  </Text>
                ) : null}
                <HomeSearchIntro variant="compact" />
                <View style={styles.searchResultListCompact}>
                  {popularItems.map((item) => (
                    <HomeSearchResultRow item={item} key={`${item.brand}-${item.cashback}`} variant="compact" />
                  ))}
                </View>
              </View>
            ) : (
              <>
                <SearchRecentChips
                  items={recentSearches}
                  onClear={() => {
                    void handleClearHistory();
                  }}
                  onRemove={(term) => {
                    void handleRemoveRecent(term);
                  }}
                  onSelect={onSelectRecent}
                />
                <HomeSearchIntro variant="large" />
                <View style={styles.searchResultList}>
                  {popularItems.map((item) => (
                    <HomeSearchResultRow item={item} key={`${item.brand}-${item.cashback}`} variant="large" />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}
