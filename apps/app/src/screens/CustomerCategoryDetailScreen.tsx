import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { Heart as HeartIcon, Search as SearchIcon } from "@mobile/theme/icons";
import { getCategoryIcon } from "@mobile/theme/categoryIcons";
import {
  Image,
  type ImageSourcePropType,
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

import shopeeLogo from "../../assets/partner-shopee.png";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import {
  getCategoryExploreResults,
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  getTopBrandHref,
  mobileShellLayout,
  type WebCategoryExploreSort,
  webCategoryExploreHealthBeauty,
} from "@mobile/design/webDesignParity";
import { motion } from "@mobile/theme/motion";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type CategoryStore = ReturnType<typeof getCategoryExploreResults>[number] & {
  href?: string;
};

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

  return `${count} ${count === 1 ? "brand" : "brands"} in this category`;
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
    ? viewportWidth >= 1280
      ? 6
      : viewportWidth >= 1024
        ? 5
        : 4
    : viewportWidth >= 768
      ? 4
      : viewportWidth >= 640
        ? 3
        : 2;
  const columns = Math.max(1, preferredColumns);
  const cardWidth = (gridWidth - gap * Math.max(0, columns - 1)) / columns;

  return {
    cardHeight: cardWidth + (isDesktop ? 92 : 96),
    cardWidth,
    columns,
    gap,
    gridWidth,
    layoutGap,
    sidebarWidth,
  };
}

export function CustomerCategoryDetailScreen({ categoryName }: { categoryName?: string }) {
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const isDesktop = homeLayout.isDesktop;
  const showBottomNav = !isDesktop;
  const category = safeDecodeCategoryName(categoryName);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<WebCategoryExploreSort>("highest_cashback");
  const stores = useMemo(
    () => getCategoryExploreResults({ category: category, query: searchQuery, sortBy }),
    [category, searchQuery, sortBy]
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
        <CategoryAside activeCategory={category} isDesktop={isDesktop} />

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
                color={colors.textSoft}
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
                placeholderTextColor={colors.textSoft}
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
                <CategoryStoreCard
                  cardHeight={gridMetrics.cardHeight}
                  cardWidth={gridMetrics.cardWidth}
                  index={index}
                  key={store.brand}
                  store={store}
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
              styles.page,
              styles.pageDesktopFullBleed,
              {
                paddingBottom: mobileShellLayout.desktopBottomClearance,
                paddingTop: Math.max(spacing.lg, insets.top + spacing.lg),
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
              paddingTop: Math.max(spacing.lg, insets.top + spacing.lg),
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
  isDesktop,
}: {
  activeCategory: string;
  isDesktop: boolean;
}) {
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
  isDesktop,
}: {
  active: boolean;
  category: string;
  isDesktop: boolean;
}) {
  const tc = useCopy();
  const Icon = getCategoryIcon(category);
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
          <Icon color={iconColor} size={isDesktop ? 22 : 20} strokeWidth={typography.iconStrokeWidth} />
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

function CategoryStoreCard({
  cardHeight,
  cardWidth,
  index,
  store,
}: {
  cardHeight: number;
  cardWidth: number;
  index: number;
  store: CategoryStore;
}) {
  const tc = useCopy();
  const logoSource: ImageSourcePropType = store.logoUri ? { uri: store.logoUri } : shopeeLogo;
  const visualHeight = Math.max(96, cardWidth - 16);

  return (
    <Link asChild href={(store.href ?? getTopBrandHref(store.brand)) as never}>
      <MotionPressable
        accessibilityLabel={store.brand}
        hoverLift
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([styles.storeCard, { height: cardHeight, width: cardWidth }])}
        testID={`category-result-card-${index}`}
      >
        <View style={[styles.storeVisual, { backgroundColor: store.tint, height: visualHeight }]}>
          <View style={styles.couponChip}>
            <Text style={styles.couponIcon}>🧧</Text>
            <Text numberOfLines={1} style={styles.couponText}>
              {tc("Grab Coupon")}
            </Text>
          </View>
          <View style={styles.favoriteButton}>
            <HeartIcon color={colors.primaryDark} size={20} strokeWidth={2} />
          </View>
          <Image
            alt={`${store.brand} logo`}
            accessibilityLabel={`${store.brand} logo`}
            resizeMode="contain"
            source={logoSource}
            style={styles.storeLogo}
          />
        </View>
        <Text numberOfLines={2} style={styles.storeName}>
          {store.brand}
        </Text>
        <View style={styles.cashbackRow}>
          <Text numberOfLines={1} style={styles.cashbackCaption}>
            {tc("Cashback up to")}
          </Text>
          <Text style={styles.cashbackValue}>{store.cashback}</Text>
        </View>
      </MotionPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
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
    minHeight: "100%",
  },
  desktopFooter: {
    marginTop: 64,
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
    backgroundColor: "#FAFAFA",
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
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
    color: colors.textSoft,
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
  storeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.sm,
    boxShadow: shadows.cardCss,
  },
  storeVisual: {
    borderRadius: radii.sm,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  couponChip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    left: spacing.xs,
    maxWidth: "70%",
    minHeight: 22,
    paddingHorizontal: spacing.xs,
    position: "absolute",
    top: spacing.xs,
    zIndex: 2,
  },
  couponIcon: {
    fontSize: 10,
    lineHeight: 12,
  },
  couponText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: typography.bodyWeight,
    lineHeight: 14,
  },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: spacing.xs,
    top: spacing.xs,
    width: 34,
    zIndex: 2,
  },
  storeLogo: {
    height: "100%",
    width: "100%",
  },
  storeName: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
    minHeight: 38,
  },
  cashbackRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  cashbackCaption: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: typography.bodyWeight,
    lineHeight: 16,
  },
  cashbackValue: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
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
