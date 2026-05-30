import { Link } from "expo-router";
import { useMemo, useState } from "react";
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
import {
  ArrowRight as ArrowRightIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Clock3 as ClockIcon,
  Heart as HeartIcon,
  Search as SearchIcon,
  SlidersHorizontal as SlidersIcon,
} from "@mobile/theme/icons";

import homeBannerImage from "../../assets/home-banner.png";
import popularBeautyImage from "../../assets/popular-beauty.png";
import popularDinnerImage from "../../assets/popular-dinner.png";
import popularElectronicImage from "../../assets/popular-electronic.png";
import sideGroceryImage from "../../assets/home-side-grocery.png";
import sideWatchImage from "../../assets/home-side-watch.png";
import questBannerImage from "../../assets/quest-banner-en.png";
import shopPromoGogoQuestImage from "../../assets/shop-promo-gogoquest.png";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import {
  getBrandDirectoryGridMetrics,
  getBrandDirectoryResults,
  getCategoryDirectoryCountLabel,
  getCategoryDirectoryGridMetrics,
  getCategoryDirectoryMatches,
  getCategoryDirectoryPage,
  getProductDiscoveryGridMetrics,
  getProductDiscoveryResults,
  getResponsiveHomeLayoutMetrics,
  getShopDirectoryGridMetrics,
  getShopDirectoryResults,
  mobileShellLayout,
  webBrandDirectory,
  webCategoryDirectory,
  webHomeSearchPlaceholder,
  webProductDiscovery,
  webShopDirectory,
  type WebBrandDirectorySort,
  type WebProductDiscoveryCashbackMin,
  type WebProductDiscoveryProduct,
  type WebProductDiscoverySort,
  type WebShopDirectorySort,
  type WebShopType,
} from "@mobile/design/webDesignParity";
import { type MobileRouteId } from "@mobile/navigation/routes";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { motion } from "@mobile/theme/motion";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type DiscoveryVariant = Extract<MobileRouteId, "brand" | "category" | "discover" | "shops">;
type CategoryDirectoryItem = (typeof webCategoryDirectory.cards)[number];
type BrandDirectoryStore = (typeof webBrandDirectory.stores)[number];
type ShopDirectoryStore = (typeof webShopDirectory.stores)[number];
type DirectoryPromo = typeof webShopDirectory.promo;
type WebViewStyle = ViewStyle & {
  transitionDuration?: string;
  transitionProperty?: string;
  transitionTimingFunction?: string;
  willChange?: string;
};

const productImageAssets: Record<string, ImageSourcePropType> = {
  "home-banner": homeBannerImage,
  "home-side-grocery": sideGroceryImage,
  "home-side-watch": sideWatchImage,
  "popular-beauty": popularBeautyImage,
  "popular-dinner": popularDinnerImage,
  "popular-electronic": popularElectronicImage,
  "quest-banner-en": questBannerImage,
};

const categoryDirectoryImageAssets: Record<string, ImageSourcePropType> = {
  "popular-beauty": popularBeautyImage,
  "popular-dinner": popularDinnerImage,
  "popular-electronic": popularElectronicImage,
  "quest-banner-en": questBannerImage,
};

const shopDirectoryImageAssets: Record<string, ImageSourcePropType> = {
  "shop-promo-gogoquest": shopPromoGogoQuestImage,
};

const webSearchInputFocusReset = {
  outlineStyle: "none",
  outlineWidth: 0,
} as unknown as TextStyle;

const productDiscoveryDialogTransition: WebViewStyle = {
  transitionDuration: `${motion.duration.fast}ms`,
  transitionProperty: "opacity, transform",
  transitionTimingFunction: motion.cssTransition.timingFunction,
  willChange: "opacity, transform",
};

export function CustomerDiscoveryScreen({ routeId }: { routeId: DiscoveryVariant }) {
  if (routeId === "brand") {
    return <BrandDirectoryScreen />;
  }

  if (routeId === "category") {
    return <CategoryDirectoryScreen />;
  }

  if (routeId === "discover") {
    return <ProductDiscoveryScreen />;
  }

  if (routeId === "shops") {
    return <ShopDirectoryScreen />;
  }

  return null;
}

function BrandDirectoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<WebBrandDirectorySort>("highest_cashback");
  const [currentPage, setCurrentPage] = useState(1);
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
  const brandResults = useMemo(
    () =>
      getBrandDirectoryResults({
        category: selectedCategory,
        query: searchQuery,
        sortBy,
      }),
    [searchQuery, selectedCategory, sortBy]
  );
  const totalPages = Math.max(1, Math.ceil(brandResults.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const visibleBrands = brandResults.slice((activePage - 1) * pageSize, activePage * pageSize);
  const resultsLabel = `${brandResults.length} ${webBrandDirectory.resultsUnit}`;

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const updateCategory = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  return (
    <View style={styles.viewport}>
      <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
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
            <SearchIcon
              color={colors.primaryDark}
              size={20}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text numberOfLines={1} style={styles.searchText}>
              {webHomeSearchPlaceholder}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.shopDirectoryPage,
            {
              paddingBottom: homeLayout.pageBottomPadding,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
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
                {webBrandDirectory.title}
              </Text>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={styles.shopDirectoryTitleIcon}
              >
                {webBrandDirectory.titleIcon}
              </Text>
            </View>
            <Text style={styles.shopDirectorySubtitle}>{webBrandDirectory.subtitle}</Text>
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
              isDesktop={homeLayout.isDesktop}
              onSelectCategory={updateCategory}
              width={sidebarWidth}
            />

            <View style={[styles.shopDirectoryMain, { width: gridContentWidth }]}>
              <View style={styles.shopDirectoryFilterPanel}>
                <View style={styles.shopDirectorySearchBox}>
                  <SearchIcon
                    color={colors.muted}
                    size={18}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                  <TextInput
                    accessibilityLabel={webBrandDirectory.searchLabel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputMode="search"
                    onChangeText={updateSearchQuery}
                    placeholder={webBrandDirectory.searchPlaceholder}
                    placeholderTextColor={colors.textSoft}
                    returnKeyType="search"
                    style={[styles.shopDirectorySearchInput, webSearchInputFocusReset]}
                    value={searchQuery}
                  />
                </View>

                <View style={styles.shopDirectorySortBlock}>
                  <Text style={styles.shopDirectorySortLabel}>{webBrandDirectory.sortLabel}</Text>
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
                            styles.shopDirectoryPillText,
                            sortBy === pill.value ? styles.shopDirectoryPillTextActive : null,
                          ]}
                        >
                          {pill.label}
                        </Text>
                      </MotionPressable>
                    ))}
                    <Text style={styles.shopDirectoryResultsCount}>{resultsLabel}</Text>
                  </View>
                </View>
              </View>

              {visibleBrands.length > 0 ? (
                <View style={[styles.brandDirectoryGrid, { gap: gridMetrics.gap }]}>
                  {visibleBrands.map((store) => (
                    <BrandDirectoryStoreCard
                      cardWidth={gridMetrics.cardWidth}
                      key={store.id}
                      store={store}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.shopDirectoryEmptyState}>
                  <Text style={styles.shopDirectoryEmptyTitle}>{webBrandDirectory.emptyTitle}</Text>
                  <Text style={styles.shopDirectoryEmptyBody}>{webBrandDirectory.emptyBody}</Text>
                </View>
              )}

              <ShopDirectoryPagination
                activePage={activePage}
                onChangePage={setCurrentPage}
                totalPages={totalPages}
              />
            </View>
          </View>
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function BrandDirectoryCategoryAside({
  activeCategory,
  isDesktop,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  isDesktop: boolean;
  onSelectCategory: (category: string) => void;
  width: number;
}) {
  return (
    <View
      style={[
        styles.shopDirectoryCategoryAside,
        isDesktop ? styles.shopDirectoryCategoryAsideDesktop : null,
        { width },
      ]}
    >
      <Text
        style={[
          styles.shopDirectoryCategoryTitle,
          isDesktop ? styles.shopDirectoryCategoryTitleDesktop : null,
        ]}
      >
        {webBrandDirectory.categoryHeading}
      </Text>
      {isDesktop ? <View style={styles.shopDirectoryCategoryDivider} /> : null}
      <ScrollView
        contentContainerStyle={[
          styles.shopDirectoryCategoryList,
          isDesktop ? styles.shopDirectoryCategoryListDesktop : null,
        ]}
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
      >
        {webBrandDirectory.categories.map((category) => {
          const active = activeCategory === category;

          return (
            <MotionPressable
              accessibilityRole="button"
              key={category}
              onPress={() => onSelectCategory(category)}
              pressScale={motion.scale.subtlePress}
              style={[
                styles.shopDirectoryCategoryButton,
                isDesktop ? styles.shopDirectoryCategoryButtonDesktop : null,
                active ? styles.shopDirectoryCategoryButtonActive : null,
              ]}
            >
              <View style={styles.shopDirectoryCategoryIconCell}>
                <SlidersIcon
                  color={active ? colors.white : colors.accent}
                  size={isDesktop ? 18 : 16}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.shopDirectoryCategoryText,
                  active ? styles.shopDirectoryCategoryTextActive : null,
                ]}
              >
                {category}
              </Text>
            </MotionPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function BrandDirectoryStoreCard({
  cardWidth,
  store,
}: {
  cardWidth: number;
  store: BrandDirectoryStore;
}) {
  return (
    <Link asChild href={store.href as never}>
      <MotionPressable
        accessibilityLabel={`${store.brand} ${store.cashback} cashback`}
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([styles.shopDirectoryStoreCard, { width: cardWidth }])}
        testID={`brand-directory-card-${store.id}`}
      >
        <View style={[styles.shopDirectoryLogoTile, { backgroundColor: store.tint }]}>
          <Image
            alt={`${store.brand} logo`}
            accessibilityLabel={`${store.brand} logo`}
            resizeMode="contain"
            source={{ uri: store.logoUri }}
            style={styles.shopDirectoryLogoImage}
          />
          {store.showGrabCoupon ? (
            <View style={styles.shopDirectoryCouponBadge}>
              <Text style={styles.shopDirectoryCouponIcon}>🧧</Text>
              <Text numberOfLines={1} style={styles.shopDirectoryCouponText}>
                {store.label}
              </Text>
            </View>
          ) : null}
          <View accessibilityLabel="Add to favorites" style={styles.shopDirectoryFavoriteButton}>
            <HeartIcon
              color={colors.primaryDark}
              size={16}
              strokeWidth={typography.iconStrokeWidth}
            />
          </View>
        </View>
        <View style={styles.shopDirectoryStoreMeta}>
          <Text numberOfLines={2} style={styles.shopDirectoryStoreName}>
            {store.brand}
          </Text>
          <View style={styles.shopDirectoryCashbackRow}>
            <Text numberOfLines={1} style={styles.shopDirectoryCashbackCaption}>
              Cashback up to
            </Text>
            <Text numberOfLines={1} style={styles.shopDirectoryCashbackValue}>
              {store.cashback}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.shopDirectoryStoreCategory}>
            {store.category}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
}

function ProductDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCashbackMin, setSelectedCashbackMin] =
    useState<WebProductDiscoveryCashbackMin>(0);
  const [sortBy, setSortBy] = useState<WebProductDiscoverySort>("popular");
  const [currentPage, setCurrentPage] = useState(1);
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
  const productResults = useMemo(
    () =>
      getProductDiscoveryResults({
        category: selectedCategory,
        minCashback: selectedCashbackMin,
        query: searchQuery,
        sortBy,
      }),
    [searchQuery, selectedCashbackMin, selectedCategory, sortBy]
  );
  const totalPages = Math.max(1, Math.ceil(productResults.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const visibleProducts = productResults.slice((activePage - 1) * pageSize, activePage * pageSize);
  const resultsLabel = `${productResults.length} ${webProductDiscovery.resultsUnit}`;

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const updateCategory = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };
  const updateCashbackMin = (value: WebProductDiscoveryCashbackMin) => {
    setSelectedCashbackMin(value);
    setCurrentPage(1);
  };
  const openTerms = () => {
    setTermsClosing(false);
    setTermsVisible(true);
  };
  const closeTerms = () => {
    setTermsClosing(true);
    setTimeout(() => {
      setTermsVisible(false);
      setTermsClosing(false);
    }, motion.duration.fast);
  };

  return (
    <View style={styles.viewport}>
      <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
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
            <SearchIcon
              color={colors.primaryDark}
              size={20}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text numberOfLines={1} style={styles.searchText}>
              {webHomeSearchPlaceholder}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.productDiscoveryPage,
            {
              paddingBottom: homeLayout.pageBottomPadding,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.productDiscoveryHeader}>
            <Text
              style={[
                styles.productDiscoveryTitle,
                homeLayout.isDesktop ? styles.productDiscoveryTitleDesktop : null,
              ]}
            >
              {webProductDiscovery.title}
            </Text>
            <Text style={styles.productDiscoverySubtitle}>{webProductDiscovery.subtitle}</Text>
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
                  <SearchIcon
                    color={colors.muted}
                    size={18}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                  <TextInput
                    accessibilityLabel={webProductDiscovery.searchLabel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputMode="search"
                    onChangeText={updateSearchQuery}
                    placeholder={webProductDiscovery.searchPlaceholder}
                    placeholderTextColor={colors.textSoft}
                    returnKeyType="search"
                    style={[styles.productDiscoverySearchInput, webSearchInputFocusReset]}
                    value={searchQuery}
                  />
                </View>

                <View style={styles.productDiscoverySortRow}>
                  <Text style={styles.productDiscoverySortLabel}>
                    {webProductDiscovery.sortLabel}
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
                          styles.productDiscoveryPillText,
                          sortBy === pill.value ? styles.productDiscoveryPillTextActive : null,
                        ]}
                      >
                        {pill.label}
                      </Text>
                    </MotionPressable>
                  ))}
                  <Text style={styles.productDiscoveryResultsCount}>{resultsLabel}</Text>
                </View>
              </View>

              {visibleProducts.length > 0 ? (
                <View
                  style={[
                    styles.productDiscoveryGrid,
                    {
                      gap: gridMetrics.gap,
                    },
                  ]}
                >
                  {visibleProducts.map((product) => (
                    <ProductDiscoveryCard
                      cardWidth={gridMetrics.cardWidth}
                      key={product.id}
                      onOpenTerms={openTerms}
                      product={product}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.productDiscoveryEmptyState}>
                  <Text style={styles.productDiscoveryEmptyTitle}>
                    {webProductDiscovery.emptyTitle}
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
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>

        <ProductDiscoveryTermsDialog
          closing={termsClosing}
          onClose={closeTerms}
          visible={termsVisible}
        />
      </View>
    </View>
  );
}

function ProductDiscoveryMobileFilters({
  activeCashbackMin,
  activeCategory,
  onSelectCashback,
  onSelectCategory,
}: {
  activeCashbackMin: WebProductDiscoveryCashbackMin;
  activeCategory: string;
  onSelectCashback: (cashback: WebProductDiscoveryCashbackMin) => void;
  onSelectCategory: (category: string) => void;
}) {
  return (
    <View style={styles.productDiscoveryMobileFilters}>
      <ScrollView
        contentContainerStyle={styles.productDiscoveryMobileFilterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {webProductDiscovery.categories.map((category) => (
          <MotionPressable
            accessibilityRole="button"
            key={category.value || "all"}
            onPress={() => onSelectCategory(category.value)}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.productDiscoveryPill,
              activeCategory === category.value ? styles.productDiscoveryPillActive : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.productDiscoveryPillText,
                activeCategory === category.value ? styles.productDiscoveryPillTextActive : null,
              ]}
            >
              {category.label}
            </Text>
          </MotionPressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.productDiscoveryMobileFilterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {webProductDiscovery.cashbackFilters.map((filter) => (
          <MotionPressable
            accessibilityRole="button"
            key={filter.value}
            onPress={() => onSelectCashback(filter.value as WebProductDiscoveryCashbackMin)}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.productDiscoveryPill,
              activeCashbackMin === filter.value ? styles.productDiscoveryCashbackPillActive : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.productDiscoveryPillText,
                activeCashbackMin === filter.value
                  ? styles.productDiscoveryCashbackPillTextActive
                  : null,
              ]}
            >
              {filter.label}
            </Text>
          </MotionPressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ProductDiscoverySidebar({
  activeCategory,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  width: number;
}) {
  return (
    <View style={[styles.productDiscoverySidebar, { width }]}>
      <Text style={styles.productDiscoverySidebarTitle}>All Categories</Text>
      <View style={styles.productDiscoverySidebarDivider} />
      <View style={styles.productDiscoverySidebarList}>
        {webProductDiscovery.categories.map((category) => {
          const active = activeCategory === category.value;

          return (
            <MotionPressable
              accessibilityRole="button"
              key={category.value || "all"}
              onPress={() => onSelectCategory(category.value)}
              pressScale={motion.scale.subtlePress}
              style={[
                styles.productDiscoverySidebarButton,
                active ? styles.productDiscoverySidebarButtonActive : null,
              ]}
            >
              <View style={styles.productDiscoverySidebarIconCell}>
                <SlidersIcon
                  color={active ? colors.white : colors.accent}
                  size={18}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.productDiscoverySidebarText,
                  active ? styles.productDiscoverySidebarTextActive : null,
                ]}
              >
                {category.label}
              </Text>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

function ProductDiscoveryCard({
  cardWidth,
  onOpenTerms,
  product,
}: {
  cardWidth: number;
  onOpenTerms: () => void;
  product: WebProductDiscoveryProduct;
}) {
  const imageSource = productImageAssets[product.imageAsset] ?? homeBannerImage;

  return (
    <View style={[styles.productDiscoveryCard, { width: cardWidth }]}>
      <View style={[styles.productDiscoveryImageFrame, { backgroundColor: product.tint }]}>
        <Image
          alt={`${product.title} product image`}
          accessibilityLabel={`${product.title} product image`}
          resizeMode="cover"
          source={imageSource}
          style={styles.productDiscoveryImage}
        />
        {product.discountPercent > 0 ? (
          <View style={styles.productDiscoveryDiscountBadge}>
            <Text style={styles.productDiscoveryDiscountText}>-{product.discountPercent}%</Text>
          </View>
        ) : null}
        <View style={styles.productDiscoveryFavoriteButton}>
          <HeartIcon
            color={colors.primaryDark}
            size={16}
            strokeWidth={typography.iconStrokeWidth}
          />
        </View>
      </View>

      <View style={styles.productDiscoveryCardBody}>
        <Text numberOfLines={2} style={styles.productDiscoveryCardTitle}>
          {product.title}
        </Text>
        <View style={styles.productDiscoveryPriceRow}>
          <Text numberOfLines={1} style={styles.productDiscoveryPriceHint}>
            {webProductDiscovery.priceHint}
          </Text>
          <View style={styles.productDiscoveryPriceStack}>
            <Text numberOfLines={1} style={styles.productDiscoveryOriginalPrice}>
              {product.originalPriceLabel}
            </Text>
            <Text numberOfLines={1} style={styles.productDiscoveryPrice}>
              {product.priceLabel}
            </Text>
          </View>
        </View>
        <Link asChild href={product.href as never}>
          <MotionPressable
            accessibilityRole="link"
            pressScale={motion.scale.subtlePress}
            style={StyleSheet.flatten([styles.productDiscoveryShopNowButton])}
          >
            <Text style={styles.productDiscoveryShopNowText}>{product.shopNowLabel}</Text>
            <ArrowRightIcon
              color={colors.white}
              size={16}
              strokeWidth={typography.iconStrokeWidth}
            />
          </MotionPressable>
        </Link>
        <MotionPressable
          accessibilityRole="button"
          onPress={onOpenTerms}
          pressScale={motion.scale.subtlePress}
          style={styles.productDiscoveryTermsButton}
        >
          <Text style={styles.productDiscoveryTermsText}>{webProductDiscovery.termsLabel}</Text>
        </MotionPressable>
      </View>
    </View>
  );
}

function ProductDiscoveryTermsDialog({
  closing,
  onClose,
  visible,
}: {
  closing: boolean;
  onClose: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.productDiscoveryTermsLayer}>
      <MotionPressable
        accessibilityLabel="Close terms dialog"
        accessibilityRole="button"
        onPress={onClose}
        pressScale={1}
        style={[
          styles.productDiscoveryTermsBackdrop,
          productDiscoveryDialogTransition,
          closing ? styles.productDiscoveryTermsBackdropClosing : null,
        ]}
      />
      <View
        style={[
          styles.productDiscoveryTermsCard,
          productDiscoveryDialogTransition,
          closing ? styles.productDiscoveryTermsCardClosing : null,
        ]}
      >
        <Text style={styles.productDiscoveryTermsTitle}>{webProductDiscovery.termsTitle}</Text>
        <Text style={styles.productDiscoveryTermsBody}>{webProductDiscovery.termsBody}</Text>
        <MotionPressable
          accessibilityRole="button"
          onPress={onClose}
          pressScale={motion.scale.subtlePress}
          style={styles.productDiscoveryTermsCloseButton}
        >
          <Text style={styles.productDiscoveryTermsCloseText}>Close</Text>
        </MotionPressable>
      </View>
    </View>
  );
}

function ShopDirectoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedShopType, setSelectedShopType] = useState<WebShopType>("all");
  const [sortBy, setSortBy] = useState<WebShopDirectorySort>("highest_cashback");
  const [currentPage, setCurrentPage] = useState(1);
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
  const shopResults = useMemo(
    () =>
      getShopDirectoryResults({
        category: selectedCategory,
        query: searchQuery,
        shopType: selectedShopType,
        sortBy,
      }),
    [searchQuery, selectedCategory, selectedShopType, sortBy]
  );
  const totalPages = Math.max(1, Math.ceil(shopResults.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const visibleStores = shopResults.slice((activePage - 1) * pageSize, activePage * pageSize);
  const resultsLabel = `${shopResults.length} ${webShopDirectory.resultsUnit}`;

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const updateCategory = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };
  const updateShopType = (value: WebShopType) => {
    setSelectedShopType(value);
    setCurrentPage(1);
  };

  return (
    <View style={styles.viewport}>
      <View style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}>
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
            <SearchIcon
              color={colors.primaryDark}
              size={20}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text numberOfLines={1} style={styles.searchText}>
              {webHomeSearchPlaceholder}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.shopDirectoryPage,
            {
              paddingBottom: homeLayout.pageBottomPadding,
              paddingHorizontal: homeLayout.contentHorizontalPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
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
                {webShopDirectory.title}
              </Text>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={styles.shopDirectoryTitleIcon}
              >
                {webShopDirectory.titleIcon}
              </Text>
            </View>
            <Text style={styles.shopDirectorySubtitle}>{webShopDirectory.subtitle}</Text>
            <View style={styles.shopDirectoryNotice}>
              <ClockIcon
                color={colors.primaryDark}
                size={18}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text style={styles.shopDirectoryNoticeText}>{webShopDirectory.trackingNotice}</Text>
            </View>
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
              isDesktop={homeLayout.isDesktop}
              onSelectCategory={updateCategory}
              width={sidebarWidth}
            />

            <View style={[styles.shopDirectoryMain, { width: gridContentWidth }]}>
              <View style={styles.shopDirectoryFilterPanel}>
                <View style={styles.shopDirectorySearchBox}>
                  <SearchIcon
                    color={colors.muted}
                    size={18}
                    strokeWidth={typography.iconStrokeWidth}
                  />
                  <TextInput
                    accessibilityLabel={webShopDirectory.searchLabel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputMode="search"
                    onChangeText={updateSearchQuery}
                    placeholder={webShopDirectory.searchPlaceholder}
                    placeholderTextColor={colors.textSoft}
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
                          selectedShopType === pill.value
                            ? styles.shopDirectoryPillTextActive
                            : null,
                        ]}
                      >
                        {pill.label}
                      </Text>
                    </MotionPressable>
                  ))}
                </ScrollView>

                <View style={styles.shopDirectorySortBlock}>
                  <Text style={styles.shopDirectorySortLabel}>{webShopDirectory.sortLabel}</Text>
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
                            styles.shopDirectoryPillText,
                            sortBy === pill.value ? styles.shopDirectoryPillTextActive : null,
                          ]}
                        >
                          {pill.label}
                        </Text>
                      </MotionPressable>
                    ))}
                    <Text style={styles.shopDirectoryResultsCount}>{resultsLabel}</Text>
                  </View>
                </View>
              </View>

              {visibleStores.length > 0 ? (
                <View
                  style={[
                    styles.shopDirectoryGrid,
                    {
                      gap: gridMetrics.gap,
                    },
                  ]}
                >
                  {visibleStores.map((store) => (
                    <ShopDirectoryStoreCard
                      cardWidth={gridMetrics.cardWidth}
                      key={store.id}
                      store={store}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.shopDirectoryEmptyState}>
                  <Text style={styles.shopDirectoryEmptyTitle}>{webShopDirectory.emptyTitle}</Text>
                  <Text style={styles.shopDirectoryEmptyBody}>{webShopDirectory.emptyBody}</Text>
                </View>
              )}

              <ShopDirectoryPagination
                activePage={activePage}
                onChangePage={setCurrentPage}
                totalPages={totalPages}
              />
            </View>
          </View>
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function ShopDirectoryPromo({
  contentWidth,
  isDesktop,
  promo = webShopDirectory.promo,
}: {
  contentWidth: number;
  isDesktop: boolean;
  promo?: DirectoryPromo;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideGap = 24;
  const slideWidth = isDesktop ? Math.min(800, contentWidth) : Math.min(800, contentWidth * 0.85);
  const slideHeight = slideWidth / promo.aspectRatio;
  const promoImage = shopDirectoryImageAssets[promo.imageAsset] ?? shopPromoGogoQuestImage;

  return (
    <View style={styles.shopDirectoryPromo}>
      <View style={styles.shopDirectoryPromoTitleFrame}>
        <Text
          style={[
            styles.shopDirectoryPromoTitle,
            isDesktop ? styles.shopDirectoryPromoTitleDesktop : null,
          ]}
        >
          {promo.title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ gap: slideGap, paddingRight: slideGap }}
        horizontal
        onScroll={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / Math.max(1, slideWidth + slideGap)
          );
          setActiveIndex(Math.max(0, Math.min(promo.slideCount - 1, nextIndex)));
        }}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      >
        {Array.from({ length: promo.slideCount }).map((_, index) => (
          <View
            key={`shop-promo-${index}`}
            style={[
              styles.shopDirectoryPromoSlide,
              {
                height: slideHeight,
                width: slideWidth,
              },
            ]}
          >
            <Image
              alt={promo.title}
              accessibilityLabel={promo.title}
              resizeMode="cover"
              source={promoImage}
              style={styles.shopDirectoryPromoImage}
            />
            <View style={styles.shopDirectoryPromoVignette} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.shopDirectoryPromoDots}>
        {Array.from({ length: promo.slideCount }).map((_, index) => (
          <View
            key={`shop-promo-dot-${index}`}
            style={[
              styles.shopDirectoryPromoDot,
              activeIndex === index ? styles.shopDirectoryPromoDotActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ShopDirectoryCategoryAside({
  activeCategory,
  isDesktop,
  onSelectCategory,
  width,
}: {
  activeCategory: string;
  isDesktop: boolean;
  onSelectCategory: (category: string) => void;
  width: number;
}) {
  return (
    <View
      style={[
        styles.shopDirectoryCategoryAside,
        isDesktop ? styles.shopDirectoryCategoryAsideDesktop : null,
        { width },
      ]}
    >
      <Text
        style={[
          styles.shopDirectoryCategoryTitle,
          isDesktop ? styles.shopDirectoryCategoryTitleDesktop : null,
        ]}
      >
        {webShopDirectory.categoryHeading}
      </Text>
      {isDesktop ? <View style={styles.shopDirectoryCategoryDivider} /> : null}
      <ScrollView
        contentContainerStyle={[
          styles.shopDirectoryCategoryList,
          isDesktop ? styles.shopDirectoryCategoryListDesktop : null,
        ]}
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
      >
        {webShopDirectory.categories.map((category) => {
          const active = activeCategory === category;

          return (
            <MotionPressable
              accessibilityRole="button"
              key={category}
              onPress={() => onSelectCategory(category)}
              pressScale={motion.scale.subtlePress}
              style={[
                styles.shopDirectoryCategoryButton,
                isDesktop ? styles.shopDirectoryCategoryButtonDesktop : null,
                active ? styles.shopDirectoryCategoryButtonActive : null,
              ]}
            >
              <View style={styles.shopDirectoryCategoryIconCell}>
                <SlidersIcon
                  color={active ? colors.white : colors.accent}
                  size={isDesktop ? 18 : 16}
                  strokeWidth={typography.iconStrokeWidth}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.shopDirectoryCategoryText,
                  active ? styles.shopDirectoryCategoryTextActive : null,
                ]}
              >
                {category}
              </Text>
            </MotionPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ShopDirectoryStoreCard({
  cardWidth,
  store,
}: {
  cardWidth: number;
  store: ShopDirectoryStore;
}) {
  return (
    <Link asChild href={store.href as never}>
      <MotionPressable
        accessibilityLabel={`${store.brand} ${store.cashback} cashback`}
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([styles.shopDirectoryStoreCard, { width: cardWidth }])}
      >
        <View style={[styles.shopDirectoryLogoTile, { backgroundColor: store.tint }]}>
          <Image
            alt={`${store.brand} logo`}
            accessibilityLabel={`${store.brand} logo`}
            resizeMode="contain"
            source={{ uri: store.logoUri }}
            style={styles.shopDirectoryLogoImage}
          />
          {store.showGrabCoupon ? (
            <View style={styles.shopDirectoryCouponBadge}>
              <Text style={styles.shopDirectoryCouponIcon}>🧧</Text>
              <Text numberOfLines={1} style={styles.shopDirectoryCouponText}>
                {store.label}
              </Text>
            </View>
          ) : null}
          <View style={styles.shopDirectoryFavoriteButton}>
            <HeartIcon
              color={colors.primaryDark}
              size={16}
              strokeWidth={typography.iconStrokeWidth}
            />
          </View>
        </View>
        <View style={styles.shopDirectoryStoreMeta}>
          <Text numberOfLines={2} style={styles.shopDirectoryStoreName}>
            {store.brand}
          </Text>
          <View style={styles.shopDirectoryCashbackRow}>
            <Text numberOfLines={1} style={styles.shopDirectoryCashbackCaption}>
              Cashback up to
            </Text>
            <Text numberOfLines={1} style={styles.shopDirectoryCashbackValue}>
              {store.cashback}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.shopDirectoryStoreCategory}>
            {store.category} · {getShopTypeLabel(store.shopType)}
          </Text>
        </View>
      </MotionPressable>
    </Link>
  );
}

function ShopDirectoryPagination({
  activePage,
  onChangePage,
  totalPages,
}: {
  activePage: number;
  onChangePage: (page: number) => void;
  totalPages: number;
}) {
  const pages = Array.from({ length: totalPages }).map((_, index) => index + 1);

  return (
    <View style={styles.shopDirectoryPagination}>
      <MotionPressable
        accessibilityLabel="Previous page"
        accessibilityRole="button"
        disabled={activePage <= 1}
        onPress={() => onChangePage(Math.max(1, activePage - 1))}
        pressScale={motion.scale.subtlePress}
        style={[
          styles.shopDirectoryPageButton,
          activePage <= 1 ? styles.shopDirectoryPageButtonDisabled : null,
        ]}
      >
        <ChevronLeftIcon
          color={activePage <= 1 ? colors.textSoft : colors.ink}
          size={16}
          strokeWidth={typography.iconStrokeWidth}
        />
      </MotionPressable>
      {pages.map((page) => (
        <MotionPressable
          accessibilityRole="button"
          key={page}
          onPress={() => onChangePage(page)}
          pressScale={motion.scale.subtlePress}
          style={[
            styles.shopDirectoryPageButton,
            activePage === page ? styles.shopDirectoryPageButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.shopDirectoryPageButtonText,
              activePage === page ? styles.shopDirectoryPageButtonTextActive : null,
            ]}
          >
            {page}
          </Text>
        </MotionPressable>
      ))}
      <MotionPressable
        accessibilityLabel="Next page"
        accessibilityRole="button"
        disabled={activePage >= totalPages}
        onPress={() => onChangePage(Math.min(totalPages, activePage + 1))}
        pressScale={motion.scale.subtlePress}
        style={[
          styles.shopDirectoryPageButton,
          activePage >= totalPages ? styles.shopDirectoryPageButtonDisabled : null,
        ]}
      >
        <ChevronRightIcon
          color={activePage >= totalPages ? colors.textSoft : colors.ink}
          size={16}
          strokeWidth={typography.iconStrokeWidth}
        />
      </MotionPressable>
    </View>
  );
}

function getShopTypeLabel(shopType: string) {
  return (
    webShopDirectory.shopTypePills.find((pill) => pill.value === shopType)?.label ?? "Standard"
  );
}

function CategoryDirectoryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const showBottomNav = !homeLayout.isDesktop;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const matchingCategories = useMemo(() => getCategoryDirectoryMatches(searchQuery), [searchQuery]);
  const categoryPage = useMemo(
    () => getCategoryDirectoryPage(searchQuery, currentPage),
    [currentPage, searchQuery]
  );
  const categories = categoryPage.cards;
  const gridMetrics = getCategoryDirectoryGridMetrics({
    contentWidth: homeLayout.contentWidth,
    viewportWidth: width,
  });
  const availableLabel = searchQuery.trim().length > 0
    ? getCategoryDirectoryCountLabel(matchingCategories.length)
    : webCategoryDirectory.countLabel;
  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

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
          showsVerticalScrollIndicator={false}
        >
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
                  {webCategoryDirectory.title}
                </Text>
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={styles.categoryDirectoryTitleIcon}
                >
                  {webCategoryDirectory.titleIcon}
                </Text>
              </View>
              <Text style={styles.categoryDirectoryCount}>{availableLabel}</Text>
            </View>

            <View
              style={[
                styles.categorySearchPanel,
                homeLayout.isDesktop ? styles.categorySearchPanelDesktop : null,
              ]}
            >
              <View style={styles.categorySearchBox}>
                <TextInput
                  accessibilityLabel={webCategoryDirectory.searchPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="search"
                  onChangeText={updateSearchQuery}
                  placeholder={webCategoryDirectory.searchPlaceholder}
                  placeholderTextColor={colors.textSoft}
                  returnKeyType="search"
                  style={[styles.categorySearchInput, webSearchInputFocusReset]}
                  value={searchQuery}
                />
                <SearchIcon
                  color={colors.muted}
                  size={24}
                  strokeWidth={typography.iconStrokeWidth}
                />
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
              <Text style={styles.categoryDirectoryEmptyTitle}>
                {webCategoryDirectory.emptyTitle}
              </Text>
              <Text style={styles.categoryDirectoryEmptyBody}>
                {webCategoryDirectory.emptyBody}
              </Text>
            </View>
          )}

          <CategoryDirectoryPagination
            activePage={categoryPage.activePage}
            onChangePage={setCurrentPage}
            totalPages={categoryPage.totalPages}
          />
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

function CategoryDirectoryCard({
  cardWidth,
  category,
  index,
  isDesktop,
}: {
  cardWidth: number;
  category: CategoryDirectoryItem;
  index: number;
  isDesktop: boolean;
}) {
  const imageSource = categoryDirectoryImageAssets[category.imageAsset] ?? homeBannerImage;

  return (
    <Link asChild href={category.href as never}>
      <MotionPressable
        accessibilityLabel={`${category.title} ${webCategoryDirectory.cardCta}`}
        accessibilityRole="link"
        pressScale={motion.scale.subtlePress}
        style={StyleSheet.flatten([
          styles.categoryDirectoryCard,
          {
            width: cardWidth,
          },
          isDesktop ? styles.categoryDirectoryCardDesktop : null,
        ])}
        testID={`category-directory-card-${index}`}
      >
        <View style={styles.categoryDirectoryImageFrame}>
          <Image
            alt={`${category.title} category image`}
            accessibilityLabel={`${category.title} category image`}
            resizeMode="cover"
            source={imageSource}
            style={styles.categoryDirectoryImage}
          />
          <View style={styles.categoryDirectoryBadge}>
            <Text style={styles.categoryDirectoryBadgeText}>{webCategoryDirectory.cardEyebrow}</Text>
          </View>
        </View>

        <View style={styles.categoryDirectoryCardBody}>
          <Text
            numberOfLines={2}
            style={[
              styles.categoryDirectoryCardTitle,
              isDesktop ? styles.categoryDirectoryCardTitleDesktop : null,
            ]}
          >
            {category.title}
          </Text>
          <View style={styles.categoryDirectoryCardFooter}>
            <Text style={styles.categoryDirectoryCardCta}>
              {webCategoryDirectory.cardCta}
            </Text>
            <View style={styles.categoryDirectoryArrowCircle}>
              <ArrowRightIcon
                color={colors.primaryDark}
                size={16}
                strokeWidth={typography.iconStrokeWidth}
                style={styles.categoryDirectoryArrowIcon}
              />
            </View>
          </View>
        </View>
      </MotionPressable>
    </Link>
  );
}

function CategoryDirectoryPagination({
  activePage,
  onChangePage,
  totalPages,
}: {
  activePage: number;
  onChangePage: (page: number) => void;
  totalPages: number;
}) {
  return (
    <View style={styles.categoryDirectoryPagination}>
      <ShopDirectoryPagination
        activePage={activePage}
        onChangePage={onChangePage}
        totalPages={totalPages}
      />
    </View>
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
    maxWidth: mobileShellLayout.contentMaxWidth,
    position: "relative",
    width: "100%",
  },
  stickySearch: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    boxShadow: shadows.cardCss,
  },
  searchText: {
    color: colors.textSoft,
    fontFamily: typography.family,
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
  },
  page: {
    gap: spacing.homeStackGap,
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  desktopFooter: {
    marginTop: 64,
  },
  productDiscoveryPage: {
    gap: spacing.xl,
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  productDiscoveryHeader: {
    gap: spacing.sm,
    maxWidth: 672,
  },
  productDiscoveryTitle: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  productDiscoveryTitleDesktop: {
    fontSize: 40,
    lineHeight: 48,
  },
  productDiscoverySubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  productDiscoveryLayout: {
    width: "100%",
  },
  productDiscoveryLayoutDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  productDiscoveryMain: {
    gap: spacing.lg,
    minWidth: 0,
  },
  productDiscoveryMobileFilters: {
    gap: spacing.sm,
  },
  productDiscoveryMobileFilterRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  productDiscoverySidebar: {
    backgroundColor: "#FAFAFA",
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexShrink: 0,
    gap: spacing.md,
    padding: 24,
  },
  productDiscoverySidebarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28,
  },
  productDiscoverySidebarDivider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  productDiscoverySidebarList: {
    gap: spacing.sm,
  },
  productDiscoverySidebarButton: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    padding: 16,
    width: "100%",
  },
  productDiscoverySidebarButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  productDiscoverySidebarIconCell: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  productDiscoverySidebarText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    lineHeight: 20,
  },
  productDiscoverySidebarTextActive: {
    color: colors.white,
    fontWeight: "500",
  },
  productDiscoveryFilterPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    boxShadow: shadows.cardCss,
  },
  productDiscoverySearchBox: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  productDiscoverySearchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    minWidth: 0,
  },
  productDiscoverySortRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  productDiscoverySortLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    marginRight: spacing.xs,
  },
  productDiscoveryPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  productDiscoveryPillActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  productDiscoveryCashbackPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryDark,
  },
  productDiscoveryPillText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  productDiscoveryPillTextActive: {
    color: colors.white,
  },
  productDiscoveryCashbackPillTextActive: {
    color: colors.primaryDark,
  },
  productDiscoveryResultsCount: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: typography.bodyWeight,
    marginLeft: "auto",
  },
  productDiscoveryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  productDiscoveryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.sm,
    boxShadow: shadows.cardCss,
  },
  productDiscoveryImageFrame: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  productDiscoveryImage: {
    height: "100%",
    width: "100%",
  },
  productDiscoveryDiscountBadge: {
    backgroundColor: colors.danger,
    borderRadius: radii.chip,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    position: "absolute",
    top: spacing.sm,
    boxShadow: shadows.cardCss,
  },
  productDiscoveryDiscountText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
  },
  productDiscoveryFavoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 32,
    boxShadow: shadows.cardCss,
  },
  productDiscoveryCardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  productDiscoveryCardTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    minHeight: 40,
  },
  productDiscoveryPriceRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  productDiscoveryPriceHint: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 13,
    textTransform: "uppercase",
  },
  productDiscoveryPriceStack: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 3,
  },
  productDiscoveryOriginalPrice: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 13,
    textDecorationLine: "line-through",
  },
  productDiscoveryPrice: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  productDiscoveryShopNowButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  productDiscoveryShopNowText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
  },
  productDiscoveryTermsButton: {
    alignItems: "center",
    minHeight: 24,
    justifyContent: "center",
  },
  productDiscoveryTermsText: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 11,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  productDiscoveryEmptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
  },
  productDiscoveryEmptyTitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    textAlign: "center",
  },
  productDiscoveryTermsLayer: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  productDiscoveryTermsBackdrop: {
    backgroundColor: "rgba(16,34,23,0.42)",
    bottom: 0,
    left: 0,
    opacity: 1,
    position: "absolute",
    right: 0,
    top: 0,
  },
  productDiscoveryTermsBackdropClosing: {
    opacity: 0,
  },
  productDiscoveryTermsCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 520,
    padding: spacing.lg,
    transform: [{ translateY: 0 }],
    width: "100%",
    boxShadow: shadows.cardCss,
  },
  productDiscoveryTermsCardClosing: {
    opacity: 0,
    transform: [{ translateY: 16 }],
  },
  productDiscoveryTermsTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "800",
  },
  productDiscoveryTermsBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
  productDiscoveryTermsCloseButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  productDiscoveryTermsCloseText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
  },
  shopDirectoryPage: {
    gap: 28,
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  shopDirectoryPromo: {
    gap: spacing.lg,
    width: "100%",
  },
  shopDirectoryPromoTitleFrame: {
    justifyContent: "center",
    minHeight: 56,
  },
  shopDirectoryPromoTitle: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
  },
  shopDirectoryPromoTitleDesktop: {
    fontSize: 40,
    lineHeight: 48,
  },
  shopDirectoryPromoSlide: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  shopDirectoryPromoImage: {
    height: "100%",
    width: "100%",
  },
  shopDirectoryPromoVignette: {
    backgroundColor: "rgba(0,0,0,0.04)",
    bottom: 0,
    left: 0,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: 0,
  },
  shopDirectoryPromoDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 12,
  },
  shopDirectoryPromoDot: {
    backgroundColor: "#D4D9D5",
    borderRadius: radii.chip,
    height: 8,
    width: 8,
  },
  shopDirectoryPromoDotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
  shopDirectoryHeader: {
    gap: spacing.md,
    maxWidth: 672,
  },
  shopDirectoryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  shopDirectoryTitle: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  shopDirectoryTitleDesktop: {
    fontSize: 40,
    lineHeight: 48,
  },
  shopDirectoryTitleIcon: {
    fontSize: 24,
    lineHeight: 32,
  },
  shopDirectorySubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  shopDirectoryNotice: {
    alignItems: "flex-start",
    backgroundColor: "#FAFAFA",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 672,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shopDirectoryNoticeText: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: typography.bodyWeight,
    lineHeight: 18,
  },
  shopDirectoryLayout: {
    width: "100%",
  },
  shopDirectoryLayoutDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  shopDirectoryCategoryAside: {
    flexShrink: 0,
    gap: spacing.md,
  },
  shopDirectoryCategoryAsideDesktop: {
    backgroundColor: "#FAFAFA",
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  shopDirectoryCategoryTitle: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 24,
  },
  shopDirectoryCategoryTitleDesktop: {
    color: colors.accent,
    fontSize: 24,
    lineHeight: 28,
  },
  shopDirectoryCategoryDivider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  shopDirectoryCategoryList: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  shopDirectoryCategoryListDesktop: {
    borderBottomWidth: 0,
    flexDirection: "column",
    paddingBottom: 0,
  },
  shopDirectoryCategoryButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  shopDirectoryCategoryButtonDesktop: {
    borderRadius: 16,
    gap: spacing.md,
    minHeight: 52,
    padding: 16,
    width: "100%",
  },
  shopDirectoryCategoryButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  shopDirectoryCategoryIconCell: {
    alignItems: "center",
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  shopDirectoryCategoryText: {
    color: "#3B3B3B",
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 18,
  },
  shopDirectoryCategoryTextActive: {
    color: colors.white,
    fontWeight: "500",
  },
  shopDirectoryMain: {
    gap: spacing.lg,
    minWidth: 0,
  },
  shopDirectoryFilterPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    boxShadow: shadows.cardCss,
  },
  shopDirectorySearchBox: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  shopDirectorySearchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    minWidth: 0,
  },
  shopDirectoryPillRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  shopDirectoryPill: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  shopDirectoryPillActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  shopDirectoryPillText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  shopDirectoryPillTextActive: {
    color: colors.white,
  },
  shopDirectorySortBlock: {
    gap: spacing.sm,
  },
  shopDirectorySortLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  shopDirectorySortRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  shopDirectoryResultsCount: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: typography.bodyWeight,
    marginLeft: "auto",
  },
  shopDirectoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  brandDirectoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  shopDirectoryStoreCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.sm,
    boxShadow: shadows.cardCss,
  },
  shopDirectoryLogoTile: {
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  shopDirectoryLogoImage: {
    height: "100%",
    padding: spacing.md,
    width: "100%",
  },
  shopDirectoryCouponBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    left: 6,
    maxWidth: "82%",
    minHeight: 20,
    paddingHorizontal: 6,
    position: "absolute",
    top: 6,
    boxShadow: shadows.cardCss,
  },
  shopDirectoryCouponIcon: {
    fontSize: 11,
    lineHeight: 14,
  },
  shopDirectoryCouponText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: typography.bodyWeight,
    lineHeight: 12,
  },
  shopDirectoryFavoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radii.chip,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    boxShadow: shadows.cardCss,
  },
  shopDirectoryStoreMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  shopDirectoryStoreName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    minHeight: 38,
  },
  shopDirectoryCashbackRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    minHeight: 23,
  },
  shopDirectoryCashbackCaption: {
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: typography.bodyWeight,
    lineHeight: 14,
  },
  shopDirectoryCashbackValue: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
  },
  shopDirectoryStoreCategory: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: typography.bodyWeight,
    lineHeight: 14,
  },
  shopDirectoryEmptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  shopDirectoryEmptyTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
  },
  shopDirectoryEmptyBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
  shopDirectoryPagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  shopDirectoryPageButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    minWidth: 32,
    paddingHorizontal: spacing.sm,
  },
  shopDirectoryPageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shopDirectoryPageButtonDisabled: {
    opacity: 0.45,
  },
  shopDirectoryPageButtonText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
  },
  shopDirectoryPageButtonTextActive: {
    color: colors.white,
  },
  categoryDirectoryPage: {
    gap: spacing.lg,
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  categoryDirectoryHeader: {
    gap: spacing.md,
  },
  categoryDirectoryHeaderDesktop: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryDirectoryTitleBlock: {
    gap: 22,
  },
  categoryDirectoryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    minWidth: 0,
  },
  categoryDirectoryTitle: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: 26.4,
    fontWeight: "800",
    lineHeight: 30,
  },
  categoryDirectoryTitleDesktop: {
    fontSize: 40,
    lineHeight: 48,
  },
  categoryDirectoryTitleIcon: {
    fontSize: 32,
    lineHeight: 34,
    transform: [{ rotate: "-5deg" }],
  },
  categoryDirectoryCount: {
    color: "#5B6B61",
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 26,
  },
  categorySearchPanel: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.borderStrong,
    borderRadius: 26,
    borderWidth: 1,
    boxShadow: "0 18px 48px rgba(16, 34, 23, 0.08)",
    padding: 16,
    width: "100%",
  },
  categorySearchPanelDesktop: {
    maxWidth: 384,
  },
  categorySearchBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: colors.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  categorySearchInput: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    minWidth: 0,
  },
  categoryDirectoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryDirectoryCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.borderStrong,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 16px 40px rgba(16, 34, 23, 0.08)",
    overflow: "hidden",
    padding: 12,
  },
  categoryDirectoryCardDesktop: {
    padding: 14,
  },
  categoryDirectoryImageFrame: {
    aspectRatio: 1.08,
    backgroundColor: "#F8FBF5",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  categoryDirectoryImage: {
    height: "100%",
    width: "100%",
  },
  categoryDirectoryBadge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: colors.borderStrong,
    borderRadius: radii.chip,
    borderWidth: 1,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    top: spacing.md,
  },
  categoryDirectoryBadgeText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  categoryDirectoryCardBody: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
  },
  categoryDirectoryCardTitle: {
    color: "#102217",
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    minHeight: 24,
  },
  categoryDirectoryCardTitleDesktop: {
    fontSize: 17,
    lineHeight: 24,
  },
  categoryDirectoryCardFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: "auto",
  },
  categoryDirectoryCardCta: {
    color: "#5B6B61",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  categoryDirectoryArrowCircle: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  categoryDirectoryArrowIcon: {
    transform: [{ rotate: "-45deg" }],
  },
  categoryDirectoryEmptyState: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.borderStrong,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  categoryDirectoryEmptyTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
  },
  categoryDirectoryEmptyBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
  categoryDirectoryPagination: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.borderStrong,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    boxShadow: "0 18px 48px rgba(16, 34, 23, 0.08)",
  },
  hero: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    boxShadow: shadows.cardCss,
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: typography.headline,
    fontWeight: "700",
  },
  body: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "800",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  primaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: "700",
  },
  shortcutRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  shortcutPill: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  shortcutText: {
    color: colors.ink,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: "700",
  },
  sectionAction: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  cardRow: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  offerCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 148,
    padding: spacing.md,
    width: 168,
  },
  cardCategory: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  cardTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: typography.body,
    fontWeight: "800",
  },
  cashbackPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cashbackText: {
    color: colors.accent,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  cardAction: {
    color: colors.primaryDark,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  discoverSection: {
    gap: spacing.lg,
  },
  discoverHeader: {
    gap: spacing.xs,
  },
  discoverTitle: {
    color: "#103522",
    fontFamily: typography.family,
    fontSize: typography.sectionTitle,
    fontWeight: typography.sectionTitleWeight,
    lineHeight: 34,
  },
  discoverSubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  discoverLayout: {
    gap: spacing.lg,
    width: "100%",
  },
  discoverLayoutDesktop: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  discoverSidebar: {
    backgroundColor: "#FAFAFA",
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  discoverSidebarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
    lineHeight: 24,
  },
  discoverDivider: {
    backgroundColor: colors.border,
    height: 1,
    width: "100%",
  },
  discoverCategoryList: {
    gap: spacing.sm,
  },
  discoverCategoryButton: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    padding: spacing.md,
  },
  discoverCategoryButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  discoverCategoryText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
  },
  discoverCategoryTextActive: {
    color: colors.white,
    fontWeight: "500",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  productCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 10,
    paddingBottom: 14,
    boxShadow: shadows.cardCss,
  },
  productImageFrame: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  productImage: {
    height: "100%",
    width: "100%",
  },
  productFavoriteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 32,
    boxShadow: shadows.cardCss,
  },
  productBody: {
    flex: 1,
    gap: spacing.sm,
    minHeight: 0,
  },
  productTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    minHeight: 40,
  },
  productTitleDesktop: {
    fontSize: 15,
    lineHeight: 21,
  },
  productPriceRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  productPriceLabel: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  productPrice: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  productPriceDesktop: {
    fontSize: 24,
    lineHeight: 26,
  },
  productShopButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: "auto",
    minHeight: 40,
  },
  productShopButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  productTermsText: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 11,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
