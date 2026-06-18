import { Link } from "expo-router";
import { useState } from "react";
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
import merchantCashbackTipsImage from "../../assets/shop/merchant-cashback-tips-terms.png";
import questBannerImage from "../../assets/quest-banner-en.png";
import walletNoDataImage from "../../assets/wallet-no-data.png";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { mapMerchantOfferToShopDetail } from "@mobile/api/merchantMapper";
import { isMerchantOfferResponse } from "@mobile/api/merchantTypes";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { CustomerMobileBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { ShopRedirectOverlay } from "@mobile/components/ShopRedirectOverlay";
import { Skeleton, SkeletonText } from "@mobile/components/Skeleton";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import {
  getResponsiveHomeLayoutMetrics,
  getShopDirectoryResults,
  mobileShellLayout,
  webShopDetailGroceryGalaxy,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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
  id: string;
  logoUri?: string;
  trackingUrl?: string;
};
type TrackingStep = ShopDetail["trackingPeriod"][number];

export function CustomerShopDetailScreen({ shopId }: { shopId?: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tc = useCopy();
  const toast = useToast();
  const homeLayout = getResponsiveHomeLayoutMetrics(width);
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

  // Share the merchant referral link, then confirm with a transient toast + success haptic.
  // Reuses the existing translated "Copied to clipboard" string (tc reverse-looks it up to
  // the walletTransactionsCopied catalog key -> Thai "คัดลอกแล้ว"), so no new copy is added.
  // The mock has no real shareable URL yet, so this is the affordance + feedback wiring.
  const handleShareReferral = () => {
    toast.show(tc("Copied to clipboard"));
    void haptics.success();
  };

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

  return (
    <View style={styles.viewport}>
      <View style={[styles.frame, { maxWidth: homeLayout.contentMaxWidth }]}>
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
          refreshControl={
            <RefreshControl
              onRefresh={merchantResource.retry}
              refreshing={false}
              title={tc("Loading…")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ShopHero onShopNow={() => setRedirecting(true)} shop={shop} />
          <View style={[styles.detailGrid, isDesktop ? styles.detailGridDesktop : null]}>
            <View style={[styles.leftColumn, isDesktop ? styles.leftColumnDesktop : null]}>
              <ShopCashbackRail shop={shop} />
              <ShopTrackingPeriod shop={shop} />
              <ShopReferralCard onShare={handleShareReferral} shop={shop} />
              {isDesktop ? <ShopTermsPanel shop={shop} /> : null}
            </View>
            <View style={[styles.rightColumn, isDesktop ? styles.rightColumnDesktop : null]}>
              <ShopQuestBanner shop={shop} />
              <ShopDealsEmptyState shop={shop} />
              <ShopCashbackTips shop={shop} />
            </View>
          </View>
          {!isDesktop ? <ShopTermsPanel shop={shop} /> : null}
          <ShopExploreRelated />
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
            // Hand the user off to the admin-managed affiliate tracking URL when live
            // backend data supplies one; fixtures fall back to a brand search.
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

function ShopHero({ onShopNow, shop }: { onShopNow: () => void; shop: ShopDetail }) {
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroBanner}>
        <Image
          accessibilityLabel={`${shop.brand} promotion banner`}
          alt={`${shop.brand} promotion banner`}
          resizeMode="cover"
          source={shop.bannerUri ? { uri: shop.bannerUri } : shopBannerAssets[shop.bannerAsset]}
          style={styles.heroImage}
        />
        <View style={styles.logoBadge}>
          {shop.logoUri ? (
            <Image
              accessibilityLabel={`${shop.brand} logo`}
              alt={`${shop.brand} logo`}
              resizeMode="contain"
              source={{ uri: shop.logoUri }}
              style={styles.logoImage}
            />
          ) : (
            <Text style={styles.logoText}>{shop.logoText}</Text>
          )}
        </View>
      </View>
      <ShopHeroSummaryCard onShopNow={onShopNow} shop={shop} />
    </View>
  );
}

function ShopHeroSummaryCard({ onShopNow, shop }: { onShopNow: () => void; shop: ShopDetail }) {
  return (
    <View style={styles.summaryCard}>
      <Text numberOfLines={1} style={styles.summaryTitle}>
        {shop.brand}
      </Text>
      <MotionPressable
        accessibilityLabel={`Favorite ${shop.brand}`}
        pressScale={0.96}
        style={styles.favoriteButton}
      >
        <HeartIcon color={colors.primaryDark} fill={colors.primaryDark} size={20} strokeWidth={0} />
      </MotionPressable>
      <MotionPressable
        accessibilityLabel={`Shop now at ${shop.brand}`}
        accessibilityRole="button"
        onPress={onShopNow}
        pressScale={0.98}
        style={styles.shopNowButton}
      >
        <Text style={styles.shopNowText}>{shop.shopNowLabel}</Text>
      </MotionPressable>
    </View>
  );
}

function ShopCashbackRail({ shop }: { shop: ShopDetail }) {
  return (
    <View style={styles.cashbackRail}>
      <View style={styles.cashbackHeader}>
        <Text style={styles.cashbackLabel}>Cashback up to</Text>
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
  const Icon =
    name === "shopping" ? ShoppingBagIcon : name === "check" ? CheckCircleIcon : BanknoteIcon;

  return <Icon color={colors.muted} size={24} strokeWidth={typography.iconStrokeWidth} />;
}

function ShopReferralCard({ onShare, shop }: { onShare: () => void; shop: ShopDetail }) {
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

function ShopCashbackTips({ shop }: { shop: ShopDetail }) {
  const illustrationAspectRatio =
    shop.cashbackTips.illustrationWidth / shop.cashbackTips.illustrationHeight;

  return (
    <View style={styles.cashbackTipsSection}>
      <View style={styles.cashbackTipsHeader}>
        <Text style={styles.cashbackTipsEmoji}>💡</Text>
        <Text style={styles.cashbackTipsTitle}>{shop.cashbackTips.title}</Text>
      </View>
      <View style={[styles.cashbackTipsFigure, { aspectRatio: illustrationAspectRatio }]}>
        <Image
          accessibilityLabel={shop.cashbackTips.illustrationAlt}
          alt={shop.cashbackTips.illustrationAlt}
          resizeMode="contain"
          source={merchantCashbackTipsImage}
          style={styles.cashbackTipsImage}
        />
      </View>
    </View>
  );
}

function ShopTermsPanel({ shop }: { shop: ShopDetail }) {
  return (
    <View style={styles.termsPanel}>
      <View style={styles.termsHeader}>
        <Text style={styles.termsEmoji}>{shop.terms.eyebrow}</Text>
        <View style={styles.termsTitleWrap}>
          <Text style={styles.sectionTitle}>{shop.terms.title}</Text>
          <Text style={styles.termsSubtitle}>{shop.terms.subtitle}</Text>
        </View>
        <InfoIcon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <Text style={styles.termsSectionTitle}>{shop.terms.exclusionsTitle}</Text>
      <View style={styles.termsList}>
        {shop.terms.bullets.map((bullet) => (
          <View key={bullet} style={styles.termBulletRow}>
            <Text style={styles.termBulletDot}>•</Text>
            <Text style={styles.termBulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ShopExploreRelated() {
  const related = getShopDirectoryResults().filter(
    (store) => store.id !== webShopDetailGroceryGalaxy.id
  );

  return (
    <View style={styles.relatedSection}>
      <Text style={styles.sectionTitle}>Explore other shops</Text>
      <ScrollView
        contentContainerStyle={styles.relatedRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {related.slice(0, 6).map((store) => (
          <Link asChild href={`/shop/${store.id}` as never} key={store.id}>
            <MotionPressable pressScale={0.98} style={styles.relatedCard}>
              <View style={[styles.relatedVisual, { backgroundColor: store.tint }]}>
                <Image
                  alt={`${store.brand} logo`}
                  accessibilityLabel={`${store.brand} logo`}
                  resizeMode="contain"
                  source={{ uri: store.logoUri }}
                  style={styles.relatedLogoImage}
                />
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
                <Text style={styles.relatedCashbackCaption}>Cashback up to</Text>
                <Text style={styles.relatedCashbackValue}>{store.cashback}</Text>
              </View>
            </MotionPressable>
          </Link>
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
  return (
    <View style={styles.skeletonWrap} testID="shop-detail-skeleton">
      <Skeleton height={200} radius={radii.lg} width="100%" />
      <Skeleton height={68} radius={radii.lg} style={styles.skeletonSummary} width="90%" />
      <SkeletonText lines={3} style={styles.skeletonBlock} />
      <SkeletonText lines={4} style={styles.skeletonBlock} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  logoBadge: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    boxShadow: "0 8px 22px rgba(0,0,0,0.12)",
    height: 58,
    justifyContent: "center",
    left: 34,
    position: "absolute",
    top: 72,
    width: 64,
  },
  logoText: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0,
  },
  logoImage: {
    height: 44,
    width: 50,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 32,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
    marginTop: -39,
    paddingHorizontal: 18,
    paddingVertical: 12,
    width: "90%",
    zIndex: 2,
  },
  summaryTitle: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
    minWidth: 0,
  },
  favoriteButton: {
    alignItems: "center",
    backgroundColor: "#E6F7ED",
    borderColor: "#E6F7ED",
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  shopNowButton: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radii.chip,
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
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
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
    backgroundColor: "#F7FDFB",
    borderColor: "#C8EBE0",
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
    backgroundColor: "#F7FDFB",
    borderColor: "#C8EBE0",
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
    backgroundColor: colors.white,
    borderColor: "#C8EBE0",
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
  cashbackTipsSection: {
    alignItems: "flex-start",
    gap: 16,
    minWidth: 0,
    width: "100%",
  },
  cashbackTipsHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  cashbackTipsEmoji: {
    fontSize: 20,
    height: 24,
    lineHeight: 24,
    textAlign: "center",
    width: 24,
  },
  cashbackTipsTitle: {
    color: "#000000",
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 30,
  },
  cashbackTipsFigure: {
    backgroundColor: "#F0FDFA",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 0,
    overflow: "hidden",
    width: "100%",
  },
  cashbackTipsImage: {
    height: "100%",
    width: "100%",
  },
  termsPanel: {
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
    color: colors.textSoft,
    flex: 1,
    fontFamily: typography.family,
    fontSize: 11,
  },
  relatedCashbackValue: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
});
