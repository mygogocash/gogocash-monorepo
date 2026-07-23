import { Image as ExpoImage } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent as BadgePercentIcon,
  Banknote as BanknoteIcon,
  CheckCircle as CheckCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  Heart as HeartIcon,
  Info as InfoIcon,
  Shirt as ShirtIcon,
  ShoppingBag as ShoppingBagIcon,
  Share2 as ShareIcon,
} from "@mobile/theme/icons";
import {
  Image,
  Linking,
  Platform,
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
import { mintUserTrackingLink } from "@mobile/api/affiliateDeeplink";
import { mapPublicShopCoupons } from "@mobile/api/shopCouponMapper";
import type { ShopCoupon } from "@mobile/api/shopCouponTypes";
import {
  mapMerchantOfferToShopDetail,
  type TrackingPeriodStep,
} from "@mobile/api/merchantMapper";
import { getMobileEnv } from "@mobile/config/env";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { isMerchantOfferResponse } from "@mobile/api/merchantTypes";
import { useReferralBonusPercent } from "@mobile/api/referralBonus";
import {
  buildReferralCardCopy,
  type ReferralCardCopy,
} from "@mobile/api/referralBonusCopy";
import { buildLoginRedirectWithCallback } from "@mobile/auth/routeGuard";
import {
  consumePendingShopNowIntentDetails,
  peekPendingShopNowIntent,
  setPendingShopNowIntent,
} from "@mobile/auth/shopNowIntent";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { BrandCard } from "@mobile/components/BrandCard";
import { CustomerDesktopFooter } from "@mobile/components/CustomerDesktopFooter";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { ShopCashbackTipsPanel } from "@mobile/components/shop/ShopCashbackTipsPanel";
import { ShopCouponDeals } from "@mobile/components/shop/ShopCouponDeals";
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
  getScaledCompactBrandCardMetrics,
} from "@mobile/design/webDesignParity";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { motion } from "@mobile/theme/motion";
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
// trackingPeriod widens off the fixture's literal tuple so API-derived
// per-brand windows (mapper's buildTrackingPeriodSteps) fit the same shape.
type ShopDetail = Omit<
  typeof webShopDetailGroceryGalaxy,
  "brand" | "cashback" | "category" | "id" | "trackingPeriod"
