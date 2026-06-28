import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { useOfferSearch } from "@mobile/account/useOfferSearch";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
} from "@mobile/search/searchHistory";
import { SearchRecentChips } from "@mobile/screens/search/SearchRecentChips";
import { motion } from "@mobile/theme/motion";
import { HomeSearchIntro } from "./HomeSearchIntro";
import { HomeSearchResultRow } from "./HomeSearchResultRow";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function HomeSearchPopularPopover({
  horizontalPadding,
  onClose,
  onExited,
  onSelectRecent,
  query,
  top,
  visible,
}: {
  horizontalPadding: number;
  onClose: () => void;
  onExited: () => void;
  onSelectRecent: (term: string) => void;
  query: string;
  top: number;
  visible: boolean;
}) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const { matches: searchMatches, status: searchStatus } = useOfferSearch(query);
  const popularItems = webHomeSearchPopularPanel.items;
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
      Animated.parallel([
        Animated.timing(popoverOpacity, {
          duration: motion.duration.base,
          easing: motion.easing.out,
          toValue: 1,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(popoverTranslateY, {
          duration: motion.duration.base,
          easing: motion.easing.out,
          toValue: 0,
          useNativeDriver: motion.useNativeDriver,
        }),
      ]).start();

      return () => {
        popoverOpacity.stopAnimation();
        popoverTranslateY.stopAnimation();
      };
    }

    Animated.parallel([
      Animated.timing(popoverOpacity, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: 0,
        useNativeDriver: motion.useNativeDriver,
      }),
      Animated.timing(popoverTranslateY, {
        duration: motion.duration.fast,
        easing: motion.easing.in,
        toValue: -8,
        useNativeDriver: motion.useNativeDriver,
      }),
    ]).start(({ finished }) => {
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
            left: horizontalPadding,
            opacity: popoverOpacity,
            right: horizontalPadding,
            top,
            transform: [{ translateY: popoverTranslateY }],
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
