import { Link } from "expo-router";
import {
  ChevronLeft as ChevronLeftIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { mobileShellLayout, webFavoriteBrandsPage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";
import favoriteHeroBagImage from "../../assets/favorite-hero-bag.png";
import favoriteHeroLogoImage from "../../assets/favorite-hero-logo.png";
import homeBannerImage from "../../assets/home-banner.png";
import sideGroceryImage from "../../assets/home-side-grocery.png";
import sideWatchImage from "../../assets/home-side-watch.png";

type FavoriteBrand = (typeof webFavoriteBrandsPage.recentBrands)[number];

const favoriteBrandArtSources = {
  homeBanner: homeBannerImage,
  sideGrocery: sideGroceryImage,
  sideWatch: sideWatchImage,
} as const;

export function CustomerFavoriteBrandsScreen() {
  return (
    <FavoriteBrandsSubPage>
      <View style={styles.favoriteBlueShell}>
        <FavoriteBrandsTopBar />
        <View style={styles.content}>
          <Text style={styles.pageTitle}>{webFavoriteBrandsPage.title}</Text>
          <FavoriteBrandsHero />
          <RecentlyVisitedBrandsGrid />
          <FavoriteBrandsListPreview />
        </View>
      </View>
    </FavoriteBrandsSubPage>
  );
}

function FavoriteBrandsSubPage({ children }: { children: ReactNode }) {
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={webFavoriteBrandsPage.title}>
      <View style={[styles.surface, styles.favoriteBrandsSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function FavoriteBrandsTopBar() {
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={28} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{webFavoriteBrandsPage.title}</Text>
      </Pressable>
    </Link>
  );
}

function FavoriteBrandsHero() {
  return (
    <View style={styles.heroCard}>
      <Image
        alt={webFavoriteBrandsPage.hero.logoAlt}
        source={favoriteHeroLogoImage}
        style={styles.heroLogo}
      />
      <Text style={styles.heroTitle}>{webFavoriteBrandsPage.hero.title}</Text>
      <Text style={styles.heroDescription}>{webFavoriteBrandsPage.hero.description}</Text>
      <Link asChild href="/shops">
        <MotionPressable accessibilityRole="link" pressScale={0.98} style={styles.heroButton}>
          <Text style={styles.heroButtonText}>{webFavoriteBrandsPage.hero.actionLabel}</Text>
        </MotionPressable>
      </Link>
      <Image
        alt={webFavoriteBrandsPage.hero.illustrationAlt}
        resizeMode="contain"
        source={favoriteHeroBagImage}
        style={styles.heroBag}
      />
    </View>
  );
}

function RecentlyVisitedBrandsGrid() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{webFavoriteBrandsPage.recentTitle}</Text>
      <View style={[styles.brandGrid, isDesktop ? styles.brandGridDesktop : null]}>
        {webFavoriteBrandsPage.recentBrands.map((brand) => (
          <FavoriteBrandCard brand={brand} key={brand.id} />
        ))}
      </View>
    </View>
  );
}

function FavoriteBrandsListPreview() {
  return (
    <View style={styles.section}>
      <View style={styles.favoriteListHeader}>
        <Text style={styles.sectionTitle}>{webFavoriteBrandsPage.favoritesTitle}</Text>
        <View style={styles.searchPill}>
          <SearchIcon color={colors.textSoft} size={16} strokeWidth={typography.iconStrokeWidth} />
          <Text style={styles.searchText}>{webFavoriteBrandsPage.searchPlaceholder}</Text>
        </View>
      </View>
      <View style={styles.brandGrid}>
        {webFavoriteBrandsPage.recentBrands.slice(0, 2).map((brand) => (
          <FavoriteBrandCard brand={brand} favorite key={`favorite-${brand.id}`} />
        ))}
      </View>
    </View>
  );
}

function FavoriteBrandCard({ brand, favorite = false }: { brand: FavoriteBrand; favorite?: boolean }) {
  return (
    <Link asChild href={brand.href as never}>
      <MotionPressable
        accessibilityLabel={`${brand.name} ${webFavoriteBrandsPage.cashbackLabel} ${brand.cashback}`}
        accessibilityRole="link"
        pressScale={0.985}
        style={styles.brandCard}
      >
        <View style={styles.brandImageWrap}>
          <Image
            alt=""
            resizeMode="cover"
            source={favoriteBrandArtSources[brand.artAsset]}
            style={styles.brandImage}
          />
          {brand.showGrabCoupon ? (
            <View style={styles.couponBadge}>
              <ShoppingCartIcon
                color={colors.primaryDark}
                size={14}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text numberOfLines={1} style={styles.couponText}>
                {webFavoriteBrandsPage.grabCouponLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.brandMeta}>
          <View style={styles.categoryChip}>
            <ShoppingCartIcon
              color={colors.primaryDark}
              size={13}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text numberOfLines={1} style={styles.categoryText}>
              {brand.category}
            </Text>
          </View>
          <View style={styles.brandNameRow}>
            <View style={styles.brandCopy}>
              <Text numberOfLines={2} style={styles.brandName}>
                {brand.name}
              </Text>
              <Text style={styles.cashbackCaption}>{webFavoriteBrandsPage.cashbackLabel}</Text>
            </View>
            <Text style={styles.cashbackValue}>{brand.cashback}</Text>
          </View>
          {favorite ? <Text style={styles.favoriteState}>Saved</Text> : null}
        </View>
      </MotionPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "#DCEEFF",
    borderColor: "#B8D4EF",
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
  favoriteBlueShell: {
    backgroundColor: "#DCEEFF",
    minHeight: 980,
    width: "100%",
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: "rgba(16, 53, 34, 0.12)",
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
    color: "#3A4B61",
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "rgba(224, 246, 255, 0.72)",
    borderColor: "rgba(184, 212, 239, 0.58)",
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: "0 4px 16px rgba(67, 96, 126, 0.14)",
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 34,
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
    color: "#3A4B61",
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 360,
    textAlign: "center",
  },
  heroButton: {
    alignItems: "center",
    alignSelf: "center",
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
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: "#3A4B61",
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
    backgroundColor: colors.white,
    borderColor: "#B8D4EF",
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 3px 8px rgba(67, 96, 126, 0.08)",
    flexBasis: "48%",
    flexGrow: 1,
    maxWidth: 280,
    minWidth: 172,
    overflow: "hidden",
    padding: 8,
  },
  brandImageWrap: {
    aspectRatio: 272 / 153,
    backgroundColor: "#DCEEFF",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  brandImage: {
    height: "100%",
    width: "100%",
  },
  couponBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: "#D8E2D9",
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
    color: colors.textSoft,
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
    backgroundColor: colors.white,
    borderColor: "#D8E2D9",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  searchText: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 15,
    lineHeight: 20,
  },
  favoriteState: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
