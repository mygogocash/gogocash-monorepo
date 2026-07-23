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
import { useSpecificPageBanner } from "@mobile/account/specificPageBannerResource";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import {
  filterDirectoryStoresByRegion,
  resolveCategoryIconImages,
  resolveCategoryIconKeys,
} from "@mobile/account/directoryCatalogResource";
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
  getProductDiscoveryGridMetrics,
  getProductDiscoveryResults,
  getResponsiveHomeLayoutMetrics,
  webHomeSearchPlaceholder,
  webProductDiscovery,
  type WebProductDiscoveryCashbackMin,
  type WebProductDiscoveryProduct,
  type WebProductDiscoverySort,
} from "@mobile/design/webDesignParity";

import {
  DirectoryVirtualizedGrid,
  getProductDiscoveryCardHeight,
} from "./directoryVirtualizedGrid";
import { ProductDiscoveryCard } from "./ProductDiscoveryCard";
import { ProductDiscoveryMobileFilters } from "./ProductDiscoveryMobileFilters";
import { ProductDiscoverySidebar } from "./ProductDiscoverySidebar";
import { ProductDiscoveryTermsDialog } from "./ProductDiscoveryTermsDialog";
import { ShopDirectoryPagination } from "./ShopDirectoryPagination";
import { SpecificPageBannerCarousel } from "./SpecificPageBannerCarousel";

