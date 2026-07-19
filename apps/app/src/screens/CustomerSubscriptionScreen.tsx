import { Link, Redirect } from "expo-router";
import {
  AlertCircle as AlertIcon,
  ArrowLeftRight as SwapIcon,
  CalendarClock as CalendarIcon,
  CheckCircle2 as CheckIcon,
  CreditCard as CreditCardIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { isGoGoPassEnabled } from "@mobile/config/featureFlags";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { mapSubscriptionStatus } from "@mobile/api/billingMapper";
import { isCustomerSubscriptionStatus } from "@mobile/api/billingTypes";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { Skeleton, SkeletonText } from "@mobile/components/Skeleton";
import { haptics } from "@mobile/lib/haptics";
import { useCopy } from "@mobile/i18n/useCopy";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type SubscriptionMode = "pricing" | "subscription" | "billing";
type BillingPeriod = "annual" | "monthly";

const stripeDisabled = "Stripe checkout is not enabled in this environment.";

const planCards = [
  {
    benefits: ["Priority customer care", "Monthly warranty coupons", "Exclusive vouchers"],
    cta: "Subscribe for 49 THB / month",
    id: "thb_monthly_49",
    name: "Monthly",
    period: "49 THB / month",
  },
  {
    benefits: ["Best price", "Save ~16% vs paying monthly", "Same GoGoPass benefits"],
    cta: "Subscribe for 490 THB / year",
    id: "thb_annual_490",
    name: "GoGoPass Annual",
    period: "490 THB / year",
  },
] as const;

const pageModels = {
  billing: {
    body: "Review secure checkout, billing portal, and subscription status from one place.",
    ctaHref: "/pricing",
    ctaLabel: "View Plans",
    title: "My Subscription",
  },
  pricing: {
    body: "Cashback rewards, exclusive partner deals, and priority support - all in one plan.",
    ctaHref: "/membership",
    ctaLabel: "View membership page",
    title: "Unlock GoGoPass",
  },
  subscription: {
    body: "GoGoPass memberships use Stripe checkout. Open the membership page to compare plans.",
    ctaHref: "/pricing",
    ctaLabel: "View pricing",
    title: "Subscription",
  },
} satisfies Record<
  SubscriptionMode,
  { body: string; ctaHref: "/membership" | "/pricing"; ctaLabel: string; title: string }
>;

export function CustomerSubscriptionScreen({ mode }: { mode: SubscriptionMode }) {
  const styles = useThemedStyles(createSubscriptionScreenStyles);
  const tc = useCopy();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const model = pageModels[mode];
  const billingResource = useCustomerAccountResource({
    fixtureData: model,
    resourceId: "billing",
  });
  // Live subscription status (staging returns {enabled:false,status:"disabled"}
  // until Stripe env is configured). An active holder shouldn't be re-sold the
  // plan, so the hero CTA hides; everything else is unchanged.
  const liveSubscription = isCustomerSubscriptionStatus(billingResource.data)
    ? mapSubscriptionStatus(billingResource.data)
    : null;

  // GoGoPass rollout flag: this screen serves /pricing, /subscription and
  // /billing — one guard makes all three unreachable when hidden. Sits below
  // the hooks so the hook order stays unconditional.
  if (!isGoGoPassEnabled()) {
    return <Redirect href="/profile" />;
  }

  if (billingResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody={tc("You do not have an active GoGoPass subscription yet.")}
        emptyTitle={tc("No subscription yet")}
        loadingSkeleton={<SubscriptionSkeleton />}
        resource={billingResource}
        resourceLabel="billing"
      />
    );
  }

  return (
    <View style={styles.viewport}>
      <View style={styles.phoneFrame}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: Math.max(spacing.md, insets.top + spacing.md) },
          ]}
          refreshControl={
            <RefreshControl
              onRefresh={billingResource.retry}
              refreshing={false}
              title={tc("Loading…")}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.kicker}>{tc("GoGo Membership")}</Text>
            <Text style={styles.title}>{tc(model.title)}</Text>
            <Text style={styles.body}>{tc(model.body)}</Text>
            <DisabledStripeNotice />
            {liveSubscription?.isActive ? null : (
              <Link asChild href={model.ctaHref}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => haptics.impact()}
                  style={styles.primaryAction}
                >
                  <Text style={styles.primaryActionText}>{tc(model.ctaLabel)}</Text>
                </Pressable>
              </Link>
            )}
          </View>

          {mode === "pricing" ? <PricingPanel period={period} setPeriod={setPeriod} /> : null}
          {mode === "subscription" ? <SubscriptionStatusPanel /> : null}
          {mode === "billing" ? <BillingPanel /> : null}
          <CustomerDesktopFooterSlot
            innerPadding={mobileShellLayout.contentHorizontalPadding}
            style={styles.desktopFooter}
          />
        </ScrollView>
      </View>
    </View>
  );
}

