import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Search as SearchIcon } from "@mobile/theme/icons";
import { CategoryGlyph } from "@mobile/components/CategoryGlyph";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import {
  resolveCategoryExploreStores,
  resolveCategoryIconImages,
  resolveCategoryIconKeys,
} from "@mobile/account/directoryCatalogResource";
import { useCategoryOfferBrowse } from "@mobile/account/useCategoryOfferBrowse";
import { BrandCard } from "@mobile/components/BrandCard";
import { getMobileEnv } from "@mobile/config/env";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import {
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  getScaledCompactBrandCardMetrics,
  mobileShellLayout,
  type WebCategoryExploreSort,
  webCategoryExploreHealthBeauty,
} from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";


const webSearchInputFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as TextStyle;

// react-native-web leaves a persistent focus outline box on Pressable/anchor elements after a mouse
// click; suppress it on the category sidebar items and sort pills (a11y role/label are unaffected).
const webPressableFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as ViewStyle;

function safeDecodeCategoryName(categoryName?: string): string {
  if (!categoryName) {
    return webCategoryExploreHealthBeauty.category;
  }

  try {
    return decodeURIComponent(categoryName);
  } catch {
    return categoryName;
  }
}

function categoryHref(category: string) {
  if (category === "All") {
    return "/brand";
  }

  return `/category/${encodeURIComponent(category)}`;
}

function getVisibleStoreCountLabel(count: number) {
  if (count === webCategoryExploreHealthBeauty.stores.length) {
    return webCategoryExploreHealthBeauty.storeCountLabel;
  }

  return `${count} ${count === 1 ? "brand" : "brands"}`;
}

function getCategoryGridMetrics({
  contentWidth,
  isDesktop,
  viewportWidth,
}: {
  contentWidth: number;
  isDesktop: boolean;
  viewportWidth: number;
}) {
  const layoutGap = isDesktop ? 32 : 0;
  const sidebarWidth = isDesktop ? 280 : 0;
  const gridWidth = Math.max(0, contentWidth - sidebarWidth - layoutGap);
  const gap = isDesktop || viewportWidth >= 640 ? 16 : 12;
  const preferredColumns = isDesktop
    ? 5
    : viewportWidth >= 768
      ? 4
      : viewportWidth >= 640
        ? 3
        : 2;
  const columns = Math.max(1, preferredColumns);
  const cardWidth = (gridWidth - gap * Math.max(0, columns - 1)) / columns;
  const scaledCard = getScaledCompactBrandCardMetrics(cardWidth);

  return {
    cardHeight: scaledCard.cardHeight,
    cardWidth,
    logoVisualHeight: scaledCard.logoVisualHeight,
    columns,
    gap,
    gridWidth,
    layoutGap,
    sidebarWidth,
  };
}

