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
  filterShopDirectoryStores,
  getFixtureShopDirectoryResults,
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
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  getShopDirectoryGridMetrics,
  webHomeSearchPlaceholder,
  webShopDirectory,
  type WebShopDirectorySort,
  type WebShopType,
} from "@mobile/design/webDesignParity";

import {
  DirectoryVirtualizedGrid,
  getDirectoryStoreCardHeight,
} from "./directoryVirtualizedGrid";
import { type ShopDirectoryStore } from "./discoveryTypes";
import { ShopDirectoryCategoryAside } from "./ShopDirectoryCategoryAside";
import { ShopDirectoryPagination } from "./ShopDirectoryPagination";
import { ShopDirectoryPromo } from "./ShopDirectoryPromo";
import { ShopDirectoryStoreCard } from "./ShopDirectoryStoreCard";

export function CustomerShopDirectoryScreen() {
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
  const [selectedShopType, setSelectedShopType] = useState<WebShopType>("all");
  const [sortBy, setSortBy] = useState<WebShopDirectorySort>("highest_cashback");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = webShopDirectory.pagination.pageSize;
  const sidebarWidth = homeLayout.isDesktop ? 280 : homeLayout.contentWidth;
  const layoutGap = homeLayout.isDesktop ? 32 : 20;
  const gridContentWidth = homeLayout.isDesktop
    ? Math.max(0, homeLayout.contentWidth - sidebarWidth - layoutGap)
    : homeLayout.contentWidth;
  const gridMetrics = getShopDirectoryGridMetrics({
    contentWidth: gridContentWidth,
    viewportWidth: width,
  });
  const catalogResource = useCustomerAccountResource<OfferListResponse, OfferListResponse>({
    fixtureData: { data: [], limit: 80, page: 1, total: 0, totalPages: 0 },
    resourceId: "brandCatalog",
  });
  const categoryResource = useCustomerAccountResource({
    fixtureData: webShopDirectory.categories,
    resourceId: "categoryList",
  });
  const directoryCategories = resolveCategoryList(
    categoryResource.source,
    categoryResource.data,
    webShopDirectory.categories
  );
  const liveStores = resolveLiveDirectoryStores(
    catalogResource.source,
    catalogResource.data,
    webShopDirectory.stores,
    region,
  );
  const directorySearch = useDirectoryOfferSearch(
    searchQuery,
    catalogResource.source === "backend",
  );
  const shopResults = useMemo(() => {
    if (catalogResource.source === "backend" && searchQuery.trim()) {
      if (directorySearch.status !== "ready" || !directorySearch.stores) {
        return [];
      }

      return filterShopDirectoryStores({
        category: selectedCategory,
        query: "",
        shopType: selectedShopType,
        sortBy,
        stores: directorySearch.stores,
      });
    }

    if (catalogResource.source === "backend") {
      return filterShopDirectoryStores({
        category: selectedCategory,
        query: searchQuery,
        shopType: selectedShopType,
        sortBy,
        stores: liveStores,
      });
    }

    return getFixtureShopDirectoryResults({
      category: selectedCategory,
      query: searchQuery,
      regionCode: region,
      shopType: selectedShopType,
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
    selectedShopType,
    sortBy,
  ]);
  const totalPages = Math.max(1, Math.ceil(shopResults.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const visibleStores = shopResults.slice((activePage - 1) * pageSize, activePage * pageSize);
  const resultsLabel = `${shopResults.length} ${webShopDirectory.resultsUnit}`;

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const updateCategory = (value: string) => {
    haptics.impact();
    setSelectedCategory(value);
    setCurrentPage(1);
  };
  const updateShopType = (value: WebShopType) => {
    setSelectedShopType(value);
    setCurrentPage(1);
  };
  // Pull-to-refresh re-seeds the directory (synchronous parity data, no network refetch):
  // reset to the first page and clear the spinner on the next frame.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    catalogResource.retry();
    categoryResource.retry();
    requestAnimationFrame(() => setRefreshing(false));
  }, [catalogResource, categoryResource]);
  const shopDirectoryRowHeight = getDirectoryStoreCardHeight(gridMetrics.cardWidth);
  const renderShopDirectoryCard = useCallback(
    (store: ShopDirectoryStore) => (
      <ShopDirectoryStoreCard cardWidth={gridMetrics.cardWidth} store={store} />
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
          {webHomeSearchPlaceholder}
        </Text>
      </View>
    </View>
  );

  const shopContent = (
    <>
      <ShopDirectoryPromo
        contentWidth={homeLayout.contentWidth}
        isDesktop={homeLayout.isDesktop}
      />

      <View style={styles.shopDirectoryHeader}>
        <View style={styles.shopDirectoryTitleRow}>
          <Text
            style={[
              styles.shopDirectoryTitle,
              homeLayout.isDesktop ? styles.shopDirectoryTitleDesktop : null,
            ]}
          >
            {tc(webShopDirectory.title)}
          </Text>
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={styles.shopDirectoryTitleIcon}
          >
            {webShopDirectory.titleIcon}
          </Text>
        </View>
        <Text style={styles.shopDirectorySubtitle}>{tc(webShopDirectory.subtitle)}</Text>
      </View>

      <View
        style={[
          styles.shopDirectoryLayout,
          homeLayout.isDesktop ? styles.shopDirectoryLayoutDesktop : null,
          { gap: layoutGap },
        ]}
      >
        <ShopDirectoryCategoryAside
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
                accessibilityLabel={tc(webShopDirectory.searchLabel)}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="search"
                onChangeText={updateSearchQuery}
                placeholder={tc(webShopDirectory.searchPlaceholder)}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.shopDirectorySearchInput, webSearchInputFocusReset]}
                value={searchQuery}
              />
            </View>

            <ScrollView
              contentContainerStyle={styles.shopDirectoryPillRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {webShopDirectory.shopTypePills.map((pill) => (
                <MotionPressable
                  accessibilityRole="button"
                  key={pill.value}
                  onPress={() => updateShopType(pill.value as WebShopType)}
                  pressScale={motion.scale.subtlePress}
                  style={[
                    styles.shopDirectoryPill,
                    selectedShopType === pill.value ? styles.shopDirectoryPillActive : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.shopDirectoryPillText,
                      selectedShopType === pill.value ? styles.shopDirectoryPillTextActive : null,
                    ]}
                  >
                    {tc(pill.label)}
                  </Text>
                </MotionPressable>
              ))}
            </ScrollView>

            <View style={styles.shopDirectorySortBlock}>
              <Text
                numberOfLines={1}
                style={styles.shopDirectorySortLabel}
              >
                {tc(webShopDirectory.sortLabel)}
              </Text>
              <View style={styles.shopDirectorySortRow}>
                {webShopDirectory.sortPills.map((pill) => (
                  <MotionPressable
                    accessibilityRole="button"
                    key={pill.value}
                    onPress={() => setSortBy(pill.value as WebShopDirectorySort)}
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

          {visibleStores.length > 0 ? (
            <DirectoryVirtualizedGrid
              cardWidth={gridMetrics.cardWidth}
              columns={gridMetrics.columns}
              estimatedRowHeight={shopDirectoryRowHeight}
              gap={gridMetrics.gap}
              gridStyle={styles.shopDirectoryGrid}
              items={visibleStores}
              renderItemContent={renderShopDirectoryCard}
            />
          ) : (
            <View style={styles.shopDirectoryEmptyState}>
              <Text style={styles.shopDirectoryEmptyTitle}>{tc(webShopDirectory.emptyTitle)}</Text>
              <Text style={styles.shopDirectoryEmptyBody}>{tc(webShopDirectory.emptyBody)}</Text>
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
              {shopContent}
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
          {shopContent}
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
