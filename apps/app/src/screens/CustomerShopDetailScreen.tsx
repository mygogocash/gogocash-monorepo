import { Image as ExpoImage } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent as BadgePercentIcon,
  Banknote as BanknoteIcon,
  CheckCircle as CheckCircleIcon,
  Heart as HeartIcon,
  Info as InfoIcon,
  Shirt as ShirtIcon,
  ShoppingBag as ShoppingBagIcon,
  Share2 as ShareIcon,
} from "@mobile/theme/icons";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import sideWatchImage from "../../assets/home-side-watch.png";
import questBannerImage from "../../assets/quest-banner-en.png";
import walletNoDataImage from "../../assets/wallet-no-data.png";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useFavoriteBrands } from "@mobile/account/FavoriteBrandsProvider";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import {
  getFixtureShopDirectoryResults,
  resolveLiveDirectoryStores,
} from "@mobile/account/directoryCatalogResource";
import type { OfferListResponse } from "@mobile/api/catalogTypes";
import {
  resolveShopTerms,
  type CategoryPolicyPayload,
  type ShopTermsViewModel,
} from "@mobile/account/policyResource";
import { mapMerchantOfferToShopDetail } from "@mobile/api/merchantMapper";
import { isMerchantOfferResponse } from "@mobile/api/merchantTypes";
import { buildLoginRedirectWithCallback } from "@mobile/auth/routeGuard";
import {
  consumePendingShopNowIntent,
  setPendingShopNowIntent,
} from "@mobile/auth/shopNowIntent";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { ShopCashbackTipsPanel } from "@mobile/components/shop/ShopCashbackTipsPanel";
import { ShopRedirectOverlay } from "@mobile/components/ShopRedirectOverlay";
import { Skeleton, SkeletonText } from "@mobile/components/Skeleton";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import {
  getDesktopShellOffset,
  getResponsiveHomeLayoutMetrics,
  mobileShellLayout,
  webShopDetailGroceryGalaxy,
} from "@mobile/design/webDesignParity";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const shopBannerAssets = {
  "home-side-watch": sideWatchImage,
} as const;

const questBannerAssets = {
  "quest-banner-en": questBannerImage,
} as const;

// Identity fields widen to string so the live-mapped merchant (real ids and
// rates from the backend) satisfies the same view-model as the fixture.
type ShopDetail = Omit<typeof webShopDetailGroceryGalaxy, "brand" | "cashback" | "category" | "id"> & {
  bannerUri?: string;
  brand: string;
  cashback: string;
  category: string;
  customTerms?: string;
  id: string;
  logoUri?: string;
  noteToUser?: string;
  policyCategoryId?: string;
  trackingUrl?: string;
};
type TrackingStep = ShopDetail["trackingPeriod"][number];