// Content-shaped loading placeholder handed to the shared CustomerAccountResourceState's
// opt-in loadingSkeleton (B3 enhancement). Approximates the hero block (kicker + title +
// body lines + CTA) plus one status card so the loading state shows familiar chrome
// instead of the generic spinner. Decorative — Skeleton hides it from screen readers.
function SubscriptionSkeleton() {
  const styles = useThemedStyles(createSubscriptionScreenStyles);
  return (
    <View style={styles.viewport}>
      <View style={styles.phoneFrame}>
        <View style={[styles.page, styles.skeletonPage]}>
          <View style={styles.hero}>
            <Skeleton height={12} radius={radii.sm} width="35%" />
            <Skeleton height={28} radius={radii.md} width="70%" />
            <SkeletonText lines={2} />
            <Skeleton height={48} radius={radii.chip} style={styles.skeletonCta} width="100%" />
          </View>
          <View style={styles.card}>
            <Skeleton height={20} radius={radii.sm} width="50%" />
            <SkeletonText lines={2} />
          </View>
        </View>
      </View>
    </View>
  );
}

function DisabledStripeNotice() {
  const styles = useThemedStyles(createSubscriptionScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.disabledNotice}>
      <AlertIcon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      <Text style={styles.disabledText}>{tc(stripeDisabled)}</Text>
    </View>
  );
}

function PricingPanel({
  period,
  setPeriod,
}: {
  period: BillingPeriod;
  setPeriod: (period: BillingPeriod) => void;
}) {
  const styles = useThemedStyles(createSubscriptionScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{tc("Pricing")}</Text>
      <View accessibilityLabel={tc("Billing period")} style={styles.toggleRow}>
        <Pressable
          accessibilityState={{ selected: period === "monthly" }}
          onPress={() => setPeriod("monthly")}
          style={[styles.toggleButton, period === "monthly" ? styles.toggleButtonActive : null]}
        >
          <Text style={styles.toggleText}>{tc("Monthly")}</Text>
        </Pressable>
        <Pressable
          accessibilityState={{ selected: period === "annual" }}
          onPress={() => setPeriod("annual")}
          style={[styles.toggleButton, period === "annual" ? styles.toggleButtonActive : null]}
        >
          <Text style={styles.toggleText}>{tc("Annual")}</Text>
          <Text style={styles.saveBadge}>{tc("Save ~16%")}</Text>
        </Pressable>
      </View>
      <View style={styles.planStack}>
        {planCards.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              period === "annual" && plan.id === "thb_annual_490" ? styles.planCardActive : null,
              period === "monthly" && plan.id === "thb_monthly_49" ? styles.planCardActive : null,
            ]}
          >
            <Text numberOfLines={1} style={styles.planName}>
              {tc(plan.name)}
            </Text>
            <Text style={styles.planPrice}>{plan.period}</Text>
            {plan.benefits.map((benefit) => (
              <View key={benefit} style={styles.planBenefitRow}>
                <CheckIcon color={colors.primaryDark} size={16} strokeWidth={2.2} />
                <Text style={styles.planBenefitText}>{tc(benefit)}</Text>
              </View>
            ))}
            <View style={styles.disabledPlanButton}>
              <Text style={styles.disabledPlanButtonText}>{tc(plan.cta)}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.comparisonPanel}>
        <Text style={styles.comparisonText}>49 THB x 12 = 588 THB</Text>
        <Text style={styles.comparisonText}>490 THB / year</Text>
        <Text style={styles.comparisonHighlight}>Save 98 THB (~16%)</Text>
      </View>
    </View>
  );
}

