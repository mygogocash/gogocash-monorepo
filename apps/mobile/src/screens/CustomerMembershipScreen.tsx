import { Link } from "expo-router";
import {
  Check as CheckIcon,
  ChevronLeft as ChevronLeftIcon,
  Headphones as HeadphonesIcon,
  Sparkles as SparklesIcon,
  Wallet as WalletIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerDesktopFooterSlot } from "@mobile/components/CustomerDesktopFooterSlot";
import { mobileShellLayout, webMembershipLanding } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

const memberBenefits = [
  "2 fee-free withdrawals",
  "20% boost for GoGoQuest",
  "20% boost for My Rating Score",
  "Priority customer support",
] as const;

const faqItems = [
  {
    answer:
      "All membership charges are in Thai Baht (THB). The price you see is the price you pay.",
    question: "What currency am I charged in?",
  },
  {
    answer:
      "Cancel from your account whenever you like. You keep access until the end of the period.",
    question: "Can I cancel anytime?",
  },
  {
    answer:
      "Membership benefits start after checkout completes and follow the in-app eligibility rules.",
    question: "When do member benefits start?",
  },
] as const;

export function CustomerMembershipScreen() {
  const insets = useSafeAreaInsets();
  const [billingAnnual, setBillingAnnual] = useState(true);

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
          <Link asChild href="/profile">
            <Pressable accessibilityRole="link" style={styles.backLink}>
              <ChevronLeftIcon
                color={colors.accent}
                size={26}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text style={styles.backLinkText}>GoGoPass</Text>
            </Pressable>
          </Link>

          <View style={styles.hero}>
            <Text style={styles.kicker}>Membership offer</Text>
            <Text style={styles.title}>Go premium for less than a coffee a week.</Text>
            <Text style={styles.body}>Unlock GoGoPass for ฿49/month or ฿490/year:</Text>
            <View style={styles.benefitList}>
              {memberBenefits.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <CheckIcon color={colors.primaryDark} size={18} strokeWidth={2.2} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.billingSection}>
            <Text style={styles.sectionTitle}>Choose your billing</Text>
            <Text style={styles.sectionBody}>
              Same membership - pick monthly flexibility or annual savings.
            </Text>
            <View accessibilityLabel="Billing period" style={styles.toggleRow}>
              <Pressable
                accessibilityState={{ selected: !billingAnnual }}
                onPress={() => setBillingAnnual(false)}
                style={[styles.billingChoice, !billingAnnual ? styles.billingChoiceActive : null]}
              >
                <Text style={styles.billingLabel}>Monthly</Text>
                <Text style={styles.billingAmount}>฿49/mo</Text>
                <Text style={styles.billingHint}>Billed monthly - cancel anytime</Text>
              </Pressable>
              <Pressable
                accessibilityState={{ selected: billingAnnual }}
                onPress={() => setBillingAnnual(true)}
                style={[styles.billingChoice, billingAnnual ? styles.billingChoiceActive : null]}
              >
                <Text style={styles.bestValue}>Best value</Text>
                <Text style={styles.billingLabel}>Annual</Text>
                <Text style={styles.billingAmount}>฿490/yr</Text>
                <Text style={styles.billingHint}>~฿41/mo effective when billed yearly</Text>
              </Pressable>
            </View>
            <View style={styles.disabledNotice}>
              <SparklesIcon color={colors.primaryDark} size={18} strokeWidth={2} />
              <Text style={styles.disabledText}>Online checkout is not available.</Text>
            </View>
            <Link asChild href="/pricing">
              <Pressable accessibilityRole="link" style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>
                  {billingAnnual ? "Get ฿490/year" : "Start for ฿49/month"}
                </Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.perksGrid}>
            <PerkCard
              icon="wallet"
              title="Fee-free withdrawals"
              body="Two member withdrawals each month."
            />
            <PerkCard
              icon="sparkles"
              title="Reward boosts"
              body="GoGoQuest and My Rating Score earn a 20% lift."
            />
            <PerkCard
              icon="support"
              title="Priority support"
              body="Member requests move through the support queue first."
            />
          </View>

          <View style={styles.savingsSection}>
            <Text style={styles.sectionTitle}>{webMembershipLanding.savings.heading}</Text>
            <Text style={styles.sectionBody}>{webMembershipLanding.savings.subtitle}</Text>
            <View style={styles.savingsCard}>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsRowLabel}>{webMembershipLanding.savings.monthlyLine}</Text>
                <Text style={styles.savingsRowValue}>{webMembershipLanding.savings.monthlyValue}</Text>
              </View>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsRowLabel}>{webMembershipLanding.savings.annualLine}</Text>
                <Text style={styles.savingsRowValue}>{webMembershipLanding.savings.annualValue}</Text>
              </View>
              <View style={[styles.savingsRow, styles.savingsRowTotal]}>
                <Text style={styles.savingsRowLabel}>{webMembershipLanding.savings.youSaveLabel}</Text>
                <Text style={styles.savingsRowAccent}>{webMembershipLanding.savings.youSaveValue}</Text>
              </View>
              <Text style={styles.savingsFootnote}>{webMembershipLanding.savings.footnote}</Text>
            </View>
          </View>

          <View style={styles.socialSection}>
            <Text style={styles.sectionTitle}>{webMembershipLanding.socialProof.heading}</Text>
            <Text style={styles.sectionBody}>{webMembershipLanding.socialProof.subtitle}</Text>
            <View style={styles.statsRow}>
              {webMembershipLanding.socialProof.stats.map((stat) => (
                <View key={stat.caption} style={styles.statCard}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statCaption}>{stat.caption}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>Billing & membership FAQ</Text>
            {faqItems.map((item) => (
              <View key={item.question} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              </View>
            ))}
          </View>
          <CustomerDesktopFooterSlot style={styles.desktopFooter} />
        </ScrollView>
      </View>
    </View>
  );
}

