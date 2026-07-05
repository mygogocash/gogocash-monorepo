import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Heart as HeartIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mobile/theme/icons";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import type { OfferListResponse } from "@mobile/api/catalogTypes";
import { useCopy } from "@mobile/i18n/useCopy";
import { useFavoriteBrands } from "@mobile/account/FavoriteBrandsProvider";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { mobileShellLayout, webFavoriteBrandsPage } from "@mobile/design/webDesignParity";
import {
  DirectoryVirtualizedGrid,
} from "@mobile/screens/discovery/directoryVirtualizedGrid";
import {
  getFavoriteBrandCardHeight,
  getFavoriteBrandGridMetrics,
} from "@mobile/screens/favoriteBrandGrid";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import favoriteHeroBagImage from "../../assets/favorite-hero-bag.png";
import favoriteHeroLogoImage from "../../assets/favorite-hero-logo.png";

// One row shape for both sources: the static fixture rows and the live catalog
// rows mapped from GET /offer (which add an optional logo URL + derived tint).
type FavoriteBrand = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly cashback: string;
  readonly href: string;
  readonly showGrabCoupon?: boolean;
  readonly logo?: string;
  readonly tint?: string;
};

// The favorite fixture ships no per-brand color/logo (and webDesignParity.ts is parallel-owned), so the
// new-card visual uses a locally-derived brand tint + a brand monogram. The heart toggle manages a local
// saved set (two brands pre-saved) so the Favorites section + empty state are demonstrable.
const FAVORITE_BRAND_TINTS: Record<string, string> = {
  "brand-grocery-galaxy-1001": "#2E7D5B",
  "brand-pocket-pantry-1002": "#C2410C",
  "brand-orbit-airways-1003": "#1D4ED8",
  "brand-glow-theory-1005": "#7C3AED",
};
const FAVORITE_BRAND_FALLBACK_TINT = "#2E7D5B";

export function CustomerFavoriteBrandsScreen() {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const { favoriteIds, toggleFavorite } = useFavoriteBrands();

  // Fixtures mode (default) renders the parity rows synchronously; backend mode
  // pulls the live public catalog (GET /offer) and maps it into the same row shape —
  // mirroring the web favorite page, which reads the same list.
  const catalogResource = useCustomerAccountResource<readonly FavoriteBrand[], OfferListResponse>({
    fixtureData: webFavoriteBrandsPage.recentBrands,
    resourceId: "catalog",
  });
  const brands: readonly FavoriteBrand[] = isOfferListResponse(catalogResource.data)
    ? mapOffersToCatalogBrands(catalogResource.data)
    : Array.isArray(catalogResource.data)
      ? catalogResource.data
      : webFavoriteBrandsPage.recentBrands;

  return (
    <FavoriteBrandsSubPage>
      <View style={styles.favoriteShell}>
        {isDesktop ? null : <FavoriteBrandsTopBar />}
        <View style={styles.content}>
          <Text style={styles.pageTitle}>{tc(webFavoriteBrandsPage.title)}</Text>
          <FavoriteBrandsHero />
          {catalogResource.status !== "ready" ? (
            <CustomerAccountResourceState
              emptyBody={tc("No partner brands are available right now.")}
              emptyTitle={tc("Nothing to explore yet")}
              resource={catalogResource}
              resourceLabel="catalog"
            />
          ) : (
            <>
              <RecentlyVisitedBrandsGrid
                brands={brands}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />
              <FavoriteBrandsListPreview
                brands={brands}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />
            </>
          )}
        </View>
      </View>
    </FavoriteBrandsSubPage>
  );
}

function FavoriteBrandsSubPage({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webFavoriteBrandsPage.title)}>
      <View style={[styles.surface, styles.favoriteBrandsSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function FavoriteBrandsTopBar() {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" hitSlop={8} style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={28} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{tc(webFavoriteBrandsPage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function FavoriteBrandsHero() {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  // Web parity: on desktop the hero is a row (text block left, illustration right); on mobile it
  // stacks centered with the illustration below.
  return (
    <View style={[styles.heroCard, isDesktop ? styles.heroCardDesktop : null]}>
      <View style={[styles.heroTextColumn, isDesktop ? styles.heroTextColumnDesktop : null]}>
        <Image
          alt={webFavoriteBrandsPage.hero.logoAlt}
          source={favoriteHeroLogoImage}
          style={styles.heroLogo}
        />
        <Text numberOfLines={1} style={styles.heroTitle}>{tc(webFavoriteBrandsPage.hero.title)}</Text>
        <Text style={[styles.heroDescription, isDesktop ? styles.heroDescriptionDesktop : null]}>
          {tc(webFavoriteBrandsPage.hero.description)}
        </Text>
        <Link asChild href="/shops">
          {/* Single style object (not an array): expo-router's asChild Slot merges the child's
              style and breaks on an array. Desktop left-alignment comes from the parent column's
              alignItems instead of a per-button override. */}
          <MotionPressable accessibilityRole="link" pressScale={0.98} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>{tc(webFavoriteBrandsPage.hero.actionLabel)}</Text>
          </MotionPressable>
        </Link>
      </View>
      <Image
        alt={tc(webFavoriteBrandsPage.hero.illustrationAlt)}
        resizeMode="contain"
        source={favoriteHeroBagImage}
        style={[styles.heroBag, isDesktop ? styles.heroBagDesktop : null]}
      />
    </View>
  );
}

function RecentlyVisitedBrandsGrid({
  brands,
  favoriteIds,
  onToggleFavorite,
}: {
  brands: readonly FavoriteBrand[];
  favoriteIds: readonly string[];
  onToggleFavorite: (id: string) => void;
}) {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(webFavoriteBrandsPage.recentTitle)}</Text>
      <FavoriteBrandsVirtualizedGrid
        brands={brands}
        favoriteIds={favoriteIds}
        isDesktop={isDesktop}
        onToggleFavorite={onToggleFavorite}
      />
    </View>
  );
}

