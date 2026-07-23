import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { resolveLiveBrandCards } from "@mobile/account/brandCatalogResource";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { usePublicCatalogPullToRefresh } from "@mobile/account/usePublicCatalogPullToRefresh";
import { rankPopularLiveBrandTerms } from "@mobile/account/searchSuggestionResource";
import { useFeaturedSearchTerms } from "@mobile/account/useFeaturedSearch";
import { useOfferSearch } from "@mobile/account/useOfferSearch";
import { trackSearchOpen, trackSearchSubmit } from "@mobile/analytics/events";
import { useAnalytics } from "@mobile/analytics/useAnalytics";
import { getResponsiveHomeLayoutMetrics, webHomePromoSections } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import {
  clearSearchHistory,
  normalizeSearchQuery,
  readSearchHistory,
  recordSearchQuery,
  removeSearchHistoryItem,
} from "@mobile/search/searchHistory";
import { dedupeSearchTerms } from "@mobile/search/searchHistoryCore";
import { spacing } from "@mobile/theme/tokens";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { SearchPopularIntro } from "./search/SearchPopularIntro";
import { SearchRecentChips } from "./search/SearchRecentChips";
import { SearchResultsSections } from "./search/SearchResultsSections";
import { SearchScreenHeader } from "./search/SearchScreenHeader";
import { SearchSuggestionsGrid } from "./search/SearchSuggestionsGrid";
import { SearchTrendingChips } from "./search/SearchTrendingChips";
import { createSearchScreenStyles } from "./search/createSearchScreenStyles";

const SUGGESTION_PREVIEW_ROWS = 2;
const TRENDING_TERM_LIMIT = 8;