export function CustomerShopDetailScreen({ shopId }: { shopId?: string }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthed, ready: authReady } = useAuthGuardSession();
  const { width } = useWindowDimensions();
  const tc = useCopy();
  const toast = useToast();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
  const desktopFooterHorizontalOffset = getDesktopShellOffset(width);
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const showBottomNav = !isDesktop;
  const fixtureShop = webShopDetailGroceryGalaxy;
  const [redirecting, setRedirecting] = useState(false);
  const merchantResource = useCustomerAccountResource({
    fixtureData: fixtureShop,
    merchantId: shopId ?? fixtureShop.id,
    resourceId: "merchant",
  });
  // Live merchant identity (name/category/cashback) overlays the fixture's
  // static product copy; fixtures mode rejects the guard and stays unchanged.
  const shop: ShopDetail = isMerchantOfferResponse(merchantResource.data)
    ? mapMerchantOfferToShopDetail(merchantResource.data, fixtureShop)
    : fixtureShop;
  const policyResource = useCustomerAccountResource<
    CategoryPolicyPayload | null,
    CategoryPolicyPayload
  >({
    enabled: Boolean(shop.policyCategoryId) && merchantResource.source === "backend",
    fixtureData: null,
    merchantId: shop.policyCategoryId ?? "policy-unset",
    resourceId: "policyCategory",
  });
  const shopTerms = resolveShopTerms({
    customTerms: shop.customTerms,
    fallback: shop.terms,
    noteToUser: shop.noteToUser,
    policyPayload: policyResource.data,
    source: merchantResource.source,
  });

  // Share the merchant referral link, then confirm with a transient toast + success haptic.
  // Reuses the existing translated "Copied to clipboard" string (tc reverse-looks it up to
  // the walletTransactionsCopied catalog key -> Thai "คัดลอกแล้ว"), so no new copy is added.
  // The mock has no real shareable URL yet, so this is the affordance + feedback wiring.
  const handleShareReferral = () => {
    toast.show(tc("Copied to clipboard"));
    void haptics.success();
  };

  const beginShopNowRedirect = () => {
    setRedirecting(true);
  };

  const handleShopNow = () => {
    if (!authReady) {
      return;
    }

    if (!isAuthed) {
      setPendingShopNowIntent(shop.id);
      router.push(buildLoginRedirectWithCallback(`/shop/${shop.id}`) as never);
      return;
    }

    beginShopNowRedirect();
  };

  useEffect(() => {
    if (!authReady || !isAuthed || merchantResource.status !== "ready") {
      return;
    }

    if (consumePendingShopNowIntent(shop.id)) {
      setRedirecting(true);
    }
  }, [authReady, isAuthed, merchantResource.status, shop.id]);

  if (merchantResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody="This merchant does not have active cashback details yet."
        emptyTitle="No merchant details yet"
        loadingSkeleton={<ShopDetailSkeleton />}
        resource={merchantResource}
        resourceLabel="merchant details"
      />
    );
  }

  const shopPageContent = (
    <>
      <ShopHero isDesktop={isDesktop} onShopNow={handleShopNow} shop={shop} />
      <View style={[styles.detailGrid, isDesktop ? styles.detailGridDesktop : null]}>
        <View style={[styles.leftColumn, isDesktop ? styles.leftColumnDesktop : null]}>
          <ShopCashbackRail shop={shop} />
          <ShopTrackingPeriod shop={shop} />
          <ShopReferralCard onShare={handleShareReferral} shop={shop} />
          {isDesktop ? <ShopTermsPanel terms={shopTerms} /> : null}
        </View>
        <View style={[styles.rightColumn, isDesktop ? styles.rightColumnDesktop : null]}>
          <ShopQuestBanner shop={shop} />
          <ShopDealsEmptyState shop={shop} />
          <ShopCashbackTipsPanel shop={shop} />
        </View>
      </View>
      {!isDesktop ? <ShopTermsPanel terms={shopTerms} /> : null}
      <ShopExploreRelated excludeShopId={shop.id} />
    </>
  );

  const refreshControl = (
    <RefreshControl
      onRefresh={merchantResource.retry}
      refreshing={false}
      title={tc("Loading…")}
    />
  );

  if (isDesktop) {
    return (
      <View style={styles.viewport}>
        <View style={styles.desktopShellFrame}>
          <ScrollView
            contentContainerStyle={[
              styles.pageDesktopFullBleed,
              {
                paddingTop: spacing.lg,
              },
            ]}
            refreshControl={refreshControl}
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
              {shopPageContent}
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
        {redirecting ? (
          <ShopRedirectOverlay
            brand={shop.brand}
            onComplete={() => {
              setRedirecting(false);
              void Linking.openURL(
                shop.trackingUrl ||
                  `https://www.google.com/search?q=${encodeURIComponent(shop.brand)}`
              ).catch(() => undefined);
            }}
          />
        ) : null}
      </View>
    );
  }

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
              paddingTop: Math.max(spacing.md, insets.top + spacing.md),
            },
          ]}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {shopPageContent}
          <CustomerDesktopFooterSlot
            horizontalPadding={homeLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>
        {showBottomNav ? (
          <CustomerMobileBottomNav activeRouteId={undefined} bottomInset={insets.bottom} />
        ) : null}
      </View>
      {redirecting ? (
        <ShopRedirectOverlay
          brand={shop.brand}
          onComplete={() => {
            setRedirecting(false);
            void Linking.openURL(
              shop.trackingUrl ||
                `https://www.google.com/search?q=${encodeURIComponent(shop.brand)}`
            ).catch(() => undefined);
          }}
        />
      ) : null}
    </View>
  );
}

