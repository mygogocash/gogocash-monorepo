import { Image, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";

import walletNoDataImage from "../../../assets/wallet-no-data.png";
import type { CustomerAccountResourceStatus } from "@mobile/account/customerAccountResource";
import {
  createCouponEventId,
  recordCouponEngagement,
} from "@mobile/api/couponAnalytics";
import type { ShopCoupon } from "@mobile/api/shopCouponTypes";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { Skeleton, SkeletonText } from "@mobile/components/Skeleton";
import { useToast } from "@mobile/hooks/useToast";
import { useCopy } from "@mobile/i18n/useCopy";
import { getMobileEnv } from "@mobile/config/env";
import { copyToClipboard } from "@mobile/lib/clipboard";
import { haptics } from "@mobile/lib/haptics";
import { Copy as CopyIcon } from "@mobile/theme/icons";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { motion } from "@mobile/theme/motion";
import { radii, spacing, typography } from "@mobile/theme/tokens";

type ShopCouponDealsProps = {
  coupons: readonly ShopCoupon[];
  emptySubtitle: string;
  emptyTitle: string;
  onRetry: () => void;
  onUseCoupon: (coupon: ShopCoupon) => void;
  status: CustomerAccountResourceStatus;
  title: string;
};

function formatDiscount(coupon: ShopCoupon): string | null {
  const { discount } = coupon;
  if (discount === null || coupon.discountType === null) return null;
  const value = Number.isInteger(discount) ? discount : discount.toFixed(2);
  return coupon.discountType === "cash"
    ? coupon.discountCurrency
      ? `${coupon.discountCurrency} ${value} off`
      : `${value} off`
    : `${value}% off`;
}

export function ShopCouponDeals({
  coupons,
  emptySubtitle,
  emptyTitle,
  onRetry,
  onUseCoupon,
  status,
  title,
}: ShopCouponDealsProps) {
  const styles = useThemedStyles(createStyles);
  const tc = useCopy();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tc(title)}</Text>
      {status === "loading" ? <DealsLoadingState /> : null}
      {status === "error" || status === "offline" || status === "disabled" ? (
        <DealsErrorState onRetry={onRetry} />
      ) : null}
      {(status === "empty" || status === "ready") && coupons.length === 0 ? (
        <DealsEmptyState
          emptySubtitle={emptySubtitle}
          emptyTitle={emptyTitle}
        />
      ) : null}
      {coupons.length > 0 ? (
        <View accessibilityRole="list" style={styles.couponList}>
          {coupons.map((coupon) => (
            <ShopCouponCard
              coupon={coupon}
              key={coupon.id}
              onUseCoupon={onUseCoupon}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DealsLoadingState() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.loadingCard} testID="shop-coupon-loading">
      <Skeleton height={24} width="35%" />
      <SkeletonText lines={3} />
    </View>
  );
}

function DealsErrorState({ onRetry }: { onRetry: () => void }) {
  const styles = useThemedStyles(createStyles);
  const tc = useCopy();
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusText}>
        {tc("We could not load deals right now.")}
      </Text>
      <MotionPressable
        accessibilityLabel={tc("Retry loading deals")}
        accessibilityRole="button"
        onPress={onRetry}
        pressScale={motion.scale.subtlePress}
        style={styles.retryButton}
      >
        <Text style={styles.retryText}>{tc("Retry")}</Text>
      </MotionPressable>
    </View>
  );
}

function DealsEmptyState({
  emptySubtitle,
  emptyTitle,
}: {
  emptySubtitle: string;
  emptyTitle: string;
}) {
  const styles = useThemedStyles(createStyles);
  const tc = useCopy();
  return (
    <View style={styles.emptyCard}>
      <Image
        accessibilityLabel="No deals available"
        alt="No deals available"
        resizeMode="contain"
        source={walletNoDataImage}
        style={styles.emptyImage}
      />
      <Text style={styles.emptyTitle}>{tc(emptyTitle)}</Text>
      <Text style={styles.emptySubtitle}>{tc(emptySubtitle)}</Text>
    </View>
  );
}

function ShopCouponCard({
  coupon,
  onUseCoupon,
}: {
  coupon: ShopCoupon;
  onUseCoupon: (coupon: ShopCoupon) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const toast = useToast();
  const discount = formatDiscount(coupon);
  const apiUrl = getMobileEnv().apiUrl;
  const viewEventId = useRef(createCouponEventId("view"));
  const [termsExpanded, setTermsExpanded] = useState(false);

  useEffect(() => {
    void recordCouponEngagement({
      apiUrl,
      couponId: coupon.id,
      eventId: viewEventId.current,
      eventType: "view",
    });
  }, [apiUrl, coupon.id]);

  const handleCopyCode = () => {
    if (!coupon.code) return;
    void copyToClipboard(coupon.code).then((copied) => {
      if (!copied) return;
      toast.show(tc("Copied to clipboard"));
      void haptics.success();
      void recordCouponEngagement({
        apiUrl,
        couponId: coupon.id,
        eventId: createCouponEventId("copy"),
        eventType: "copy",
      });
    });
  };

  return (
    <View
      accessibilityLabel={coupon.name}
      accessibilityRole="summary"
      style={styles.couponCard}
    >
      <View style={styles.couponHeader}>
        <Text style={styles.couponName}>{coupon.name}</Text>
        {discount ? <Text style={styles.discountBadge}>{discount}</Text> : null}
      </View>
      {coupon.description ? (
        <Text style={styles.description}>{coupon.description}</Text>
      ) : null}
      {coupon.minimumSpend ? (
        <Text style={styles.metaText}>
          {tc("Minimum spend")} {coupon.minimumSpendCurrency ?? ""}{" "}
          {coupon.minimumSpend}
        </Text>
      ) : null}
      {coupon.startDate ? (
        <Text style={styles.metaText}>
          {tc("Valid from")} {coupon.startDate}
          {coupon.startTime ? ` ${coupon.startTime}` : ""}
        </Text>
      ) : null}
      {coupon.endDate ? (
        <Text style={styles.metaText}>
          {tc("Valid until")} {coupon.endDate}
          {coupon.endTime ? ` ${coupon.endTime}` : ""}
        </Text>
      ) : null}
      {coupon.eligibility ? (
        <Text style={styles.metaText}>
          {tc("Eligibility")} {coupon.eligibility}
        </Text>
      ) : null}
      {coupon.maxCap !== null ? (
        <Text style={styles.metaText}>
          {tc("Maximum discount")} {coupon.maxCapCurrency ?? ""} {coupon.maxCap}
        </Text>
      ) : null}
      {!coupon.oneTimeUse && coupon.usagePerUser !== null ? (
        <Text style={styles.metaText}>
          {coupon.usagePerUser} {tc("uses per user")}
        </Text>
      ) : coupon.oneTimeUse ? (
        <Text style={styles.metaText}>{tc("One use per user")}</Text>
      ) : null}
      {coupon.remainingQuantity !== null ? (
        <Text style={styles.metaText}>
          {coupon.remainingQuantity} {tc("remaining")}
        </Text>
      ) : null}
      {coupon.codeEnabled && coupon.code ? (
        <View style={styles.codeRow}>
          <Text selectable style={styles.codeText}>
            {coupon.code}
          </Text>
          <MotionPressable
            accessibilityLabel={`${tc("Copy code")} ${coupon.code}`}
            accessibilityRole="button"
            onPress={handleCopyCode}
            pressScale={motion.scale.subtlePress}
            style={styles.copyButton}
          >
            <CopyIcon color={colors.primaryDark} size={16} strokeWidth={2} />
            <Text style={styles.copyText}>{tc("Copy code")}</Text>
          </MotionPressable>
        </View>
      ) : coupon.codeEnabled ? (
        <Text accessibilityRole="alert" style={styles.unavailableText}>
          {tc("Coupon code unavailable")}
        </Text>
      ) : coupon.destinationUrl ? (
        <MotionPressable
          accessibilityLabel={`${tc("Use coupon")} ${coupon.name}`}
          accessibilityRole="button"
          onPress={() => onUseCoupon(coupon)}
          pressScale={motion.scale.subtlePress}
          style={styles.useButton}
        >
          <Text style={styles.useButtonText}>{tc("Use coupon")}</Text>
        </MotionPressable>
      ) : (
        <Text accessibilityRole="alert" style={styles.unavailableText}>
          {tc("Coupon link unavailable")}
        </Text>
      )}
      {coupon.termsAndConditions ? (
        <View style={styles.termsSection}>
          <MotionPressable
            accessibilityLabel={`${tc("Read terms & conditions for")} ${coupon.name}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: termsExpanded }}
            onPress={() => setTermsExpanded((expanded) => !expanded)}
            pressScale={motion.scale.subtlePress}
            style={styles.termsButton}
          >
            <Text style={styles.termsButtonText}>
              {tc(
                termsExpanded
                  ? "Hide terms & conditions"
                  : "Read terms & conditions",
              )}
            </Text>
          </MotionPressable>
          {termsExpanded ? (
            <Text style={styles.termsText}>{coupon.termsAndConditions}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      gap: spacing.lg,
    },
    sectionTitle: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 22,
      fontWeight: "700",
    },
    couponList: {
      gap: spacing.md,
    },
    couponCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
      padding: spacing.lg,
    },
    couponHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
    },
    couponName: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 18,
      fontWeight: "700",
    },
    discountBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radii.chip,
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
      overflow: "hidden",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    description: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 15,
      lineHeight: 22,
    },
    metaText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      lineHeight: 20,
    },
    codeRow: {
      alignItems: "center",
      backgroundColor: colors.fieldMuted,
      borderColor: colors.borderStrong,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "space-between",
      marginTop: spacing.xs,
      minHeight: 46,
      paddingHorizontal: spacing.md,
    },
    codeText: {
      color: colors.ink,
      flex: 1,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    copyButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      minHeight: 40,
      paddingHorizontal: spacing.sm,
    },
    copyText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
    },
    useButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      borderRadius: radii.chip,
      justifyContent: "center",
      marginTop: spacing.xs,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
    },
    useButtonText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
    },
    unavailableText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "600",
      marginTop: spacing.xs,
    },
    termsSection: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingTop: spacing.sm,
    },
    termsButton: {
      alignSelf: "flex-start",
      minHeight: 40,
      justifyContent: "center",
    },
    termsButtonText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
    },
    termsText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      lineHeight: 20,
    },
    loadingCard: {
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      gap: spacing.md,
      padding: spacing.lg,
    },
    statusCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    statusText: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 15,
      textAlign: "center",
    },
    retryButton: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: radii.chip,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: spacing.lg,
    },
    retryText: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "700",
    },
    emptyCard: {
      alignItems: "center",
      gap: spacing.sm,
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
      lineHeight: 22,
      maxWidth: 360,
      textAlign: "center",
    },
  });
}