function SubscriptionStatusPanel() {
  const styles = useThemedStyles(createSubscriptionScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.card}>
      <View style={styles.statusHeader}>
        <CreditCardIcon
          color={colors.primaryDark}
          size={26}
          strokeWidth={typography.iconStrokeWidth}
        />
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>{tc("Subscription")}</Text>
          <Text numberOfLines={1} style={styles.mutedText}>
            {tc("No active subscription")}
          </Text>
        </View>
      </View>
      <Text style={styles.body}>
        {tc("Unlock GoGoPass to access exclusive benefits and manage future renewals from Billing.")}
      </Text>
      <Link asChild href="/pricing">
        <Pressable
          accessibilityRole="link"
          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
          onPress={() => haptics.impact()}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>{tc("Change Plan")}</Text>
          <SwapIcon color={colors.primaryDark} size={18} strokeWidth={typography.iconStrokeWidth} />
        </Pressable>
      </Link>
    </View>
  );
}

function BillingPanel() {
  const styles = useThemedStyles(createSubscriptionScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <View style={styles.card}>
      <View style={styles.statusHeader}>
        <CalendarIcon
          color={colors.primaryDark}
          size={26}
          strokeWidth={typography.iconStrokeWidth}
        />
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>{tc("Your subscription")}</Text>
          <Text numberOfLines={1} style={styles.mutedText}>
            {tc("Status: No active subscription")}
          </Text>
        </View>
      </View>
      <Text style={styles.body}>
        {tc("Billing portal access appears here after GoGoPass checkout creates a Stripe customer.")}
      </Text>
      <View style={styles.disabledPlanButton}>
        <Text style={styles.disabledPlanButtonText}>{tc("Manage Subscription")}</Text>
      </View>
      <Link asChild href="/pricing">
        <Pressable
          accessibilityRole="link"
          hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
          onPress={() => haptics.impact()}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>{tc("View Plans")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function createSubscriptionScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  viewport: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
  },
  phoneFrame: {
    backgroundColor: colors.background,
    flex: 1,
    maxWidth: mobileShellLayout.contentMaxWidth,
    width: "100%",
  },
  page: {
    gap: spacing.homeStackGap,
    paddingBottom: mobileShellLayout.bottomNavClearance,
    paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
  },
  desktopFooter: {
    marginTop: 64,
  },
  skeletonPage: {
    paddingTop: spacing.lg,
  },
  skeletonCta: {
    marginTop: spacing.sm,
  },
  hero: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(0, 170, 128, 0.18)",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  kicker: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.headline,
    fontWeight: "700",
  },
  body: {
    color: colors.accentSoft,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 23,
  },
  disabledNotice: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  disabledText: {
    color: colors.accent,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "800",
    lineHeight: 18,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 48,
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
  },
  toggleRow: {
    backgroundColor: colors.background,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
  },
  toggleButton: {
    alignItems: "center",
    borderRadius: radii.chip,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.card,
    boxShadow: shadows.cardCss,
  },
  toggleText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  saveBadge: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 10,
    fontWeight: "700",
  },
  planStack: {
    gap: spacing.md,
  },
  planCard: {
    backgroundColor: colors.fieldMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  planCardActive: {
    backgroundColor: "#EAFBF6",
    borderColor: colors.primary,
  },
  planName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  planPrice: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "700",
  },
  planBenefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  planBenefitText: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  disabledPlanButton: {
    alignItems: "center",
    backgroundColor: "#EEF2F0",
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  disabledPlanButtonText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  comparisonPanel: {
    backgroundColor: "#F3FBF8",
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  comparisonText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  comparisonHighlight: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  statusHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  mutedText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  secondaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.primary,
    borderRadius: radii.chip,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "700",
  },
});
}