> & {
  bannerUri?: string;
  brand: string;
  cashback: string;
  category: string;
  customTerms?: string;
  id: string;
  logoUri?: string;
  merchantId?: number;
  noteToUser?: string;
  offerId?: number;
  policyCategoryId?: string;
  /** Live offers set this from `extra_cashback_tag`; only `true` shows the badge (#472). */
  showExtraCashbackTag?: boolean;
  trackingPeriod: readonly TrackingPeriodStep[];
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
  // Dynamic "Share & earn {n}%" copy from the live FeeRate.referral_bonus_percent
  // (single source of truth). Falls back to the fixture copy until/if the public
  // read resolves, so the card never flashes a broken or 0% bonus.
  const referralBonusPercent = useReferralBonusPercent();
  const referralCopy = buildReferralCardCopy(
    referralBonusPercent,
    shop.referral,
  );
  const policyResource = useCustomerAccountResource<
    CategoryPolicyPayload | null,
    CategoryPolicyPayload
  >({
    enabled:
      Boolean(shop.policyCategoryId) && merchantResource.source === "backend",
    fixtureData: null,
    merchantId: shop.policyCategoryId ?? "policy-unset",
    resourceId: "policyCategory",
  });
  const couponResource = useCustomerAccountResource<never[], unknown>({
    enabled:
      merchantResource.status === "ready" &&
      merchantResource.source === "backend",
    fixtureData: [],
    merchantId: shop.id,
    resourceId: "merchantCoupons",
  });
  const coupons = mapPublicShopCoupons(couponResource.data);
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

  // Mint the per-user tracked link WHILE the redirect overlay plays (~2.5s):
  // the raw tracking_link carries no aff_sub, so conversions through it cannot
  // credit the buyer. Any minting failure falls back to the raw link — losing
  // attribution is bad, losing the sale is worse.
  const session = useMobileSessionSnapshot();
  const mintedLinkRef = useRef<Promise<string | null> | null>(null);
  const redirectFallbackRef = useRef<string | undefined>(undefined);
  const allowSearchFallbackRef = useRef(true);
  // Guards a double-open when the awaited mint and a manual "Tap here" race.
  // Reset at the start of every redirect.
  const redirectOpenedRef = useRef(false);

  // Open the merchant exactly once + hide the overlay. `minted` is the per-user
  // tracked link when ready; null falls back to the raw tracking link (or a
  // brand search when allowed).
  const openDestination = (minted: string | null) => {
    if (redirectOpenedRef.current) return;
    redirectOpenedRef.current = true;
    setRedirecting(false);
    const destination =
      minted ||
      redirectFallbackRef.current ||
      (allowSearchFallbackRef.current
        ? `https://www.google.com/search?q=${encodeURIComponent(shop.brand)}`
        : null);
    if (!destination) return;
    void Linking.openURL(destination).catch(() => undefined);
  };

  // Redirect the MOMENT the mint resolves — a ready link opens instantly; a slow
  // one is capped by mintUserTrackingLink's AbortController, then falls back to
  // the raw link. No fixed minimum wait.
  const openMerchantUrl = async () => {
    const minted = await (mintedLinkRef.current ?? Promise.resolve(null));
    openDestination(minted);
  };

  const beginShopNowRedirect = () => {
    redirectOpenedRef.current = false;
    redirectFallbackRef.current = shop.trackingUrl;
    allowSearchFallbackRef.current = true;
    mintedLinkRef.current = mintUserTrackingLink({
      accessToken:
        typeof session?.access_token === "string"
          ? session.access_token
          : undefined,
      apiUrl: getMobileEnv().apiUrl,
      deeplink: "",
      merchantId: shop.merchantId,
      offerId: shop.offerId,
    });
    setRedirecting(true);
    void openMerchantUrl();
  };

  const beginCouponRedirect = (coupon: ShopCoupon) => {
    if (!coupon.destinationUrl) return;
    redirectOpenedRef.current = false;
    redirectFallbackRef.current = coupon.destinationUrl;
    allowSearchFallbackRef.current = false;
    mintedLinkRef.current = mintUserTrackingLink({
      accessToken:
        typeof session?.access_token === "string"
          ? session.access_token
          : undefined,
      apiUrl: getMobileEnv().apiUrl,
      deeplink: coupon.destinationUrl,
      merchantId: shop.merchantId,
      offerId: shop.offerId,
    });
    setRedirecting(true);
    void openMerchantUrl();
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

  const handleUseCoupon = (coupon: ShopCoupon) => {
    if (!coupon.destinationUrl) return;
    if (!authReady) return;
    if (!isAuthed) {
      setPendingShopNowIntent(shop.id, { couponId: coupon.id });
      router.push(buildLoginRedirectWithCallback(`/shop/${shop.id}`) as never);
      return;
    }
    beginCouponRedirect(coupon);
  };

  useEffect(() => {
    if (!authReady || !isAuthed || merchantResource.status !== "ready") {
      return;
    }

    const pending = peekPendingShopNowIntent(shop.id);
    if (!pending) return;
    if (
      pending.couponId &&
      (couponResource.status !== "ready" || couponResource.source !== "backend")
    ) {
      return;
    }

    const intent = consumePendingShopNowIntentDetails(shop.id);
    if (!intent) return;
    if (intent.couponId) {
      const coupon = coupons.find(
        (candidate) =>
          candidate.id === intent.couponId &&
          candidate.codeEnabled === false &&
          Boolean(candidate.destinationUrl),
      );
      if (coupon) beginCouponRedirect(coupon);
      return;
    }
    beginShopNowRedirect();
  }, [
    authReady,
    couponResource.source,
    couponResource.status,
    isAuthed,
    merchantResource.status,
    shop.id,
  ]);

  if (merchantResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody={tc(
          "This merchant does not have active cashback details yet.",
        )}
        emptyTitle={tc("No merchant details yet")}
        loadingSkeleton={<ShopDetailSkeleton />}
        resource={merchantResource}
        resourceLabel="merchant details"
      />
    );
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/" as never);
  };

  const shopPageContent = (
    <>
      <ShopHero
        isDesktop={isDesktop}
        onBack={handleBack}
        onShopNow={handleShopNow}
        shop={shop}
      />
      <View
        style={[styles.detailGrid, isDesktop ? styles.detailGridDesktop : null]}
      >
        <View
          style={[
            styles.leftColumn,
            isDesktop ? styles.leftColumnDesktop : null,
          ]}
        >
          <ShopCashbackRail shop={shop} />
          <ShopTrackingPeriod shop={shop} />
          <ShopReferralCard
            onShare={handleShareReferral}
            referralCopy={referralCopy}
          />
          {isDesktop ? <ShopTermsPanel terms={shopTerms} /> : null}
        </View>
        <View
          style={[
            styles.rightColumn,
            isDesktop ? styles.rightColumnDesktop : null,
          ]}
        >
          <ShopQuestBanner shop={shop} />
          <ShopCouponDeals
            coupons={coupons}
            emptySubtitle={shop.deals.emptySubtitle}
            emptyTitle={shop.deals.emptyTitle}
            onRetry={couponResource.retry}
            onUseCoupon={handleUseCoupon}
            status={couponResource.status}
            title={shop.deals.title}
          />
          <ShopCashbackTipsPanel shop={shop} />
        </View>
      </View>
      {!isDesktop ? <ShopTermsPanel terms={shopTerms} /> : null}
      <ShopExploreRelated excludeShopId={shop.id} />
    </>
  );

  const handleRefresh = () => {
    merchantResource.retry();
    couponResource.retry();
  };
  const refreshControl = (
    <RefreshControl
      onRefresh={handleRefresh}
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
            logoUri={shop.logoUri}
            onComplete={() => openDestination(null)}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.viewport}>
      <View
        style={[styles.phoneFrame, { maxWidth: homeLayout.contentMaxWidth }]}
      >
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
          <CustomerMobileBottomNav
            activeRouteId={undefined}
            bottomInset={insets.bottom}
          />
        ) : null}
      </View>
      {redirecting ? (
        <ShopRedirectOverlay
          brand={shop.brand}
          logoUri={shop.logoUri}
          onComplete={() => openDestination(null)}
        />
      ) : null}
    </View>
  );
}

