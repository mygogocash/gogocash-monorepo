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
import { resolveCategoryDirectoryCards } from "@mobile/account/directoryCatalogResource";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { useCopy } from "@mobile/i18n/useCopy";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { webSearchInputFocusReset } from "./directoryAssets";

import {
  getCategoryDirectoryCountLabel,
  getCategoryDirectoryGridMetrics,
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  mobileShellLayout,
  webCategoryDirectory,
} from "@mobile/design/webDesignParity";

import { CategoryDirectoryCard } from "./CategoryDirectoryCard";
import { CategoryDirectoryPagination } from "./CategoryDirectoryPagination";

export function CustomerCategoryDirectoryScreen() {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const showBottomNav = !homeLayout.isDesktop;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const categoryResource = useCustomerAccountResource({
    fixtureData: webCategoryDirectory.cards,
    resourceId: "categoryList",
  });
  const allCategoryCards = resolveCategoryDirectoryCards(
    categoryResource.source,
    categoryResource.data,
    webCategoryDirectory.cards
  );
  const matchingCategories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return [...allCategoryCards];
    }
    return allCategoryCards.filter((category) =>
      category.title.toLowerCase().includes(normalizedQuery)
    );
  }, [allCategoryCards, searchQuery]);
  const pageSize = webCategoryDirectory.pagination.pageSize;
  const totalPages = Math.max(1, Math.ceil(matchingCategories.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const categories = matchingCategories.slice((activePage - 1) * pageSize, activePage * pageSize);
  const categoryPage = { cards: categories, page: activePage, totalPages };
  const gridMetrics = getCategoryDirectoryGridMetrics({
    contentWidth: homeLayout.contentWidth,
    viewportWidth: width,
  });
  const availableLabel = searchQuery.trim().length > 0
    ? getCategoryDirectoryCountLabel(matchingCategories.length)
    : categoryResource.source === "backend"
      ? getCategoryDirectoryCountLabel(allCategoryCards.length)
      : webCategoryDirectory.countLabel;
  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    categoryResource.retry();
    requestAnimationFrame(() => setRefreshing(false));
  }, [categoryResource]);

  const categoryDirectoryContent = (
    <>
      <View
        style={[
          styles.categoryDirectoryHeader,
          homeLayout.isDesktop ? styles.categoryDirectoryHeaderDesktop : null,
        ]}
      >
        <View style={styles.categoryDirectoryTitleBlock}>
          <View style={styles.categoryDirectoryTitleRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.categoryDirectoryTitle,
                homeLayout.isDesktop ? styles.categoryDirectoryTitleDesktop : null,
              ]}
            >
              {tc(webCategoryDirectory.title)}
            </Text>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={styles.categoryDirectoryTitleIcon}
            >
              {webCategoryDirectory.titleIcon}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.categoryDirectoryCount}>{availableLabel}</Text>
        </View>

        <View
          style={[
            styles.categorySearchPanel,
            homeLayout.isDesktop ? styles.categorySearchPanelDesktop : null,
          ]}
        >
          <View style={styles.categorySearchBox}>
            <TextInput
              accessibilityLabel={tc(webCategoryDirectory.searchPlaceholder)}
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="search"
              onChangeText={updateSearchQuery}
              placeholder={tc(webCategoryDirectory.searchPlaceholder)}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={[styles.categorySearchInput, webSearchInputFocusReset]}
              value={searchQuery}
            />
            <SearchIcon color={colors.muted} size={24} strokeWidth={typography.iconStrokeWidth} />
          </View>
        </View>
      </View>

      {categories.length > 0 ? (
        <View style={[styles.categoryDirectoryGrid, { gap: gridMetrics.gap }]}>
          {categories.map((category, index) => (
            <CategoryDirectoryCard
              cardWidth={gridMetrics.cardWidth}
              category={category}
              index={index}
              isDesktop={homeLayout.isDesktop}
              key={category.title}
            />
          ))}
        </View>
      ) : (
        <View style={styles.categoryDirectoryEmptyState}>
          <Text style={styles.categoryDirectoryEmptyTitle}>{tc(webCategoryDirectory.emptyTitle)}</Text>
          <Text style={styles.categoryDirectoryEmptyBody}>{tc(webCategoryDirectory.emptyBody)}</Text>
        </View>
      )}

      <CategoryDirectoryPagination
        activePage={categoryPage.page}
        onChangePage={setCurrentPage}
        totalPages={categoryPage.totalPages}
      />
    </>
  );

  if (homeLayout.isDesktop) {
    return (
      <View style={styles.viewport}>
        <View style={styles.desktopShellFrame}>
          <ScrollView
            contentContainerStyle={[
              styles.categoryDirectoryPage,
              styles.pageDesktopFullBleed,
              { paddingBottom: mobileShellLayout.desktopBottomClearance },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.desktopContentCap,
                {
                  maxWidth: homeLayout.contentMaxWidth,
                  paddingHorizontal: homeLayout.contentHorizontalPadding,
                  paddingTop: Math.max(12, insets.top + 12),
                },
              ]}
            >
              {categoryDirectoryContent}
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
        <ScrollView
          contentContainerStyle={[
            styles.categoryDirectoryPage,
            {
              paddingBottom: showBottomNav
                ? mobileShellLayout.bottomNavClearance + 24
                : mobileShellLayout.desktopBottomClearance,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
              paddingTop: Math.max(12, insets.top + 12),
            },
          ]}
          refreshControl={
            <RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.primaryDark} />
          }
          showsVerticalScrollIndicator={false}
        >
          {categoryDirectoryContent}
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>

        {showBottomNav ? <CustomerMobileBottomNav bottomInset={insets.bottom} /> : null}
      </View>
    </View>
  );
}
