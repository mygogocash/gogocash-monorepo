import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Heart as HeartIcon,
  Search as SearchIcon,
} from "@mobile/theme/icons";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { BrandCard } from "@mobile/components/BrandCard";
import { FavoriteBrandsHero } from "@mobile/components/FavoriteBrandsHero";
import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import type { OfferListResponse } from "@mobile/api/catalogTypes";
import { useCopy } from "@mobile/i18n/useCopy";
import { useFavoriteBrands } from "@mobile/account/FavoriteBrandsProvider";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import {
  getScaledCompactBrandCardMetrics,
  mobileShellLayout,
  webFavoriteBrandsPage,
} from "@mobile/design/webDesignParity";
import {
  DirectoryVirtualizedGrid,
} from "@mobile/screens/discovery/directoryVirtualizedGrid";
import { getFavoriteBrandGridMetrics } from "@mobile/screens/favoriteBrandGrid";
import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { shadows, spacing, typography } from "@mobile/theme/tokens";

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
  const { favoriteIds } = useFavoriteBrands();

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
          {isDesktop ? (
            <Text style={styles.pageTitle}>{tc(webFavoriteBrandsPage.title)}</Text>
          ) : null}
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
              <RecentlyVisitedBrandsGrid brands={brands} />
              <FavoriteBrandsListPreview brands={brands} favoriteIds={favoriteIds} />
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

function RecentlyVisitedBrandsGrid({ brands }: { brands: readonly FavoriteBrand[] }) {
  const styles = useThemedStyles(createFavoriteBrandsScreenStyles);
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(webFavoriteBrandsPage.recentTitle)}</Text>
      <FavoriteBrandsVirtualizedGrid brands={brands} isDesktop={isDesktop} />
    </View>
  );
}

function FavoriteBrandsListPreview({
  brands,
  favoriteIds,
}: {
  brands: readonly FavoriteBrand[];
  favoriteIds: readonly string[];
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
        <FavoriteBrandsVirtualizedGrid brands={savedBrands} isDesktop={isDesktop} />
      )}
    </View>
  );
}

function FavoriteBrandsVirtualizedGrid({
  brands,
  isDesktop,
}: {
  brands: readonly FavoriteBrand[];
  isDesktop: boolean;
}) {
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const layoutWidth = gridWidth > 0 ? gridWidth : Math.max(320, width > 0 ? width - 48 : 360);
  const metrics = useMemo(
    () => getFavoriteBrandGridMetrics(layoutWidth, isDesktop),
    [isDesktop, layoutWidth]
  );
  // Favorites cards ARE the shared BrandCard (design alignment 2026-07-11,
  // final form): same scaled tile/typography as home + Quest grids, plus the
  // favorite-heart option. (Category chip dropped same day on founder review.)
  const scaledCard = getScaledCompactBrandCardMetrics(metrics.cardWidth);
  const cardHeight = scaledCard.cardHeight;
  const estimatedRowHeight = cardHeight;
  const renderBrandCard = useCallback(
    (brand: FavoriteBrand) => (
      <BrandCard
        brand={brand.name}
        cardHeight={cardHeight}
        cardWidth={metrics.cardWidth}
        cashback={brand.cashback}
        href={brand.href}
        id={brand.id}
        logoUri={brand.logo}
        logoVisualHeight={scaledCard.logoVisualHeight}
        showFavoriteHeart
        size="S"
        tint={brand.tint ?? FAVORITE_BRAND_TINTS[brand.id] ?? FAVORITE_BRAND_FALLBACK_TINT}
      />
    ),
    [cardHeight, metrics.cardWidth, scaledCard.logoVisualHeight]
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