function ShopHero({
  isDesktop,
  onBack,
  onShopNow,
  shop,
}: {
  isDesktop: boolean;
  onBack: () => void;
  onShopNow: () => void;
  shop: ShopDetail;
}) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const tc = useCopy();
  const { colors } = useTheme();
  const [bannerFailed, setBannerFailed] = useState(false);
  useEffect(() => {
    setBannerFailed(false);
  }, [shop.bannerUri]);
  const bannerSource =
    shop.bannerUri && !bannerFailed
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
        {/* Mobile/tablet have no other back affordance; desktop keeps its header. */}
        {!isDesktop ? (
          <MotionPressable
            accessibilityLabel={tc("Back")}
            accessibilityRole="button"
            hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
            onPress={onBack}
            pressScale={motion.scale.subtlePress}
            style={styles.heroBackButton}
          >
            <ChevronLeftIcon color={colors.ink} size={22} strokeWidth={2} />
          </MotionPressable>
        ) : null}
      </View>
      <ShopHeroSummaryCard
        isDesktop={isDesktop}
        onShopNow={onShopNow}
        shop={shop}
      />
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
  const tc = useCopy();
  const { isAuthed, ready: authReady } = useAuthGuardSession();
  const { isFavorite, toggleFavorite } = useFavoriteBrands();
  const favorited = isFavorite(shop.id);
  // #432 — Favorite is unavailable when logged out (hide, don't tease login).
  const showFavorite = authReady && isAuthed;
  const handleToggleFavorite = () => {
    if (!showFavorite) {
      return;
    }
    toggleFavorite(shop.id);
  };
  // #427 — banner already represents the brand on this page; do not show the
  // 1:1 logo chip before the name (cards still use the square logo).
  const brandIdentity = (
    <View style={styles.summaryTitleWrap}>
      <Text
        numberOfLines={isDesktop ? 1 : 2}
        style={[
          styles.summaryTitle,
          isDesktop ? null : styles.summaryTitleMobile,
        ]}
        testID="shop-detail-brand-name"
      >
        {shop.brand}
      </Text>
    </View>
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
      <Text style={styles.shopNowText}>{tc(shop.shopNowLabel)}</Text>
    </MotionPressable>
  );

  // Mobile is ONE row — logo → name (flex) → heart → Shop Now. The previous
  // stacked layout (identity row above a right-aligned actions row) left a
  // dead zone bottom-left for short brand names (design feedback 2026-07-10).
  return (
    <View
      style={[styles.summaryCard, isDesktop ? styles.summaryCardDesktop : null]}
    >
      {isDesktop ? (
        <>
          {brandIdentity}
          {showFavorite ? favoriteButton : null}
          {shopNowButton}
        </>
      ) : (
        <View style={styles.summaryMobileRow}>
          {brandIdentity}
          {showFavorite ? favoriteButton : null}
          {shopNowButton}
        </View>
      )}
    </View>
  );
}

