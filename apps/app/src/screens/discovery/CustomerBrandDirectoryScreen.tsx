import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search as SearchIcon } from "@mobile/theme/icons";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { useDirectoryOfferSearch } from "@mobile/account/useDirectoryOfferSearch";
import {
  filterDirectoryStores,
  getFixtureBrandDirectoryResults,
  resolveCategoryList,
  resolveLiveDirectoryStores,
} from "@mobile/account/directoryCatalogResource";
import type { OfferListResponse } from "@mobile/api/catalogTypes";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { haptics } from "@mobile/lib/haptics";
import { motion } from "@mobile/theme/motion";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { webSearchInputFocusReset } from "./directoryAssets";

import {
  getBrandDirectoryGridMetrics,
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  webBrandDirectory,
  webHomeSearchPlaceholder,
  type WebBrandDirectorySort,
} from "@mobile/design/webDesignParity";

import { BrandDirectoryCategoryAside } from "./BrandDirectoryCategoryAside";
import { BrandDirectoryStoreCard } from "./BrandDirectoryStoreCard";
import {
  DirectoryVirtualizedGrid,
  getDirectoryStoreCardHeight,
} from "./directoryVirtualizedGrid";
import { type BrandDirectoryStore } from "./discoveryTypes";
import { ShopDirectoryPagination } from "./ShopDirectoryPagination";
import { ShopDirectoryPromo } from "./ShopDirectoryPromo";