function ShopHero({
  isDesktop,
  onShopNow,
  shop,
}: {
  isDesktop: boolean;
  onShopNow: () => void;
  shop: ShopDetail;
}) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const [bannerFailed, setBannerFailed] = useState(false);
  useEffect(() => {
    setBannerFailed(false);
  }, [shop.bannerUri]);
  const bannerSource = shop.bannerUri && !bannerFailed
    ? { uri: shop.bannerUri }
    : shopBannerAssets[shop.bannerAsset];

  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroBanner}>
        {shop.bannerUri && !bannerFailed ? (
          <ExpoImage
            accessibilityLabel={`${shop.brand} promotion banner`}
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setBannerFailed(true)}
            recyclingKey={shop.bannerUri}
            source={bannerSource}
            style={styles.heroImage}
          />
        ) : (
          <Image
            accessibilityLabel={`${shop.brand} promotion banner`}
            alt={`${shop.brand} promotion banner`}
            resizeMode="cover"
            source={shopBannerAssets[shop.bannerAsset]}
            style={styles.heroImage}
          />
        )}
      </View>
      <ShopHeroSummaryCard isDesktop={isDesktop} onShopNow={onShopNow} shop={shop} />
    </View>
  );
}

function ShopHeroSummaryCard({
  isDesktop,
  onShopNow,
  shop,
}: {
  isDesktop: boolean;
  onShopNow: () => void;
  shop: ShopDetail;
}) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthed, ready: authReady } = useAuthGuardSession();
  const { isFavorite, toggleFavorite } = useFavoriteBrands();
  const favorited = isFavorite(shop.id);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    setLogoFailed(false);
  }, [shop.logoUri]);
  const handleToggleFavorite = () => {
    if (!authReady) {
      return;
    }
    if (!isAuthed) {
      router.push(buildLoginRedirectWithCallback(`/shop/${shop.id}`) as never);
      return;
    }
    toggleFavorite(shop.id);
  };
  const brandTitle = (
    <Text
      numberOfLines={isDesktop ? 1 : 2}
      style={[styles.summaryTitle, isDesktop ? null : styles.summaryTitleMobile]}
      testID="shop-detail-brand-name"
    >
      {shop.brand}
    </Text>
  );
  const brandLogo = shop.logoUri && !logoFailed ? (
    <ExpoImage
      accessibilityLabel={`${shop.brand} logo`}
      cachePolicy="memory-disk"
      contentFit="contain"
      onError={() => setLogoFailed(true)}
      recyclingKey={shop.logoUri}
      source={{ uri: shop.logoUri }}
      style={styles.summaryLogoImage}
      testID="shop-detail-brand-logo"
    />
  ) : (
    <View style={styles.summaryLogoFallback} testID="shop-detail-brand-logo-fallback">
      <Text style={styles.summaryLogoFallbackText}>{shop.logoText}</Text>
    </View>
  );
  // Mobile drops the logo circle — the banner directly above already carries
  // the brand, so the pill keeps the room for the name (design feedback
  // 2026-07-10). Desktop keeps logo + name.
  const brandIdentity = isDesktop ? (
    <View style={styles.summaryTitleWrap}>
      <View style={styles.summaryIdentityRow}>
        {brandLogo}
        {brandTitle}
      </View>
    </View>
  ) : (
    <View style={styles.summaryTitleWrap}>{brandTitle}</View>
  );
  const favoriteButton = (
    <MotionPressable
      accessibilityLabel={
        favorited
          ? `Remove from saved brands: ${shop.brand}`
          : `Save brand: ${shop.brand}`
      }
      accessibilityRole="button"
      accessibilityState={{ selected: favorited }}
      onPress={handleToggleFavorite}
      pressScale={0.96}
      style={StyleSheet.flatten([
        styles.favoriteButton,
        isDesktop ? null : styles.favoriteButtonCompact,
      ])}
    >
      <HeartIcon
        color={favorited ? colors.primary : colors.primaryDark}
        fill={favorited ? colors.primary : undefined}
        size={20}
        strokeWidth={favorited ? 0 : 2}
      />
    </MotionPressable>
  );
  const shopNowButton = (
    <MotionPressable
      accessibilityLabel={`Shop now at ${shop.brand}`}
      accessibilityRole="button"
      onPress={onShopNow}
      pressScale={0.98}
      style={StyleSheet.flatten([
        styles.shopNowButton,
        isDesktop ? null : styles.shopNowButtonCompact,
      ])}
    >
      <Text style={styles.shopNowText}>{shop.shopNowLabel}</Text>
    </MotionPressable>
  );

  // Mobile is ONE row — logo → name (flex) → heart → Shop Now. The previous
  // stacked layout (identity row above a right-aligned actions row) left a
  // dead zone bottom-left for short brand names (design feedback 2026-07-10).
  return (
    <View style={[styles.summaryCard, isDesktop ? styles.summaryCardDesktop : null]}>
      {isDesktop ? (
        <>
          {brandIdentity}
          {favoriteButton}
          {shopNowButton}
        </>
      ) : (
        <View style={styles.summaryMobileRow}>
          {brandIdentity}
          {favoriteButton}
          {shopNowButton}
        </View>
      )}
    </View>
  );
}