function ShopCashbackRail({ shop }: { shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.cashbackRail}>
      <View style={styles.cashbackHeader}>
        <Text style={styles.cashbackLabel}>{tc("Cashback upto")}</Text>
        <Text style={styles.cashbackValue}>{shop.cashback}</Text>
      </View>
      <View style={styles.tagRow} accessibilityLabel="Offer highlights">
        <Link
          asChild
          href={`/category/${encodeURIComponent(shop.category)}` as never}
        >
          <MotionPressable pressScale={0.98} style={styles.categoryTag}>
            <ShirtIcon
              color={colors.ink}
              size={18}
              strokeWidth={typography.iconStrokeWidth}
            />
            <Text style={styles.tagText}>{shop.category}</Text>
          </MotionPressable>
        </Link>
        {shop.showExtraCashbackTag === true ? (
          <View style={styles.extraTag} testID="shop-detail-extra-cashback-tag">
            <Text style={styles.fireIcon}>🔥</Text>
            <Text style={styles.tagText}>
              {tc("Extra Cashback")}{" "}
              <Text style={styles.tagStrong}>{shop.extraCashback}</Text>
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.rateDetails}>
        <Text style={styles.disclaimer}>{tc(shop.disclaimer)}</Text>
        <Text style={styles.disclaimer}>{tc(shop.maxPerTransaction)}</Text>
        <View style={styles.rateSummaryRow}>
          <Text style={styles.rateSummaryText}>
            {tc("Cashback starting from")} {shop.rateSummary.from}
          </Text>
          <Text style={styles.rateSummaryText}>
            {tc("up to")} {shop.rateSummary.upTo}
          </Text>
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
          <Text style={styles.noteTitle}>{tc("NOTE")}</Text>
          <Text style={styles.noteBody}>{tc(shop.note)}</Text>
        </View>
      </View>
    </View>
  );
}

function ShopTrackingPeriod({ shop }: { shop: ShopDetail }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.trackingSection}>
      <Text style={styles.sectionTitle}>{tc("Cashback Tracking Period")}</Text>
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