export function CustomerSearchScreen() {
  const styles = useThemedStyles(createSearchScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { region } = useLocale();
  const analytics = useAnalytics();
  const router = useRouter();
  const searchOpenTrackedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const paramQuery = typeof params.q === "string" ? params.q : "";
  const [query, setQuery] = useState(paramQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const brandCatalogResource = useCustomerAccountResource({
    fixtureData: webHomePromoSections,
    resourceId: "brandCatalog",
  });
  const { onRefresh: onPullToRefresh, refreshing } = usePublicCatalogPullToRefresh({
    includeOfferSearch: true,
  });
  const liveCards = useMemo(
    () => resolveLiveBrandCards(brandCatalogResource.source, brandCatalogResource.data, [], region),
    [brandCatalogResource.source, brandCatalogResource.data, region],
  );
  // Same fallback chain as the home popover: curated featured terms -> live
  // brand catalog ranked by cashback -> fixtures last resort. Staging's
  // featured endpoint is empty, so without this the trending chips and the
  // suggestions grid rendered fixture demo brands (issue #248).
  const liveFallbackTerms = useMemo(() => rankPopularLiveBrandTerms(liveCards), [liveCards]);
  const suggestionTerms = useFeaturedSearchTerms(liveFallbackTerms);
  const columnCount = homeLayout.contentWidth >= 768 ? 3 : 2;
  const trimmedQuery = normalizeSearchQuery(query);
  const hasQuery = trimmedQuery.length > 0;
  const { matches, status } = useOfferSearch(trimmedQuery);
  const previewCount = columnCount * SUGGESTION_PREVIEW_ROWS;

  useEffect(() => {
    if (!homeLayout.isDesktop) {
      return;
    }
    router.replace("/" as never);
  }, [homeLayout.isDesktop, router]);

  useEffect(() => {
    setQuery(paramQuery);
  }, [paramQuery]);

  useEffect(() => {
    let active = true;
    void readSearchHistory().then((history) => {
      if (active) {
        setRecentSearches(history);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Mobile parity for DesktopHeaderSearch's search_open: opening the dedicated
  // mobile search surface is the "search opened" signal. Fire once, and only on
  // the mobile surface (desktop redirects to "/" above, so don't count it).
  useEffect(() => {
    if (homeLayout.isDesktop || searchOpenTrackedRef.current) {
      return;
    }
    searchOpenTrackedRef.current = true;
    trackSearchOpen(analytics, { source: "mobile_search" });
  }, [analytics, homeLayout.isDesktop]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  }, [router]);

  const commitSearch = useCallback(async (nextQuery: string) => {
    const normalized = normalizeSearchQuery(nextQuery);
    if (!normalized) {
      return;
    }
    setQuery(normalized);
    const history = await recordSearchQuery(normalized);
    setRecentSearches(history);
  }, []);

  const handleSubmit = useCallback(() => {
    // Mobile parity for DesktopHeaderSearch's search_submit. search_term is the
    // user's own query (existing property policy — unchanged here).
    trackSearchSubmit(analytics, {
      query: normalizeSearchQuery(query),
      source: "mobile_search",
    });
    void commitSearch(query);
  }, [analytics, commitSearch, query]);

  const handleSelectRecent = useCallback(
    (term: string) => {
      void commitSearch(term);
    },
    [commitSearch]
  );

  const handleClearHistory = useCallback(async () => {
    await clearSearchHistory();
    setRecentSearches([]);
  }, []);

  const handleRemoveRecent = useCallback(async (term: string) => {
    const history = await removeSearchHistoryItem(term);
    setRecentSearches(history);
  }, []);

  const trendingTerms = useMemo(
    () => dedupeSearchTerms(suggestionTerms).slice(0, TRENDING_TERM_LIMIT),
    [suggestionTerms]
  );

  const suggestionGridTerms = useMemo(() => {
    const uniqueTerms = dedupeSearchTerms(suggestionTerms);
    if (hasQuery) {
      return uniqueTerms;
    }
    if (showAllSuggestions) {
      return uniqueTerms;
    }
    return uniqueTerms.slice(0, previewCount);
  }, [hasQuery, previewCount, showAllSuggestions, suggestionTerms]);

  if (homeLayout.isDesktop) {
    return null;
  }

  const showIdleHint = !hasQuery && recentSearches.length === 0;
  const showPopularBelowQuery = hasQuery && status !== "loading";
  const showIdleSuggestions = !hasQuery;
  const showSuggestionsGrid =
    (showIdleSuggestions && suggestionGridTerms.length > 0) ||
    (showPopularBelowQuery && suggestionGridTerms.length > 0);
  const showSeeAll =
    !hasQuery && !showAllSuggestions && suggestionTerms.length > previewCount;

  return (
    <View style={styles.screen}>
      <SearchScreenHeader
        onBack={handleBack}
        onChangeQuery={setQuery}
        onSubmit={handleSubmit}
        query={query}
        topInset={insets.top}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: homeLayout.contentMaxWidth,
            paddingHorizontal: Math.max(spacing.md, homeLayout.contentHorizontalPadding),
          },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={onPullToRefresh}
            refreshing={refreshing}
            tintColor={colors.primaryDark}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <SearchRecentChips
          items={recentSearches}
          onClear={() => {
            void handleClearHistory();
          }}
          onRemove={(term) => {
            void handleRemoveRecent(term);
          }}
          onSelect={handleSelectRecent}
        />
        {showIdleHint ? (
          <Text style={styles.idleHint}>
            {tc("Start typing to search brands, stores, products, or cashback.")}
          </Text>
        ) : null}
        {hasQuery ? <SearchResultsSections matches={matches} query={query} status={status} /> : null}
        {showPopularBelowQuery ? (
          <>
            <View style={styles.sectionDivider} />
            <SearchPopularIntro variant="compact" />
          </>
        ) : null}
        {!hasQuery ? <SearchPopularIntro variant="large" /> : null}
        {!hasQuery ? (
          <SearchTrendingChips
            onSelect={(term) => {
              void commitSearch(term);
            }}
            terms={trendingTerms}
          />
        ) : null}
        {showSuggestionsGrid ? (
          <SearchSuggestionsGrid
            columnCount={columnCount}
            contentWidth={homeLayout.contentWidth}
            liveCards={liveCards}
            onSelectTerm={(term) => {
              void commitSearch(term);
            }}
            onShowAll={() => setShowAllSuggestions(true)}
            showSeeAll={showSeeAll}
            terms={suggestionGridTerms}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