function ShopCashbackRail({ shop }: { shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.cashbackRail}>
      <View style={styles.cashbackHeader}>
        <Text style={styles.cashbackLabel}>Cashback upto</Text>
        <Text style={styles.cashbackValue}>{shop.cashback}</Text>
      </View>
      <View style={styles.tagRow} accessibilityLabel="Offer highlights">
        <Link asChild href={`/category/${encodeURIComponent(shop.category)}` as never}>
          <MotionPressable pressScale={0.98} style={styles.categoryTag}>
            <ShirtIcon color={colors.ink} size={18} strokeWidth={typography.iconStrokeWidth} />
            <Text style={styles.tagText}>{shop.category}</Text>
          </MotionPressable>
        </Link>
        <View style={styles.extraTag}>
          <Text style={styles.fireIcon}>🔥</Text>
          <Text style={styles.tagText}>
            Extra Cashback <Text style={styles.tagStrong}>{shop.extraCashback}</Text>
          </Text>
        </View>
      </View>
      <View style={styles.rateDetails}>
        <Text style={styles.disclaimer}>{shop.disclaimer}</Text>
        <Text style={styles.disclaimer}>{shop.maxPerTransaction}</Text>
        <View style={styles.rateSummaryRow}>
          <Text style={styles.rateSummaryText}>Cashback starting from {shop.rateSummary.from}</Text>
          <Text style={styles.rateSummaryText}>up to {shop.rateSummary.upTo}</Text>
        </View>
        <View style={styles.productRateList}>
          {shop.productRates.map((rate) => (
            <View key={rate.name} style={styles.productRateRow}>
              <Text style={styles.productRateName}>{rate.name}</Text>
              <Text style={styles.productRateValue}>{rate.rate}</Text>
            </View>
          ))}
        </View>
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>NOTE</Text>
          <Text style={styles.noteBody}>{shop.note}</Text>
        </View>
      </View>
    </View>
  );
}

function ShopTrackingPeriod({ shop }: { shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  return (
    <View style={styles.trackingSection}>
      <Text style={styles.sectionTitle}>Cashback Tracking Period</Text>
      <View style={styles.trackingRow}>
        {shop.trackingPeriod.map((step, index) => (
          <TrackingStepItem
            key={step.label}
            showConnector={index < shop.trackingPeriod.length - 1}
            step={step}
          />
        ))}
      </View>
    </View>
  );
}

function TrackingStepItem({ showConnector, step }: { showConnector: boolean; step: TrackingStep }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  return (
    <View style={styles.trackingItemWrap}>
      <View style={styles.trackingItem}>
        <TrackingIcon name={step.icon} />
        <Text style={styles.trackingLabel}>{step.label}</Text>
        <Text style={styles.trackingDetail}>{step.detail}</Text>
      </View>
      {showConnector ? <View style={styles.trackingConnector} /> : null}
    </View>
  );
}

function TrackingIcon({ name }: { name: TrackingStep["icon"] }) {
  const { colors } = useTheme();
  const Icon =
    name === "shopping" ? ShoppingBagIcon : name === "check" ? CheckCircleIcon : BanknoteIcon;

  return <Icon color={colors.muted} size={24} strokeWidth={typography.iconStrokeWidth} />;
}

function ShopReferralCard({ onShare, shop }: { onShare: () => void; shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.referralCard}>
      <View style={styles.referralIcon}>
        <BadgePercentIcon color={colors.primaryDark} size={26} strokeWidth={2} />
      </View>
      <View style={styles.referralCopy}>
        <Text numberOfLines={2} style={styles.referralTitle}>
          {shop.referral.title}
        </Text>
        <Text numberOfLines={2} style={styles.referralSubtitle}>
          {shop.referral.subtitle}
        </Text>
        <Text style={styles.referralBody}>{shop.referral.body}</Text>
      </View>
      <MotionPressable
        accessibilityRole="button"
        hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
        onPress={onShare}
        pressScale={0.98}
        style={styles.shareButton}
      >
        <ShareIcon color={colors.white} size={16} strokeWidth={2} />
        <Text style={styles.shareButtonText}>{shop.referral.actionLabel}</Text>
      </MotionPressable>
    </View>
  );
}