export function CustomerCategoryDetailScreen({ categoryName }: { categoryName?: string }) {
  const styles = useThemedStyles(createCategoryDetailScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { region } = useLocale();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const isDesktop = homeLayout.isDesktop;
  const showBottomNav = !isDesktop;
  const category = safeDecodeCategoryName(categoryName);
  const [searchQuery, setSearchQuery] = useState("");
  // #437 — default Sort by to All (unforced catalog order), not Highest Cashback.
  const [sortBy, setSortBy] = useState<WebCategoryExploreSort>("all");
  const liveBackend = getMobileEnv().accountDataSource === "backend";
  // #438 — category-scoped `/offer?category=` browse (not home brandCatalog page-1).
  const categoryBrowse = useCategoryOfferBrowse(category, liveBackend);
  const categoryResource = useCustomerAccountResource({
    fixtureData: webCategoryExploreHealthBeauty.categories,
    resourceId: "categoryList",
  });
  const categoryIconKeys = resolveCategoryIconKeys(
    categoryResource.source,
    categoryResource.data,
  );
  const categoryIconImages = resolveCategoryIconImages(
    categoryResource.source,
    categoryResource.data,
  );
  const catalogSource = liveBackend ? "backend" : "fixtures";
  const stores = useMemo(
    () =>
      resolveCategoryExploreStores({
        category,
        data: categoryBrowse.data,
        query: searchQuery,
        regionCode: region,
        sortBy,
        source: catalogSource,
      }),
    [catalogSource, category, categoryBrowse.data, region, searchQuery, sortBy]
  );
  const gridMetrics = getCategoryGridMetrics({
    contentWidth: homeLayout.contentWidth,
    isDesktop,
    viewportWidth: width,
  });
  // Interpolated with a dynamic category; wrapped as whole catalog units so the Health & Beauty
  // variant hits the shared catalog (webCategoryExploreHealthBeauty.title/subtitle/searchPlaceholder)
  // and other categories fall back to English. Not split into fragments (would be ungrammatical in Thai).
  const title = tc(`Explore your Favorite ${category}`);
  const subtitle = tc(
    `Find cashback deals from brands in ${category}. Search and sort to narrow results.`
  );
  const searchPlaceholder = tc(`Search within ${category}`);

  const categoryContent = (
    <>
      <View style={styles.header}>
        <Text numberOfLines={2} style={[styles.title, isDesktop ? styles.titleDesktop : null]}>
          {title}
          <Text style={styles.titleIcon}> 🔎</Text>
        </Text>
        <Text numberOfLines={3} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.categoryLayout, isDesktop ? styles.categoryLayoutDesktop : null]}>
        <CategoryAside
          activeCategory={category}
          categoryIconImages={categoryIconImages}
          categoryIconKeys={categoryIconKeys}
          isDesktop={isDesktop}
        />

        <View
          style={[
            styles.resultsColumn,
            isDesktop
              ? {
                  gap: spacing.lg,
                  width: gridMetrics.gridWidth,
                }
              : null,
          ]}
        >
          <View style={styles.filterCard}>
            <View style={styles.searchBox}>
              <SearchIcon
                color={colors.muted}
                size={18}
                strokeWidth={typography.iconStrokeWidth}
              />
              <TextInput
                accessibilityLabel={searchPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="search"
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                style={[styles.searchInput, webSearchInputFocusReset]}
                value={searchQuery}
              />
            </View>

            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>{tc(webCategoryExploreHealthBeauty.sortLabel)}</Text>
              {webCategoryExploreHealthBeauty.sortPills.map((pill) => {
                const active = sortBy === pill.value;
                return (
                  <MotionPressable
                    accessibilityRole="button"
                    key={pill.value}
                    onPress={() => {
                      // Medium-impact haptic on selection (fire-and-forget; web no-op).
                      void haptics.impact();
                      setSortBy(pill.value);
                    }}
                    pressScale={motion.scale.subtlePress}
                    style={[
                      styles.sortPill,
                      active ? styles.sortPillActive : null,
                      pill.value === "lowest_cashback" ? styles.lowestSortPill : null,
                      webPressableFocusReset,
                    ]}
                  >
                    <Text style={[styles.sortPillText, active ? styles.sortPillTextActive : null]}>
                      {tc(pill.label)}
                    </Text>
                  </MotionPressable>
                );
              })}
              <Text style={styles.storeCount}>{tc(getVisibleStoreCountLabel(stores.length))}</Text>
            </View>
          </View>

          {stores.length > 0 ? (
            <View style={[styles.storeGrid, { gap: gridMetrics.gap }]}>
              {stores.map((store, index) => (
                <BrandCard
                  accessibilityLabel={store.brand}
                  brand={store.brand}
                  cardHeight={gridMetrics.cardHeight}
                  cardWidth={gridMetrics.cardWidth}
                  cashback={store.cashback}
                  href={store.href}
                  key={store.href ?? store.brand}
                  logoUri={store.logoUri}
                  logoVisualHeight={gridMetrics.logoVisualHeight}
                  size="S"
                  testID={`category-result-card-${index}`}
                  tint={store.tint}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{tc("No stores match that search.")}</Text>
              <Text style={styles.emptyBody}>{tc("Try another brand or clear the search field.")}</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // DESKTOP: full-bleed shell so the footer's negative-margin breakout reaches the
  // viewport edge. Page content stays capped + centered at contentMaxWidth via an
  // inner cap; only the footer escapes the cap. Mirrors CustomerHomeScreen.
  if (isDesktop) {
    return (
      <View style={styles.viewport}>
        <View style={styles.desktopShellFrame}>
          <ScrollView
            contentContainerStyle={[
              styles.pageDesktopFullBleed,
              {
                // Match the Explore brand/shop/product directories' navbar->content gap.
              paddingTop: Math.max(8, insets.top + 8),
              },
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
              {categoryContent}
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

  // MOBILE: unchanged — capped phoneFrame, padded ScrollView, bottom nav.
  return (
    <View style={styles.viewport}>
      <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            {
              paddingBottom: showBottomNav
                ? mobileShellLayout.bottomNavClearance + 24
                : mobileShellLayout.desktopBottomClearance,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
              // Match the Explore brand/shop/product directories' navbar->content gap.
              paddingTop: Math.max(8, insets.top + 8),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {categoryContent}
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

function CategoryAside({
  activeCategory,
  categoryIconImages,
  categoryIconKeys,
  isDesktop,
}: {
  activeCategory: string;
  categoryIconImages?: Readonly<Record<string, string>>;
  categoryIconKeys?: Readonly<Record<string, string>>;
  isDesktop: boolean;
}) {
  const styles = useThemedStyles(createCategoryDetailScreenStyles);
  const tc = useCopy();
  return (
    <View style={[styles.categoryAside, isDesktop ? styles.categoryAsideDesktop : null]}>
      <Text style={[styles.categoryHeading, isDesktop ? styles.categoryHeadingDesktop : null]}>
        {tc("Categories")}
      </Text>
      {isDesktop ? <View style={styles.desktopDivider} /> : null}
      <ScrollView
        contentContainerStyle={[
          styles.categoryNav,
          isDesktop ? styles.categoryNavDesktop : styles.categoryNavMobile,
        ]}
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
      >
        {webCategoryExploreHealthBeauty.categories.map((category) => (
          <CategoryNavItem
            active={category === activeCategory}
            category={category}
            iconImageUrl={categoryIconImages?.[category]}
            iconKey={categoryIconKeys?.[category]}
            isDesktop={isDesktop}
            key={category}
          />
        ))}
      </ScrollView>
      {!isDesktop ? <View style={styles.mobileDivider} /> : null}
    </View>
  );
}

function CategoryNavItem({
  active,
  category,
  iconImageUrl,
  iconKey,
  isDesktop,
}: {
  active: boolean;
  category: string;
  iconImageUrl?: string;
  iconKey?: string;
  isDesktop: boolean;
}) {
  const styles = useThemedStyles(createCategoryDetailScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const iconColor = active ? colors.white : colors.accent;

  return (
    <Link asChild href={categoryHref(category) as never}>
      <MotionPressable
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([
          styles.categoryNavItem,
          isDesktop ? styles.categoryNavItemDesktop : styles.categoryNavItemMobile,
          active ? styles.categoryNavItemActive : null,
          webPressableFocusReset,
        ])}
      >
        <View style={styles.categoryIconCell}>
          <CategoryGlyph
            category={category}
            color={iconColor}
            iconKey={iconKey}
            imageUrl={iconImageUrl}
            size={isDesktop ? 22 : 20}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[styles.categoryNavText, active ? styles.categoryNavTextActive : null]}
        >
          {tc(category)}
        </Text>
      </MotionPressable>
    </Link>
  );
}

function createCategoryDetailScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  phoneFrame: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
    width: "100%",
  },
  desktopShellFrame: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
    width: "100%",
  },
  desktopContentCap: {
    alignSelf: "center",
    width: "100%",
  },
  desktopFooterCap: {
    alignSelf: "center",
    width: "100%",
  },
  pageDesktopFullBleed: {
    paddingHorizontal: 0,
  },
  page: {
    gap: spacing.homeStackGap,
  },
  desktopFooter: {
    marginTop: 0,
  },
  header: {
    gap: spacing.md,
    marginBottom: 28,
  },
  title: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
  },
  titleDesktop: {
    fontSize: 42,
    lineHeight: 44,
  },
  titleIcon: {
    fontSize: 25,
    lineHeight: 30,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 26,
    maxWidth: 680,
  },
  categoryLayout: {
    gap: 28,
  },
  categoryLayoutDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xl,
  },
  categoryAside: {
    gap: 20,
    width: "100%",
  },
  categoryAsideDesktop: {
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    width: 280,
  },
  categoryHeading: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  categoryHeadingDesktop: {
    color: colors.accent,
  },
  desktopDivider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  mobileDivider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  categoryNav: {
    gap: spacing.sm,
  },
  categoryNavMobile: {
    paddingBottom: 2,
  },
  categoryNavDesktop: {
    flexDirection: "column",
    width: "100%",
  },
  categoryNavItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  categoryNavItemMobile: {
    borderRadius: radii.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  categoryNavItemDesktop: {
    borderRadius: radii.md,
    minHeight: 52,
    padding: spacing.md,
    width: "100%",
  },
  categoryNavItemActive: {
    backgroundColor: colors.primaryDark,
  },
  categoryIconCell: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  categoryNavText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 20,
  },
  categoryNavTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  resultsColumn: {
    gap: spacing.lg,
    minWidth: 0,
    width: "100%",
  },
  filterCard: {
    backgroundColor: pickThemed(colors, "rgba(255, 255, 255, 0.9)", colors.card),
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    boxShadow: shadows.cardCss,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    // Clip to the radius so the rounded corners don't rasterize "horns" under the focus layer.
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    boxShadow: shadows.cardCss,
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    minWidth: 0,
    padding: 0,
  },
  sortRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sortLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 24,
    marginRight: spacing.xs,
  },
  sortPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sortPillActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  lowestSortPill: {
    paddingHorizontal: 16,
  },
  sortPillText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 20,
  },
  sortPillTextActive: {
    color: colors.white,
  },
  storeCount: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
    marginLeft: "auto",
    textAlign: "right",
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  emptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "800",
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
}