function PerkCard({
  body,
  icon,
  title,
}: {
  body: string;
  icon: "sparkles" | "support" | "wallet";
  title: string;
}) {
  const Icon = icon === "wallet" ? WalletIcon : icon === "support" ? HeadphonesIcon : SparklesIcon;

  return (
    <View style={styles.perkCard}>
      <View style={styles.perkIcon}>
        <Icon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <Text style={styles.perkTitle}>{title}</Text>
      <Text style={styles.perkBody}>{body}</Text>
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
  backLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  backLinkText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "800",
  },
  hero: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(0, 170, 128, 0.22)",
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
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  body: {
    color: colors.accentSoft,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 24,
  },
  benefitList: {
    gap: spacing.sm,
  },
  benefitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  benefitText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  billingSection: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
  },
  sectionBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
  toggleRow: {
    gap: spacing.md,
  },
  billingChoice: {
    backgroundColor: "#F7FAF8",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  billingChoiceActive: {
    backgroundColor: "#EAFBF6",
    borderColor: colors.primary,
  },
  bestValue: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  billingLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  billingAmount: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 26,
    fontWeight: "700",
  },
  billingHint: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  disabledNotice: {
    alignItems: "center",
    backgroundColor: "#F3FBF8",
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
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    justifyContent: "center",
    minHeight: 50,
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  perksGrid: {
    gap: spacing.md,
  },
  perkCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  perkIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  perkTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  perkBody: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  faqSection: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  faqItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  faqQuestion: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "800",
  },
  faqAnswer: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  savingsSection: {
    gap: spacing.md,
  },
  savingsCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  savingsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  savingsRowTotal: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  savingsRowLabel: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  savingsRowValue: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  savingsRowAccent: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "800",
  },
  savingsFootnote: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  socialSection: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  statValue: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "800",
  },
  statCaption: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 16,
    textAlign: "center",
  },
});