export function CustomerProductDiscoveryScreen() {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { region } = useLocale();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCashbackMin, setSelectedCashbackMin] =
    useState<WebProductDiscoveryCashbackMin>(0);
  const [sortBy, setSortBy] = useState<WebProductDiscoverySort>("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [termsClosing, setTermsClosing] = useState(false);
  const pageSize = webProductDiscovery.pagination.pageSize;
  const sidebarWidth = homeLayout.isDesktop ? 280 : homeLayout.contentWidth;
  const layoutGap = homeLayout.isDesktop ? 32 : 20;
  const gridContentWidth = homeLayout.isDesktop
    ? Math.max(0, homeLayout.contentWidth - sidebarWidth - layoutGap)
    : homeLayout.contentWidth;
  const gridMetrics = getProductDiscoveryGridMetrics({
    contentWidth: gridContentWidth,
    viewportWidth: width,
  });
  const specificPageBanner = useSpecificPageBanner("discover", webProductDiscovery.promo);
  const categoryResource = useCustomerAccountResource({
    fixtureData: webProductDiscovery.categories.map((category) => category.label),
    resourceId: "categoryList",
  });
  const directoryCategoryIconKeys = resolveCategoryIconKeys(
    categoryResource.source,
    categoryResource.data,
  );
  const directoryCategoryIconImages = resolveCategoryIconImages(
    categoryResource.source,
    categoryResource.data,
  );
  const productResults = useMemo(
    () =>
      filterDirectoryStoresByRegion(
        getProductDiscoveryResults({
          category: selectedCategory,
          minCashback: selectedCashbackMin,
          query: searchQuery,
          sortBy,
        }),
        region,
      ),
    [region, searchQuery, selectedCashbackMin, selectedCategory, sortBy]
  );
  const totalPages = Math.max(1, Math.ceil(productResults.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const visibleProducts = productResults.slice((activePage - 1) * pageSize, activePage * pageSize);
  const resultsLabel = `${productResults.length} ${tc(webProductDiscovery.resultsUnit)}`;

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const updateCategory = (value: string) => {
    haptics.impact();
    setSelectedCategory(value);
    setCurrentPage(1);
  };
  const updateCashbackMin = (value: WebProductDiscoveryCashbackMin) => {
    setSelectedCashbackMin(value);
    setCurrentPage(1);
  };
  // Pull-to-refresh re-seeds the directory (synchronous parity data, no network refetch):
  // reset to the first page and clear the spinner on the next frame.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    specificPageBanner.retry();
    requestAnimationFrame(() => setRefreshing(false));
  }, [specificPageBanner]);
  const openTerms = useCallback(() => {
    setTermsClosing(false);
    setTermsVisible(true);
  }, []);
  const closeTerms = () => {
    setTermsClosing(true);
    setTimeout(() => {
      setTermsVisible(false);
      setTermsClosing(false);
    }, motion.duration.fast);
  };
  const productDiscoveryRowHeight = getProductDiscoveryCardHeight(gridMetrics.cardWidth);
  const renderProductDiscoveryCard = useCallback(
    (product: WebProductDiscoveryProduct) => (
      <ProductDiscoveryCard
        cardWidth={gridMetrics.cardWidth}
        onOpenTerms={openTerms}
        product={product}
      />
    ),
    [gridMetrics.cardWidth, openTerms]
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

  const productContent = (
    <>
      {specificPageBanner.promo ? (
        <SpecificPageBannerCarousel
          contentWidth={homeLayout.contentWidth}
          isDesktop={homeLayout.isDesktop}
          pageTarget={specificPageBanner.target}
          promo={specificPageBanner.promo}
        />
      ) : null}

      <View style={styles.productDiscoveryHeader}>
        <Text
          style={[
            styles.productDiscoveryTitle,
            homeLayout.isDesktop ? styles.productDiscoveryTitleDesktop : null,
          ]}
        >
          {tc(webProductDiscovery.title)}
        </Text>
        <Text style={styles.productDiscoverySubtitle}>{tc(webProductDiscovery.subtitle)}</Text>
      </View>

      <View
        style={[
          styles.productDiscoveryLayout,
          homeLayout.isDesktop ? styles.productDiscoveryLayoutDesktop : null,
          { gap: layoutGap },
        ]}
      >
        {homeLayout.isDesktop ? (
          <ProductDiscoverySidebar
            activeCategory={selectedCategory}
            categoryIconImages={directoryCategoryIconImages}
            categoryIconKeys={directoryCategoryIconKeys}
            onSelectCategory={updateCategory}
            width={sidebarWidth}
          />
        ) : null}

        <View style={[styles.productDiscoveryMain, { width: gridContentWidth }]}>
          {!homeLayout.isDesktop ? (
            <ProductDiscoveryMobileFilters
              activeCashbackMin={selectedCashbackMin}
              activeCategory={selectedCategory}
              onSelectCashback={updateCashbackMin}
              onSelectCategory={updateCategory}
            />
          ) : null}

          <View style={styles.productDiscoveryFilterPanel}>
            <View style={styles.productDiscoverySearchBox}>
              <SearchIcon color={colors.muted} size={18} strokeWidth={typography.iconStrokeWidth} />
              <TextInput
                accessibilityLabel={tc(webProductDiscovery.searchLabel)}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="search"
                onChangeText={updateSearchQuery}
                placeholder={tc(webProductDiscovery.searchPlaceholder)}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.productDiscoverySearchInput, webSearchInputFocusReset]}
                value={searchQuery}
              />
            </View>

            <View style={styles.productDiscoverySortRow}>
              <Text
                numberOfLines={1}
                style={styles.productDiscoverySortLabel}
              >
                {tc(webProductDiscovery.sortLabel)}
              </Text>
              {webProductDiscovery.sortPills.map((pill) => (
                <MotionPressable
                  accessibilityRole="button"
                  key={pill.value}
                  onPress={() => setSortBy(pill.value as WebProductDiscoverySort)}
                  pressScale={motion.scale.subtlePress}
                  style={[
                    styles.productDiscoveryPill,
                    sortBy === pill.value ? styles.productDiscoveryPillActive : null,
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
              <Text style={styles.productDiscoveryResultsCount}>{resultsLabel}</Text>
            </View>
          </View>

          {visibleProducts.length > 0 ? (
            <DirectoryVirtualizedGrid
              cardWidth={gridMetrics.cardWidth}
              columns={gridMetrics.columns}
              estimatedRowHeight={productDiscoveryRowHeight}
              gap={gridMetrics.gap}
              gridStyle={styles.productDiscoveryGrid}
              items={visibleProducts}
              renderItemContent={renderProductDiscoveryCard}
            />
          ) : (
            <View style={styles.productDiscoveryEmptyState}>
              <Text style={styles.productDiscoveryEmptyTitle}>
                {tc(webProductDiscovery.emptyTitle)}
              </Text>
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

  const termsDialog = (
    <ProductDiscoveryTermsDialog
      closing={termsClosing}
      onClose={closeTerms}
      visible={termsVisible}
    />
  );

  if (homeLayout.isDesktop) {
    return (
      <View style={styles.viewport}>
        <View style={styles.desktopShellFrame}>
          <ScrollView
            contentContainerStyle={[
              styles.productDiscoveryPage,
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
              {productContent}
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
          {termsDialog}
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
            styles.productDiscoveryPage,
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
          {productContent}
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>

        {termsDialog}
        {homeLayout.isDesktop ? null : <CustomerMobileBottomNav bottomInset={insets.bottom} />}
      </View>
    </View>
  );
}