export function CustomerBrandDirectoryScreen() {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { region } = useLocale();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<WebBrandDirectorySort>("highest_cashback");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = webBrandDirectory.pagination.pageSize;
  const sidebarWidth = homeLayout.isDesktop ? 280 : homeLayout.contentWidth;
  const layoutGap = homeLayout.isDesktop ? 32 : 20;
  const gridContentWidth = homeLayout.isDesktop
    ? Math.max(0, homeLayout.contentWidth - sidebarWidth - layoutGap)
    : homeLayout.contentWidth;
  const gridMetrics = getBrandDirectoryGridMetrics({
    contentWidth: gridContentWidth,
    viewportWidth: width,
  });
  const catalogResource = useCustomerAccountResource<OfferListResponse, OfferListResponse>({
    fixtureData: { data: [], limit: 80, page: 1, total: 0, totalPages: 0 },
    resourceId: "brandCatalog",
  });
  const categoryResource = useCustomerAccountResource({
    fixtureData: webBrandDirectory.categories,
    resourceId: "categoryList",
  });
  const directoryCategories = resolveCategoryList(
    categoryResource.source,
    categoryResource.data,
    webBrandDirectory.categories
  );
  const liveStores = resolveLiveDirectoryStores(
    catalogResource.source,
    catalogResource.data,
    webBrandDirectory.stores,
    region,
  );
  const directorySearch = useDirectoryOfferSearch(
    searchQuery,
    catalogResource.source === "backend",
  );
  const brandResults = useMemo(() => {
    if (catalogResource.source === "backend" && searchQuery.trim()) {
      if (directorySearch.status !== "ready" || !directorySearch.stores) {
        return [];
      }

      return filterDirectoryStores({
        category: selectedCategory,
        query: "",
        sortBy,
        stores: directorySearch.stores,
      });
    }

    if (catalogResource.source === "backend") {
      return filterDirectoryStores({
        category: selectedCategory,
        query: searchQuery,
        sortBy,
        stores: liveStores,
      });
    }

    return getFixtureBrandDirectoryResults({
      category: selectedCategory,
      query: searchQuery,
      regionCode: region,
      sortBy,
    });
  }, [
    catalogResource.source,
    directorySearch.status,
    directorySearch.stores,
    liveStores,
    region,
    searchQuery,
    selectedCategory,
    sortBy,
  ]);
  const totalPages = Math.max(1, Math.ceil(brandResults.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const visibleBrands = brandResults.slice((activePage - 1) * pageSize, activePage * pageSize);
  const resultsLabel = `${brandResults.length} ${tc(webBrandDirectory.resultsUnit)}`;

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const updateCategory = (value: string) => {
    haptics.impact();
    setSelectedCategory(value);
    setCurrentPage(1);
  };
  // Pull-to-refresh re-seeds the directory: this is synchronous design-parity data with no
  // network refetch, so the meaningful refresh resets pagination to the first page. The flag
  // toggles off on the next frame (rAF) so the spinner is visible without blocking a fetch.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    catalogResource.retry();
    categoryResource.retry();
    requestAnimationFrame(() => setRefreshing(false));
  }, [catalogResource, categoryResource]);
  const brandDirectoryRowHeight = getDirectoryStoreCardHeight(gridMetrics.cardWidth);
  const renderBrandDirectoryCard = useCallback(
    (store: BrandDirectoryStore) => (
      <BrandDirectoryStoreCard cardWidth={gridMetrics.cardWidth} store={store} />
    ),
    [gridMetrics.cardWidth]
  );

  // Desktop search lives in the header (CustomerDesktopHeader); only mobile needs the sticky search.
  const stickySearchHeader = homeLayout.isDesktop ? null : (
    <View
      style={[
        styles.stickySearch,
        {
          paddingHorizontal: homeLayout.contentHorizontalPadding,
          paddingTop: Math.max(8, insets.top + 8),
        },
      ]}
    >
      <View style={styles.searchPill}>
        <SearchIcon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
        <Text numberOfLines={1} style={styles.searchText}>
          {tc(webHomeSearchPlaceholder)}
        </Text>
      </View>
    </View>
  );

  const brandContent = (
    <>
      <ShopDirectoryPromo
        contentWidth={homeLayout.contentWidth}
        isDesktop={homeLayout.isDesktop}
        promo={webBrandDirectory.promo}
      />

      <View style={styles.shopDirectoryHeader}>
        <View style={styles.shopDirectoryTitleRow}>
          <Text
            style={[
              styles.shopDirectoryTitle,
              homeLayout.isDesktop ? styles.shopDirectoryTitleDesktop : null,
            ]}
          >
            {tc(webBrandDirectory.title)}
          </Text>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={styles.shopDirectoryTitleIcon}
          >
            {webBrandDirectory.titleIcon}
          </Text>
        </View>
        <Text style={styles.shopDirectorySubtitle}>{tc(webBrandDirectory.subtitle)}</Text>
      </View>

      <View
        style={[
          styles.shopDirectoryLayout,
          homeLayout.isDesktop ? styles.shopDirectoryLayoutDesktop : null,
          { gap: layoutGap },
        ]}
      >
        <BrandDirectoryCategoryAside
          activeCategory={selectedCategory}
          categories={directoryCategories}
          isDesktop={homeLayout.isDesktop}
          onSelectCategory={updateCategory}
          width={sidebarWidth}
        />

        <View style={[styles.shopDirectoryMain, { width: gridContentWidth }]}>
          <View style={styles.shopDirectoryFilterPanel}>
            <View style={styles.shopDirectorySearchBox}>
              <SearchIcon color={colors.muted} size={18} strokeWidth={typography.iconStrokeWidth} />
              <TextInput
                accessibilityLabel={tc(webBrandDirectory.searchLabel)}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="search"
                onChangeText={updateSearchQuery}
                placeholder={tc(webBrandDirectory.searchPlaceholder)}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.shopDirectorySearchInput, webSearchInputFocusReset]}
                value={searchQuery}
              />
            </View>

            <View style={styles.shopDirectorySortBlock}>
              <Text
                numberOfLines={1}
                style={styles.shopDirectorySortLabel}
              >
                {tc(webBrandDirectory.sortLabel)}
              </Text>
              <View style={styles.shopDirectorySortRow}>
                {webBrandDirectory.sortPills.map((pill) => (
                  <MotionPressable
                    accessibilityRole="button"
                    key={pill.value}
                    onPress={() => setSortBy(pill.value as WebBrandDirectorySort)}
                    pressScale={motion.scale.subtlePress}
                    style={[
                      styles.shopDirectoryPill,
                      sortBy === pill.value ? styles.shopDirectoryPillActive : null,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.directorySortPillText,
                        sortBy === pill.value ? styles.directorySortPillTextActive : null,
                      ]}
                    >
                      {tc(pill.label)}
                    </Text>
                  </MotionPressable>
                ))}
                <Text style={styles.shopDirectoryResultsCount}>{resultsLabel}</Text>
              </View>
            </View>
          </View>

          {visibleBrands.length > 0 ? (
            <DirectoryVirtualizedGrid
              cardWidth={gridMetrics.cardWidth}
              columns={gridMetrics.columns}
              estimatedRowHeight={brandDirectoryRowHeight}
              gap={gridMetrics.gap}
              gridStyle={styles.brandDirectoryGrid}
              items={visibleBrands}
              renderItemContent={renderBrandDirectoryCard}
            />
          ) : (
            <View style={styles.shopDirectoryEmptyState}>
              <Text style={styles.shopDirectoryEmptyTitle}>{tc(webBrandDirectory.emptyTitle)}</Text>
              <Text style={styles.shopDirectoryEmptyBody}>{tc(webBrandDirectory.emptyBody)}</Text>
            </View>
          )}

          <ShopDirectoryPagination
            activePage={activePage}
            onChangePage={setCurrentPage}
            totalPages={totalPages}
          />
        </View>
      </View>
    </>
  );

  if (homeLayout.isDesktop) {
    return (
      <View style={styles.viewport}>
        <View style={styles.desktopShellFrame}>
          <ScrollView
            contentContainerStyle={[
              styles.shopDirectoryPage,
              styles.pageDesktopFullBleed,
              { paddingBottom: homeLayout.pageBottomPadding },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.desktopContentCap,
                {
                  maxWidth: homeLayout.contentMaxWidth,
                  paddingHorizontal: homeLayout.contentHorizontalPadding,
                },
              ]}
            >
              {stickySearchHeader}
              {brandContent}
            </View>
            <View
              style={[
                styles.desktopFooterCap,
                styles.desktopFooter,
                { maxWidth: homeLayout.contentMaxWidth },
              ]}
            >
              <CustomerDesktopFooter
                horizontalPadding={desktopFooterHorizontalOffset}
                viewportWidth={width}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.viewport}>
      <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
        {stickySearchHeader}

        <ScrollView
          contentContainerStyle={[
            styles.shopDirectoryPage,
            {
              paddingBottom: homeLayout.pageBottomPadding,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
            },
          ]}
          refreshControl={
            <RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.primaryDark} />
          }
          showsVerticalScrollIndicator={false}
        >
          {brandContent}
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>
        {homeLayout.isDesktop ? null : <CustomerMobileBottomNav bottomInset={insets.bottom} />}
      </View>
    </View>
  );
}