function ShopQuestBanner({ shop }: { shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const questBannerFrameStyle = StyleSheet.flatten([
    styles.questBannerFrame,
    {
      aspectRatio: shop.questBanner.imageWidth / shop.questBanner.imageHeight,
      borderRadius: shop.questBanner.radius,
    },
  ]);

  return (
    <Link asChild href={shop.questBanner.href as never}>
      <MotionPressable
        accessibilityLabel={shop.questBanner.accessibilityLabel}
        pressScale={0.99}
        style={questBannerFrameStyle}
      >
        <Image
          accessibilityLabel={shop.questBanner.accessibilityLabel}
          alt={shop.questBanner.accessibilityLabel}
          resizeMode="cover"
          source={questBannerAssets[shop.questBanner.imageAsset]}
          style={styles.questBannerImage}
        />
      </MotionPressable>
    </Link>
  );
}

function ShopDealsEmptyState({ shop }: { shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  return (
    <View style={styles.dealsSection}>
      <Text style={styles.sectionTitle}>{shop.deals.title}</Text>
      <View style={styles.dealsEmptyCard}>
        <Image
          accessibilityLabel="No deals available"
          alt="No deals available"
          resizeMode="contain"
          source={walletNoDataImage}
          style={styles.emptyImage}
        />
        <Text style={styles.emptyTitle}>{shop.deals.emptyTitle}</Text>
        <Text style={styles.emptySubtitle}>{shop.deals.emptySubtitle}</Text>
      </View>
    </View>
  );
}

function ShopTermsPanel({ terms }: { terms: ShopTermsViewModel }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.termsPanel}>
      <View style={styles.termsHeader}>
        <Text style={styles.termsEmoji}>{terms.eyebrow}</Text>
        <View style={styles.termsTitleWrap}>
          <Text style={styles.sectionTitle}>{terms.title}</Text>
          <Text style={styles.termsSubtitle}>{terms.subtitle}</Text>
        </View>
        <InfoIcon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <Text style={styles.termsSectionTitle}>{terms.exclusionsTitle}</Text>
      <View style={styles.termsList}>
        {terms.bullets.map((bullet) => (
          <View key={bullet} style={styles.termBulletRow}>
            <Text style={styles.termBulletDot}>•</Text>
            <Text style={styles.termBulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ShopExploreRelated({ excludeShopId }: { excludeShopId: string }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  const { region } = useLocale();
  const catalogResource = useCustomerAccountResource<OfferListResponse, OfferListResponse>({
    fixtureData: { data: [], limit: 80, page: 1, total: 0, totalPages: 0 },
    resourceId: "brandCatalog",
  });
  const related = useMemo(() => {
    const stores =
      catalogResource.source === "backend"
        ? resolveLiveDirectoryStores(
            catalogResource.source,
            catalogResource.data,
            [],
            region,
          )
        : getFixtureShopDirectoryResults({ regionCode: region });

    return stores.filter((store) => store.id !== excludeShopId).slice(0, 6);
  }, [catalogResource.data, catalogResource.source, excludeShopId, region]);

  return (
    <View style={styles.relatedSection}>
      <Text style={styles.sectionTitle}>Explore other shops</Text>
      <ScrollView
        contentContainerStyle={styles.relatedRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {related.map((store) => {
          const logoTileBackground = store.logoUri ? colors.card : store.tint;

          return (
            <Link asChild href={`/shop/${store.id}` as never} key={store.id}>
              <MotionPressable pressScale={0.98} style={styles.relatedCard}>
                <View style={[styles.relatedVisual, { backgroundColor: logoTileBackground }]}>
                  {store.logoUri ? (
                    <ExpoImage
                      accessibilityLabel={`${store.brand} logo`}
                      cachePolicy="memory-disk"
                      contentFit="contain"
                      recyclingKey={store.logoUri}
                      source={{ uri: store.logoUri }}
                      style={styles.relatedLogoImage}
                    />
                  ) : null}
                  {store.showGrabCoupon ? (
                    <View style={styles.relatedCouponBadge}>
                      <Text style={styles.relatedCouponIcon}>🧧</Text>
                      <Text numberOfLines={1} style={styles.relatedCouponText}>
                        {store.label}
                      </Text>
                    </View>
                  ) : null}
                  <View accessibilityLabel="Add to favorites" style={styles.relatedFavoriteButton}>
                    <HeartIcon
                      color={colors.primaryDark}
                      size={16}
                      strokeWidth={typography.iconStrokeWidth}
                    />
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.relatedName}>
                  {store.brand}
                </Text>
                <View style={styles.relatedCashbackRow}>
                  <Text numberOfLines={1} style={styles.relatedCashbackCaption}>
                    Cashback upto
                  </Text>
                  <Text numberOfLines={1} style={styles.relatedCashbackValue}>
                    {store.cashback}
                  </Text>
                </View>
              </MotionPressable>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Content-shaped loading placeholder handed to the shared resource-state guard's opt-in
// loadingSkeleton prop, so the merchant page's loading state shows a skeleton (hero banner +
// summary card + a couple of detail blocks) instead of the generic spinner. Primitives
// (Skeleton/SkeletonText) already hide themselves from screen readers and skip the pulse
// loop under reduced motion (Wave A).
function ShopDetailSkeleton() {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  return (
    <View style={styles.skeletonWrap} testID="shop-detail-skeleton">
      <Skeleton height={200} radius={radii.lg} width="100%" />
      <Skeleton height={68} radius={radii.lg} style={styles.skeletonSummary} width="90%" />
      <SkeletonText lines={3} style={styles.skeletonBlock} />
      <SkeletonText lines={4} style={styles.skeletonBlock} />
    </View>
  );
}

function createShopDetailScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  skeletonWrap: {
    gap: spacing.md,
    padding: spacing.lg,
    width: "100%",
  },
  skeletonSummary: {
    alignSelf: "center",
    marginTop: -28,
  },
  skeletonBlock: {
    marginTop: spacing.md,
  },
  frame: {
    backgroundColor: colors.background,
    flex: 1,
    position: "relative",
    width: "100%",
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
    gap: 32,
  },
  desktopFooter: {
    marginTop: 64,
  },
  heroWrap: {
    alignItems: "center",
    paddingBottom: 32,
  },
  heroBanner: {
    aspectRatio: 1200 / 410,
    backgroundColor: "#D9D9D9",
    borderRadius: 24,
    minHeight: 220,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  summaryCard: {
    alignItems: "stretch",
    backgroundColor: colors.card,
    borderRadius: 32,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    flexDirection: "column",
    gap: 12,
    minHeight: 68,
    marginTop: -39,
    paddingHorizontal: 18,
    paddingVertical: 12,
    width: "90%",
    zIndex: 2,
  },
  summaryCardDesktop: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    maxWidth: 720,
    width: "100%",
  },
  summaryTitleWrap: {
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 0,
  },
  summaryIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  summaryLogoImage: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexShrink: 0,
    height: 48,
    width: 48,
  },
  summaryLogoFallback: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
    borderRadius: 24,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  summaryLogoFallbackText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  summaryTitleMobile: {
    fontSize: 17,
    lineHeight: 22,
    width: "100%",
  },
  summaryMobileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  // Mobile row is tight (295px inner at 400px viewport): slim the heart and
  // Shop Now so the flexed brand-name column keeps ~80px and short names
  // stay on one line instead of breaking mid-word.
  favoriteButtonCompact: {
    height: 40,
    width: 40,
  },
  shopNowButtonCompact: {
    height: 40,
    minWidth: 0,
    paddingHorizontal: 16,
  },
  summaryTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
  },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#E6F7ED", colors.primarySoft),
    borderColor: pickThemed(colors, "#E6F7ED", colors.border),
    borderRadius: radii.chip,
    borderWidth: 1,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  shopNowButton: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, colors.ink, colors.primary),
    borderRadius: radii.chip,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    minWidth: 126,
    paddingHorizontal: 18,
  },
  shopNowText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  detailGrid: {
    gap: 32,
    width: "100%",
  },
  detailGridDesktop: {
    flexDirection: "row",
    gap: 80,
  },
  leftColumn: {
    gap: 40,
    minWidth: 0,
  },
  leftColumnDesktop: {
    flexBasis: 400,
    flexGrow: 0,
    flexShrink: 0,
  },
  rightColumn: {
    gap: 56,
    minWidth: 0,
  },
  rightColumnDesktop: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
  },
  cashbackRail: {
    gap: 24,
  },
  cashbackHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    width: "100%",
  },
  cashbackLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  cashbackValue: {
    color: colors.primary,
    flexShrink: 0,
    fontFamily: typography.family,
    fontSize: 40,
    fontWeight: "600",
    lineHeight: 42,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryTag: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    flexDirection: "row",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  extraTag: {
    alignItems: "center",
    backgroundColor: pickThemed(colors, "#F7FDFB", colors.card),
    borderColor: pickThemed(colors, "#C8EBE0", colors.border),
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fireIcon: {
    fontSize: 16,
    lineHeight: 18,
  },
  tagText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  tagStrong: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  rateDetails: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 14,
  },
  disclaimer: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  rateSummaryRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  rateSummaryText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
  },
  productRateList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  productRateRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  productRateName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: typography.bodyWeight,
  },
  productRateValue: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
  },
  noteBox: {
    backgroundColor: pickThemed(colors, "#F7FDFB", colors.card),
    borderColor: pickThemed(colors, "#C8EBE0", colors.border),
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  noteTitle: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    lineHeight: 16,
    marginBottom: 6,
  },
  noteBody: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
  },
  trackingSection: {
    gap: 24,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  trackingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackingItemWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  trackingItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  trackingConnector: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flex: 0.35,
    marginTop: -34,
  },
  trackingLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 15,
    textAlign: "center",
  },
  trackingDetail: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: typography.bodyWeight,
    lineHeight: 15,
    textAlign: "center",
  },
  referralCard: {
    backgroundColor: colors.card,
    borderColor: pickThemed(colors, "#C8EBE0", colors.border),
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    boxShadow: shadows.cardCss,
  },
  referralIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  referralCopy: {
    gap: 6,
  },
  referralTitle: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "700",
  },
  referralSubtitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  referralBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
  },
  shareButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 18,
  },
  shareButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
  },
  questBannerFrame: {
    overflow: "hidden",
    width: "100%",
  },
  questBannerImage: {
    height: "100%",
    width: "100%",
  },
  dealsSection: {
    gap: 24,
  },
  dealsEmptyCard: {
    alignItems: "center",
    gap: 12,
  },
  emptyImage: {
    height: 220,
    width: 220,
  },
  emptyTitle: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
    maxWidth: 360,
    textAlign: "center",
  },
  termsPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  termsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  termsEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
  termsTitleWrap: {
    flex: 1,
    gap: 2,
  },
  termsSubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
  },
  termsSectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
  },
  termsList: {
    gap: 10,
  },
  termBulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  termBulletDot: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 18,
    lineHeight: 22,
  },
  termBulletText: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: typography.bodyWeight,
    lineHeight: 22,
  },
  relatedSection: {
    gap: 18,
  },
  relatedRow: {
    gap: 12,
    paddingRight: spacing.md,
  },
  relatedCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 10,
    width: 168,
    boxShadow: shadows.cardCss,
  },
  relatedVisual: {
    alignItems: "center",
    borderRadius: 12,
    height: 112,
    justifyContent: "center",
    overflow: "hidden",
    padding: 12,
    position: "relative",
    width: "100%",
  },
  relatedLogoImage: {
    height: 56,
    width: 96,
  },
  relatedCouponBadge: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    left: 8,
    maxWidth: 120,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 8,
  },
  relatedCouponIcon: {
    fontSize: 11,
    lineHeight: 13,
  },
  relatedCouponText: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 10,
  },
  relatedFavoriteButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
  },
  relatedName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  relatedCashbackRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  relatedCashbackCaption: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 11,
  },
  relatedCashbackValue: {
    color: colors.primaryDark,
    flexShrink: 0,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
});
}