function FavoriteBrandsListPreview({
  brands,
  favoriteIds,
  onToggleFavorite,
}: {
  brands: readonly FavoriteBrand[];
  favoriteIds: readonly string[];
  onToggleFavorite: (id: string) => void;
}) {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const savedBrands = brands.filter((brand) => favoriteIds.includes(brand.id));

  return (
    <View style={styles.section}>
      <View style={styles.favoriteListHeader}>
        <Text style={styles.sectionTitle}>{tc(webFavoriteBrandsPage.favoritesTitle)}</Text>
        <View style={styles.searchPill}>
          <SearchIcon color={colors.muted} size={16} strokeWidth={typography.iconStrokeWidth} />
          <Text style={styles.searchText}>{tc(webFavoriteBrandsPage.searchPlaceholder)}</Text>
        </View>
      </View>
      {savedBrands.length === 0 ? (
        <View style={styles.favoritesEmpty}>
          <View style={styles.favoritesEmptyHeart}>
            <HeartIcon color={colors.primaryDark} size={26} strokeWidth={2} />
          </View>
          <Text style={styles.favoritesEmptyTitle}>{tc("No saved brands yet")}</Text>
          <Text style={styles.favoritesEmptyBody}>
            {tc("Tap the heart on a brand to save it here for quick access.")}
          </Text>
        </View>
      ) : (
        <FavoriteBrandsVirtualizedGrid
          brands={savedBrands}
          favoriteIds={favoriteIds}
          isDesktop={isDesktop}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </View>
  );
}

function FavoriteBrandsVirtualizedGrid({
  brands,
  favoriteIds,
  isDesktop,
  onToggleFavorite,
}: {
  brands: readonly FavoriteBrand[];
  favoriteIds: readonly string[];
  isDesktop: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const layoutWidth = gridWidth > 0 ? gridWidth : Math.max(320, width > 0 ? width - 48 : 360);
  const metrics = useMemo(
    () => getFavoriteBrandGridMetrics(layoutWidth, isDesktop),
    [isDesktop, layoutWidth]
  );
  const estimatedRowHeight = getFavoriteBrandCardHeight(metrics.cardWidth);
  const renderBrandCard = useCallback(
    (brand: FavoriteBrand) => (
      <FavoriteBrandCard
        brand={brand}
        isFavorite={favoriteIds.includes(brand.id)}
        onToggleFavorite={onToggleFavorite}
      />
    ),
    [favoriteIds, onToggleFavorite]
  );

  if (brands.length === 0) {
    return (
      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={{ width: "100%" }}
      />
    );
  }

  return (
    <View
      onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
      style={{ width: "100%" }}
    >
      <DirectoryVirtualizedGrid
        cardWidth={metrics.cardWidth}
        columns={metrics.columns}
        estimatedRowHeight={estimatedRowHeight}
        gap={metrics.gap}
        items={brands}
        renderItemContent={renderBrandCard}
      />
    </View>
  );
}

const FavoriteBrandCard = memo(function FavoriteBrandCard({
  brand,
  isFavorite = false,
  onToggleFavorite,
}: {
  brand: FavoriteBrand;
  isFavorite?: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const tint = brand.tint ?? FAVORITE_BRAND_TINTS[brand.id] ?? FAVORITE_BRAND_FALLBACK_TINT;
  return (
    <View style={styles.brandCard}>
      <Link asChild href={brand.href as never}>
        <MotionPressable
          accessibilityLabel={`${brand.name} ${tc(webFavoriteBrandsPage.cashbackLabel)} ${brand.cashback}`}
          accessibilityRole="link"
          pressScale={0.985}
          style={styles.brandCardLink}
        >
          <View style={[styles.brandVisual, { backgroundColor: tint }]}>
            {brand.showGrabCoupon ? (
              <View style={styles.couponBadge}>
                <Text style={styles.couponEmoji}>🧧</Text>
                <Text numberOfLines={1} style={styles.couponText}>
                  {tc(webFavoriteBrandsPage.grabCouponLabel)}
                </Text>
              </View>
            ) : null}
            {brand.logo ? (
              <Image
                accessibilityLabel={`${brand.name} logo`}
                cachePolicy="memory-disk"
                contentFit="contain"
                recyclingKey={brand.logo}
                source={{ uri: brand.logo }}
                style={styles.brandLogoImage}
              />
            ) : (
              <Text style={styles.brandMonogram}>{brand.name.charAt(0)}</Text>
            )}
          </View>
          <View style={styles.brandMeta}>
            <View style={styles.categoryChip}>
              <ShoppingCartIcon
                color={colors.primaryDark}
                size={13}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text numberOfLines={1} style={styles.categoryText}>
                {tc(brand.category)}
              </Text>
            </View>
            <View style={styles.brandNameRow}>
              <View style={styles.brandCopy}>
                <Text numberOfLines={2} style={styles.brandName}>
                  {brand.name}
                </Text>
                <Text style={styles.cashbackCaption}>
                  {tc(webFavoriteBrandsPage.cashbackLabel)}
                </Text>
              </View>
              <Text style={styles.cashbackValue}>{brand.cashback}</Text>
            </View>
          </View>
        </MotionPressable>
      </Link>
      <MotionPressable
        accessibilityLabel={
          isFavorite
            ? `${tc("Remove from saved brands")}: ${brand.name}`
            : `${tc("Save brand")}: ${brand.name}`
        }
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onToggleFavorite(brand.id)}
        pressScale={0.9}
        style={[styles.heartButton, isFavorite ? styles.heartButtonActive : null]}
      >
        <HeartIcon color={isFavorite ? colors.white : colors.muted} size={18} strokeWidth={2.2} />
      </MotionPressable>
    </View>
  );
});

function createFavoriteBrandsScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  favoriteBrandsSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 18,
  },
  favoriteShell: {
    backgroundColor: "transparent",
    minHeight: 980,
    width: "100%",
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 66,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  content: {
    gap: 40,
    paddingBottom: 118,
    paddingHorizontal: spacing.md,
    paddingTop: 24,
  },
  pageTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#F2FBF8", colors.fieldMuted),
    borderColor: pickThemed(colors, "#D8F0E8", colors.border),
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 4px 16px rgba(16, 53, 34, 0.10)",
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 34,
  },
  heroCardDesktop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 40,
    justifyContent: "space-between",
    paddingBottom: 40,
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  heroTextColumn: {
    alignItems: "center",
    gap: 12,
  },
  heroTextColumnDesktop: {
    alignItems: "flex-start",
    flex: 1,
  },
  heroLogo: {
    height: 60,
    width: 60,
  },
  heroTitle: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 31,
    textAlign: "center",
  },
  heroDescription: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 360,
    textAlign: "center",
  },
  heroDescriptionDesktop: {
    maxWidth: 400,
    textAlign: "left",
  },
  heroButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 48,
    minWidth: 154,
    paddingHorizontal: 28,
  },
  heroButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  heroBag: {
    height: 200,
    marginTop: 20,
    width: "100%",
  },
  heroBagDesktop: {
    flexShrink: 0,
    height: 240,
    marginTop: 0,
    width: 320,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 34,
  },
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  brandGridDesktop: {
    gap: 18,
  },
  brandCard: {
    position: "relative",
    width: "100%",
  },
  brandCardLink: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 3px 8px rgba(16, 53, 34, 0.06)",
    overflow: "hidden",
    padding: 8,
  },
  brandVisual: {
    alignItems: "center",
    aspectRatio: 272 / 153,
    borderRadius: 10,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  brandMonogram: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 46,
    fontWeight: "800",
    opacity: 0.96,
  },
  brandLogoImage: {
    height: "55%",
    width: "70%",
  },
  couponBadge: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    left: 8,
    maxWidth: "88%",
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    top: 7,
  },
  couponText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 12,
    lineHeight: 15,
  },
  couponEmoji: {
    fontSize: 12,
  },
  brandMeta: {
    gap: 7,
    paddingTop: 8,
  },
  categoryChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(0, 170, 128, 0.22)",
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  categoryText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  brandNameRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 54,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  brandName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
  },
  cashbackCaption: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  cashbackValue: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 31,
    textAlign: "right",
  },
  favoriteListHeader: {
    gap: 12,
  },
  searchPill: {
    alignItems: "center",
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  searchText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 20,
  },
  heartButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    boxShadow: "0 2px 6px rgba(16, 53, 34, 0.16)",
    height: 32,
    justifyContent: "center",
    outlineColor: "transparent",
    outlineWidth: 0,
    position: "absolute",
    right: 16,
    top: 16,
    width: 32,
    zIndex: 2,
  },
  heartButtonActive: {
    backgroundColor: colors.primary,
  },
  favoritesEmpty: {
    alignItems: "center",
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  favoritesEmptyHeart: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  favoritesEmptyTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
  },
  favoritesEmptyBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: "center",
  },
});
}