// Tracking details like "within 30 day" carry a dynamic count, so the catalog
// can't hold every variant — translate the "within"/"day" halves around the
// number; anything else goes through tc() whole.
function translateTrackingDetail(
  detail: string,
  tc: (s: string) => string,
): string {
  const match = detail.match(/^within (\d+) day$/);
  if (match) {
    return `${tc("within")} ${match[1]} ${tc("day")}`;
  }
  return tc(detail);
}

function TrackingStepItem({
  showConnector,
  step,
}: {
  showConnector: boolean;
  step: TrackingStep;
}) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.trackingItemWrap}>
      <View style={styles.trackingItem}>
        <TrackingIcon name={step.icon} />
        <Text style={styles.trackingLabel}>{tc(step.label)}</Text>
        <Text style={styles.trackingDetail}>
          {translateTrackingDetail(step.detail, tc)}
        </Text>
        {/* Default subtitles ("from the following month" / "after validation")
            have catalog entries so tc() localizes them; admin-entered custom
            subtitles miss the catalog and render as-typed. */}
        {step.subtitle ? (
          <Text style={styles.trackingSubtitle}>{tc(step.subtitle)}</Text>
        ) : null}
      </View>
      {showConnector ? <View style={styles.trackingConnector} /> : null}
    </View>
  );
}

function TrackingIcon({ name }: { name: TrackingStep["icon"] }) {
  const { colors } = useTheme();
  const Icon =
    name === "shopping"
      ? ShoppingBagIcon
      : name === "check"
        ? CheckCircleIcon
        : BanknoteIcon;

  return (
    <Icon
      color={colors.muted}
      size={24}
      strokeWidth={typography.iconStrokeWidth}
    />
  );
}

function ShopReferralCard({
  onShare,
  referralCopy,
}: {
  onShare: () => void;
  referralCopy: ReferralCardCopy;
}) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.referralCard}>
      <View style={styles.referralIcon}>
        <BadgePercentIcon
          color={colors.primaryDark}
          size={26}
          strokeWidth={2}
        />
      </View>
      <View style={styles.referralCopy}>
        <Text numberOfLines={2} style={styles.referralTitle}>
          {tc(referralCopy.title)}
        </Text>
        <Text numberOfLines={2} style={styles.referralSubtitle}>
          {tc(referralCopy.subtitle)}
        </Text>
        <Text style={styles.referralBody}>{tc(referralCopy.body)}</Text>
      </View>
      <MotionPressable
        accessibilityRole="button"
        hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
        onPress={onShare}
        pressScale={0.98}
        style={styles.shareButton}
      >
        <ShareIcon color={colors.white} size={16} strokeWidth={2} />
        <Text style={styles.shareButtonText}>
          {tc(referralCopy.actionLabel)}
        </Text>
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

