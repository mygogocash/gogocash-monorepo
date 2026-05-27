import { Link } from "expo-router";
import {
  AlertCircle as AlertIcon,
  ArrowLeftRight as SwapIcon,
  CalendarClock as CalendarIcon,
  CheckCircle2 as CheckIcon,
  CreditCard as CreditCardIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import { useCustomerAccountResource } from "@mobile/account/customerAccountResource";
import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const model = pageModels[mode];
  const billingResource = useCustomerAccountResource({
    fixtureData: model,
    resourceId: "billing",
  });

  if (billingResource.status !== "ready") {
    return (
      <CustomerAccountResourceState
        emptyBody="You do not have an active GoGoPass subscription yet."
        emptyTitle="No subscription yet"
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.kicker}>GoGo Membership</Text>
            <Text style={styles.title}>{model.title}</Text>
            <Text style={styles.body}>{model.body}</Text>
            <DisabledStripeNotice />
            <Link asChild href={model.ctaHref}>
              <Pressable accessibilityRole="link" style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>{model.ctaLabel}</Text>
              </Pressable>
            </Link>
          </View>

          {mode === "pricing" ? <PricingPanel period={period} setPeriod={setPeriod} /> : null}
          {mode === "subscription" ? <SubscriptionStatusPanel /> : null}
          {mode === "billing" ? <BillingPanel /> : null}
          <CustomerDesktopFooterSlot style={styles.desktopFooter} />
        </ScrollView>
      </View>
    </View>
  );
}

function DisabledStripeNotice() {
  return (
    <View style={styles.disabledNotice}>
      <AlertIcon color={colors.primaryDark} size={20} strokeWidth={typography.iconStrokeWidth} />
      <Text style={styles.disabledText}>{stripeDisabled}</Text>
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
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Pricing</Text>
      <View accessibilityLabel="Billing period" style={styles.toggleRow}>
        <Pressable
          accessibilityState={{ selected: period === "monthly" }}
          onPress={() => setPeriod("monthly")}
          style={[styles.toggleButton, period === "monthly" ? styles.toggleButtonActive : null]}
        >
          <Text style={styles.toggleText}>Monthly</Text>
        </Pressable>
        <Pressable
          accessibilityState={{ selected: period === "annual" }}
          onPress={() => setPeriod("annual")}
          style={[styles.toggleButton, period === "annual" ? styles.toggleButtonActive : null]}
        >
          <Text style={styles.toggleText}>Annual</Text>
          <Text style={styles.saveBadge}>Save ~16%</Text>
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
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.period}</Text>
            {plan.benefits.map((benefit) => (
              <View key={benefit} style={styles.planBenefitRow}>
                <CheckIcon color={colors.primaryDark} size={16} strokeWidth={2.2} />
                <Text style={styles.planBenefitText}>{benefit}</Text>
              </View>
            ))}
            <View style={styles.disabledPlanButton}>
              <Text style={styles.disabledPlanButtonText}>{plan.cta}</Text>
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
  return (
    <View style={styles.card}>
      <View style={styles.statusHeader}>
        <CreditCardIcon
          color={colors.primaryDark}
          size={26}
          strokeWidth={typography.iconStrokeWidth}
        />
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <Text style={styles.mutedText}>No active subscription</Text>
        </View>
      </View>
      <Text style={styles.body}>
        Unlock GoGoPass to access exclusive benefits and manage future renewals from Billing.
      </Text>
      <Link asChild href="/pricing">
        <Pressable accessibilityRole="link" style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>Change Plan</Text>
          <SwapIcon color={colors.primaryDark} size={18} strokeWidth={typography.iconStrokeWidth} />
        </Pressable>
      </Link>
    </View>
  );
}

function BillingPanel() {
  return (
    <View style={styles.card}>
      <View style={styles.statusHeader}>
        <CalendarIcon
          color={colors.primaryDark}
          size={26}
          strokeWidth={typography.iconStrokeWidth}
        />
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Your subscription</Text>
          <Text style={styles.mutedText}>Status: No active subscription</Text>
        </View>
      </View>
      <Text style={styles.body}>
        Billing portal access appears here after GoGoPass checkout creates a Stripe customer.
      </Text>
      <View style={styles.disabledPlanButton}>
        <Text style={styles.disabledPlanButtonText}>Manage Subscription</Text>
      </View>
      <Link asChild href="/pricing">
        <Pressable accessibilityRole="link" style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>View Plans</Text>
        </Pressable>
      </Link>
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
    backgroundColor: "#F6F6F6",
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
    backgroundColor: "#F9FAFB",
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
