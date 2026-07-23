import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search as SearchIcon } from "@mobile/theme/icons";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { useSpecificPageBanner } from "@mobile/account/specificPageBannerResource";
import { useDirectoryOfferBrowse } from "@mobile/account/useDirectoryOfferBrowse";
import { useDirectoryOfferSearch } from "@mobile/account/useDirectoryOfferSearch";
import {
  filterDirectoryStores,
  getFixtureBrandDirectoryResults,
  resolveCategoryIconImages,
  resolveCategoryIconKeys,
  resolveCategoryList,
} from "@mobile/account/directoryCatalogResource";
import type { OfferListResponse } from "@mobile/api/catalogTypes";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { haptics } from "@mobile/lib/haptics";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";

import {
  getBrandDirectoryGridMetrics,
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  webBrandDirectory,
  webHomeSearchPlaceholder,
  type WebBrandDirectorySort,
} from "@mobile/design/webDesignParity";

import { BrandCard } from "@mobile/components/BrandCard";
import { getBrandCardLargeHeight } from "@mobile/components/brandCardMetrics";
import { BrandDirectoryCategoryAside } from "./BrandDirectoryCategoryAside";
import { DirectorySearchPanel } from "./DirectorySearchPanel";
import { DirectoryVirtualizedGrid } from "./directoryVirtualizedGrid";
import { type BrandDirectoryStore } from "./discoveryTypes";
import { ShopDirectoryPagination } from "./ShopDirectoryPagination";
import { SpecificPageBannerCarousel } from "./SpecificPageBannerCarousel";

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
  const [sortBy, setSortBy] = useState<WebBrandDirectorySort>("all");
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
  // Probe backend vs fixture; home brandCatalog page-1 is not used for the grid (#462).
  const catalogResource = useCustomerAccountResource<OfferListResponse, OfferListResponse>({
    fixtureData: { data: [], limit: 80, page: 1, total: 0, totalPages: 0 },
    resourceId: "brandCatalog",
  });
  const categoryResource = useCustomerAccountResource({
    fixtureData: webBrandDirectory.categories,
    resourceId: "categoryList",
  });
  const specificPageBanner = useSpecificPageBanner("brand", webBrandDirectory.promo);
  const directoryCategories = resolveCategoryList(
    categoryResource.source,
    categoryResource.data,
    webBrandDirectory.categories
  );
  const directoryCategoryIconKeys = resolveCategoryIconKeys(
    categoryResource.source,
    categoryResource.data,
  );
  const directoryCategoryIconImages = resolveCategoryIconImages(
    categoryResource.source,
    categoryResource.data,
  );
  const liveBackend = catalogResource.source === "backend";
  const directoryBrowse = useDirectoryOfferBrowse(liveBackend && !searchQuery.trim());
  const directorySearch = useDirectoryOfferSearch(searchQuery, liveBackend);
  const brandResults = useMemo(() => {
    if (liveBackend && searchQuery.trim()) {
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

    if (liveBackend) {
      if (directoryBrowse.status !== "ready" || !directoryBrowse.stores) {
        return [];
      }

      return filterDirectoryStores({
        category: selectedCategory,
        query: "",
        sortBy,
        stores: directoryBrowse.stores,
      });
    }

    return getFixtureBrandDirectoryResults({
      category: selectedCategory,
      query: searchQuery,
      regionCode: region,
      sortBy,
    });
  }, [
    directoryBrowse.status,
    directoryBrowse.stores,
    directorySearch.status,
    directorySearch.stores,
    liveBackend,
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
    specificPageBanner.retry();
    requestAnimationFrame(() => setRefreshing(false));
  }, [catalogResource, categoryResource, specificPageBanner]);
  // Sized for the shared BrandCard this grid renders. The retired bespoke card
  // reserved a two-line name, which left ~40px dead under every card.
  const brandDirectoryRowHeight = getBrandCardLargeHeight(gridMetrics.cardWidth);
  const renderBrandDirectoryCard = useCallback(
    (store: BrandDirectoryStore) => (
      // Unified with the shared BrandCard (size "L") used by the home rails, Top Brands,
      // category + shop-detail surfaces — so every brand card renders identically (logo
      // tile, favorite heart pinned bottom-right, single-line name, cashback row) instead
      // of the bespoke BrandDirectoryStoreCard that drifted from that component.
      <BrandCard
        accessibilityLabel={`${store.brand} ${store.cashback} cashback`}
        brand={store.brand}
        cardHeight={brandDirectoryRowHeight}
        cardWidth={gridMetrics.cardWidth}
        cashback={store.cashback}
        href={store.href}
        id={store.id}
        label={store.label}
        logoUri={store.logoUri}
        showGrabCoupon={store.showGrabCoupon}
        size="L"
        testID={`brand-directory-card-${store.id}`}
        tint={store.tint}
      />
    ),
    [brandDirectoryRowHeight, gridMetrics.cardWidth]
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
      {specificPageBanner.promo ? (
        <SpecificPageBannerCarousel
          contentWidth={homeLayout.contentWidth}
          isDesktop={homeLayout.isDesktop}
          pageTarget={specificPageBanner.target}
          promo={specificPageBanner.promo}
        />
      ) : null}

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
          categoryIconImages={directoryCategoryIconImages}
          categoryIconKeys={directoryCategoryIconKeys}
          isDesktop={homeLayout.isDesktop}
          onSelectCategory={updateCategory}
          width={sidebarWidth}
        />

        <View style={[styles.shopDirectoryMain, { width: gridContentWidth }]}>
          <DirectorySearchPanel
            activeSort={sortBy}
            onSearchChange={updateSearchQuery}
            onSelectSort={(value) => setSortBy(value as WebBrandDirectorySort)}
            resultsLabel={resultsLabel}
            searchLabel={tc(webBrandDirectory.searchLabel)}
            searchPlaceholder={tc(webBrandDirectory.searchPlaceholder)}
            searchValue={searchQuery}
            sortLabel={webBrandDirectory.sortLabel}
            sortPills={webBrandDirectory.sortPills}
          />

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