function ShopTermsPanel({ terms }: { terms: ShopTermsViewModel }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.termsPanel} testID="shop-detail-terms-panel">
      <View style={styles.termsHeader}>
        <Text style={styles.termsEmoji}>{terms.eyebrow}</Text>
        <View style={styles.termsTitleWrap}>
          <Text style={styles.sectionTitle}>{tc(terms.title)}</Text>
          <Text style={styles.termsSubtitle}>{tc(terms.subtitle)}</Text>
        </View>
        <InfoIcon
          color={colors.muted}
          size={20}
          strokeWidth={typography.iconStrokeWidth}
        />
      </View>
      <Text style={styles.termsSectionTitle}>{tc(terms.exclusionsTitle)}</Text>
      {terms.body ? (
        <Text style={styles.termsFreeformBody} testID="shop-detail-terms-body">
          {terms.body}
        </Text>
      ) : (
        <View style={styles.termsList}>
          {terms.bullets.map((bullet) => (
            <View key={bullet} style={styles.termBulletRow}>
              {/* #426 — muted legal markers, not tip-style green dots */}
              <Text style={styles.termBulletDot}>•</Text>
              <Text style={styles.termBulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Rail cards are the fixed-size compact BrandCard (144pt — the same card the
// home carousels scroll), so the related rail inherits tile retry + corners.
const FIXED_RELATED_CARD_WIDTH = 144;
const relatedCardMetrics = getScaledCompactBrandCardMetrics(
  FIXED_RELATED_CARD_WIDTH,
);

function ShopExploreRelated({ excludeShopId }: { excludeShopId: string }) {
  const styles = useThemedStyles(createShopDetailScreenStyles);
  const tc = useCopy();
  const { region } = useLocale();
  const { isAuthed, ready: authReady } = useAuthGuardSession();
  const showFavoriteHeart = authReady && isAuthed;
  const catalogResource = useCustomerAccountResource<
    OfferListResponse,
    OfferListResponse
  >({
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
      <Text style={styles.sectionTitle}>{tc("Explore other shops")}</Text>
      <ScrollView
        contentContainerStyle={styles.relatedRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {related.map((store) => (
          <BrandCard
            brand={store.brand}
            cardHeight={relatedCardMetrics.cardHeight}
            cardWidth={FIXED_RELATED_CARD_WIDTH}
            cashback={store.cashback}
            href={`/shop/${store.id}`}
            id={store.id}
            key={store.id}
            logoUri={store.logoUri}
            logoVisualHeight={relatedCardMetrics.logoVisualHeight}
            showFavoriteHeart={showFavoriteHeart}
            size="S"
            tint={store.tint}
          />
        ))}
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
      <Skeleton
        height={68}
        radius={radii.lg}
        style={styles.skeletonSummary}
        width="90%"
      />
      <SkeletonText lines={3} style={styles.skeletonBlock} />
      <SkeletonText lines={4} style={styles.skeletonBlock} />
    </View>
  );
}

export function createShopDetailScreenStyles(colors: ThemeColors) {
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
      // Follows the 1200x410 banner design ratio at every width — deliberately
      // no minimum-height override: one used to square the frame on phones,
      // making contentFit="cover" crop same-ratio banner art (2400x820 uploads)
      // hard on both sides. Pinned by shop-hero-banner-parity.test.ts.
      aspectRatio: 1200 / 410,
      backgroundColor: "#D9D9D9",
      borderRadius: 24,
      overflow: "hidden",
      position: "relative",
      width: "100%",
    },
    heroImage: {
      height: "100%",
      width: "100%",
    },
    heroBackButton: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radii.chip,
      boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      height: 40,
      justifyContent: "center",
      left: 12,
      position: "absolute",
      top: 12,
      width: 40,
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
    // Quiet secondary info — bright 16px ink competed with the mint hero rate
    // above and out-shouted the surrounding disclaimers (design feedback
    // 2026-07-10).
    rateSummaryText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.bodyWeight,
      lineHeight: 20,
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
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.bodyWeight,
    },
    productRateValue: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 16,
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
      // flex-start, not center: centring made the connector's position depend on the
      // TALLEST step in the row, so a short step's connector was placed by its neighbour.
      alignItems: "flex-start",
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
      // Half the 24px TrackingIcon, measured from the top of the step — so the line meets
      // the icon centre regardless of how tall the label/detail/subtitle stack below it
      // grows. The previous -34 was tuned against one snapshot and drifted with content.
      marginTop: 12,
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
    trackingSubtitle: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 10,
      fontWeight: typography.bodyWeight,
      lineHeight: 13,
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
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 16,
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
    // #466 — preserve admin newlines in freeform custom T&Cs (esp. web).
    termsFreeformBody: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
      ...(Platform.OS === "web"
        ? ({ whiteSpace: "pre-wrap" } as object)
        : null),
    },
    relatedSection: {
      gap: 18,
    },
    relatedRow: {
      gap: 12,
      paddingRight: spacing.md,
    },
  });
}
