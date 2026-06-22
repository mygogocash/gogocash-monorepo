import { Link } from "expo-router";
import {
  Check as CheckIcon,
  ChevronLeft as ChevronLeftIcon,
  Headphones as HeadphonesIcon,
  Plus as PlusIcon,
  Sparkles as SparklesIcon,
  Wallet as WalletIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import { mobileShellLayout, webMembershipLanding } from "@mobile/design/webDesignParity";
import type { ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

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

// Web parity: the pricing trust strip under the CTA (billed in THB / cancel / access).
const MEMBERSHIP_TRUST = [
  "Billed in THB",
  "Cancel anytime",
  "Access through the period",
] as const;

export function CustomerMembershipScreen() {
  const styles = useThemedStyles(createMembershipScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const [billingAnnual, setBillingAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc("GoGoPass")}>
      <View style={styles.membershipStack}>
          {/* Mobile-only back link — on desktop the persistent sidebar handles navigation
              (web parity: the SubPage topbar is md:hidden). */}
          {isDesktop ? null : (
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
          )}

          <View style={styles.hero}>
            <Text style={styles.kicker}>{tc("Membership offer")}</Text>
            <Text style={styles.title}>{tc("Go premium for less than a coffee a week.")}</Text>
            <Text style={styles.body}>{tc("Unlock GoGoPass for ฿49/month or ฿490/year:")}</Text>
            <View style={styles.benefitList}>
              {memberBenefits.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <CheckIcon color={colors.primaryDark} size={18} strokeWidth={2.2} />
                  <Text numberOfLines={2} style={styles.benefitText}>{tc(benefit)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.billingSection}>
            <Text style={styles.sectionTitle}>{tc("Choose your billing")}</Text>
            <Text style={styles.sectionBody}>
              {tc("Same membership - pick monthly flexibility or annual savings.")}
            </Text>
            <View accessibilityLabel={tc("Billing period")} style={styles.toggleRow}>
              <Pressable
                accessibilityState={{ selected: !billingAnnual }}
                onPress={() => {
                  // Medium-impact haptic on billing-cycle selection (fire-and-forget; web no-op).
                  void haptics.impact();
                  setBillingAnnual(false);
                }}
                style={[styles.billingChoice, !billingAnnual ? styles.billingChoiceActive : null]}
              >
                <Text numberOfLines={1} style={styles.billingLabel}>{tc("Monthly")}</Text>
                <Text style={styles.billingAmount}>฿49/mo</Text>
                <Text numberOfLines={2} style={styles.billingHint}>{tc("Billed monthly - cancel anytime")}</Text>
              </Pressable>
              <Pressable
                accessibilityState={{ selected: billingAnnual }}
                onPress={() => {
                  // Medium-impact haptic on billing-cycle selection (fire-and-forget; web no-op).
                  void haptics.impact();
                  setBillingAnnual(true);
                }}
                style={[styles.billingChoice, billingAnnual ? styles.billingChoiceActive : null]}
              >
                <Text style={styles.bestValue}>{tc("Best value")}</Text>
                <Text numberOfLines={1} style={styles.billingLabel}>{tc("Annual")}</Text>
                <Text style={styles.billingAmount}>฿490/yr</Text>
                <Text numberOfLines={2} style={styles.billingHint}>{tc("~฿41/mo effective when billed yearly")}</Text>
              </Pressable>
            </View>
            <View style={styles.disabledNotice}>
              <SparklesIcon color={colors.primaryDark} size={18} strokeWidth={2} />
              <Text style={styles.disabledText}>{tc("Online checkout is not available.")}</Text>
            </View>
            <Link asChild href="/pricing">
              <Pressable
                accessibilityRole="link"
                // Success haptic on the subscribe/checkout CTA (fire-and-forget; web no-op).
                // Additive: the Link's navigation handler to /pricing still runs.
                onPress={() => void haptics.success()}
                style={styles.primaryAction}
              >
                <Text numberOfLines={1} style={styles.primaryActionText}>
                  {tc(billingAnnual ? "Get ฿490/year" : "Start for ฿49/month")}
                </Text>
              </Pressable>
            </Link>
            <View style={styles.trustStrip}>
              {MEMBERSHIP_TRUST.map((item) => (
                <View key={item} style={styles.trustItem}>
                  <CheckIcon color={colors.primaryDark} size={14} strokeWidth={2.4} />
                  <Text style={styles.trustText}>{tc(item)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Desktop: the three perks sit side by side as equal columns; mobile stays stacked. */}
          <View style={[styles.perksGrid, isDesktop ? styles.perksGridDesktop : null]}>
            <PerkCard
              desktop={isDesktop}
              icon="wallet"
              title="Fee-free withdrawals"
              body="Two member withdrawals each month."
            />
            <PerkCard
              desktop={isDesktop}
              icon="sparkles"
              title="Reward boosts"
              body="GoGoQuest and My Rating Score earn a 20% lift."
            />
            <PerkCard
              desktop={isDesktop}
              icon="support"
              title="Priority support"
              body="Member requests move through the support queue first."
            />
          </View>

          <View style={styles.savingsSection}>
            <Text style={styles.sectionTitle}>{tc(webMembershipLanding.savings.heading)}</Text>
            <Text style={styles.sectionBody}>{tc(webMembershipLanding.savings.subtitle)}</Text>
            <View style={styles.savingsCard}>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsRowLabel}>{tc(webMembershipLanding.savings.monthlyLine)}</Text>
                <Text style={styles.savingsRowValue}>{webMembershipLanding.savings.monthlyValue}</Text>
              </View>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsRowLabel}>{tc(webMembershipLanding.savings.annualLine)}</Text>
                <Text style={styles.savingsRowValue}>{webMembershipLanding.savings.annualValue}</Text>
              </View>
              <View style={[styles.savingsRow, styles.savingsRowTotal]}>
                <Text style={styles.savingsRowLabel}>{tc(webMembershipLanding.savings.youSaveLabel)}</Text>
                <Text style={styles.savingsRowAccent}>{webMembershipLanding.savings.youSaveValue}</Text>
              </View>
              <Text style={styles.savingsFootnote}>{tc(webMembershipLanding.savings.footnote)}</Text>
            </View>
          </View>

          <View style={styles.socialSection}>
            <Text style={styles.sectionTitle}>{tc(webMembershipLanding.socialProof.heading)}</Text>
            <Text style={styles.sectionBody}>{tc(webMembershipLanding.socialProof.subtitle)}</Text>
            <View style={styles.statsRow}>
              {webMembershipLanding.socialProof.stats.map((stat) => (
                <View key={stat.caption} style={styles.statCard}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statCaption}>{tc(stat.caption)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>{tc("Billing & membership FAQ")}</Text>
            {faqItems.map((item, index) => {
              const open = index === openFaq;
              return (
                <View key={item.question} style={styles.faqItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenFaq(open ? -1 : index)}
                    style={styles.faqQuestionRow}
                  >
                    <Text numberOfLines={2} style={styles.faqQuestion}>
                      {tc(item.question)}
                    </Text>
                    <View style={open ? styles.faqIconOpen : null}>
                      <PlusIcon color={colors.primaryDark} size={20} strokeWidth={2.2} />
                    </View>
                  </Pressable>
                  {open ? (
                    <Text numberOfLines={4} style={styles.faqAnswer}>
                      {tc(item.answer)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
      </View>
    </AccountPageShell>
  );
}

function PerkCard({
  body,
  desktop = false,
  icon,
  title,
}: {
  body: string;
  desktop?: boolean;
  icon: "sparkles" | "support" | "wallet";
  title: string;
}) {
  const styles = useThemedStyles(createMembershipScreenStyles);
  const { colors } = useTheme();
  const Icon = icon === "wallet" ? WalletIcon : icon === "support" ? HeadphonesIcon : SparklesIcon;
  const tc = useCopy();

  return (
    <View style={[styles.perkCard, desktop ? styles.perkCardDesktop : null]}>
      <View style={styles.perkIcon}>
        <Icon color={colors.primaryDark} size={22} strokeWidth={typography.iconStrokeWidth} />
      </View>
      <Text numberOfLines={2} style={styles.perkTitle}>{tc(title)}</Text>
      <Text numberOfLines={3} style={styles.perkBody}>{tc(body)}</Text>
    </View>
  );
}

function createMembershipScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
  membershipStack: {
    gap: spacing.homeStackGap,
    width: "100%",
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
  trustStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  trustItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  trustText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  perksGrid: {
    gap: spacing.md,
  },
  perksGridDesktop: {
    alignItems: "stretch",
    flexDirection: "row",
  },
  perkCardDesktop: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
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
  faqQuestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  faqIconOpen: {
    transform: [{ rotate: "45deg" }],
  },
  faqQuestion: {
    color: colors.ink,
    flex: 1,
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
}

