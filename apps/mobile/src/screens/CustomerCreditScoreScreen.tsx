import { Link } from "expo-router";
import { ChevronLeft as ChevronLeftIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import type { DimensionValue } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { webCreditScorePage } from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

export function CustomerCreditScoreScreen() {
  return (
    <CreditScoreSubPage>
      <CreditScoreTopBar />
      <View style={styles.content}>
        <CreditScoreHero />
        <CreditScoreProgressCard />
        <CreditScoreBreakdown />
        <CreditScoreBenefits />
        <CreditScoreStreakCard />
        <CreditScoreBoostCard />
      </View>
    </CreditScoreSubPage>
  );
}

function CreditScoreSubPage({ children }: { children: ReactNode }) {
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={webCreditScorePage.title}>
      <View style={[styles.surface, styles.creditScoreSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function CreditScoreTopBar() {
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{webCreditScorePage.title}</Text>
      </Pressable>
    </Link>
  );
}

function CreditScoreHero() {
  const heroProgress = `${webCreditScorePage.score}%` as DimensionValue;

  return (
    <View style={styles.heroCard}>
      <View style={styles.cardTopStrip} />
      <Text style={styles.heroLabel}>{webCreditScorePage.heroLabel}</Text>
      <View style={styles.scoreStack}>
        <Text style={styles.scoreEmoji}>{webCreditScorePage.scoreEmoji}</Text>
        <Text style={styles.scoreValue}>{webCreditScorePage.score}</Text>
      </View>
      <ProgressTrack progress={heroProgress} slim />
      <Text style={styles.tierLabel}>{webCreditScorePage.tier}</Text>
      <Text style={styles.mutedCenter}>{webCreditScorePage.pointsToTrusted}</Text>
    </View>
  );
}

function CreditScoreProgressCard() {
  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressTitle}>{webCreditScorePage.progressTitle}</Text>
      <ProgressTrack progress="50%" />
      <Text style={styles.progressLabel}>{webCreditScorePage.progressLabel}</Text>
      <Text style={styles.mutedCenter}>{webCreditScorePage.pointsToTrusted}</Text>
    </View>
  );
}

function ProgressTrack({ progress, slim = false }: { progress: DimensionValue; slim?: boolean }) {
  return (
    <View style={[styles.progressTrack, slim ? styles.progressTrackSlim : null]}>
      <View style={[styles.progressFill, { width: progress }]} />
    </View>
  );
}

function CreditScoreBreakdown() {
  return (
    <View style={styles.breakdownSection}>
      <Text style={styles.breakdownTitle}>{webCreditScorePage.breakdownTitle}</Text>
      <Text style={styles.sectionLabel}>{webCreditScorePage.completeSectionLabel}</Text>
      <View style={styles.rowStack}>
        {webCreditScorePage.completeRows.map((row) => (
          <ScoreRow complete key={row.label} label={row.label} points={row.points} />
        ))}
      </View>

      <Text style={[styles.sectionLabel, styles.todoLabel]}>{webCreditScorePage.todoSectionLabel}</Text>
      <View style={styles.rowStack}>
        {webCreditScorePage.todoRows.map((row) => (
          <ScoreRow
            cta={row.cta}
            key={row.label}
            label={row.label}
            points={row.points}
            subLabel={"subLabel" in row ? row.subLabel : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function ScoreRow({
  complete = false,
  cta,
  label,
  points,
  subLabel,
}: {
  complete?: boolean;
  cta?: string;
  label: string;
  points: string;
  subLabel?: string;
}) {
  return (
    <View style={[styles.scoreRow, complete ? styles.scoreRowComplete : styles.scoreRowTodo]}>
      <View style={styles.scoreRowCopy}>
        <Text style={styles.scoreRowTitle}>
          {complete ? "✅ " : "🔒 "}
          {label}
        </Text>
        {subLabel ? <Text style={styles.scoreRowSub}>{subLabel}</Text> : null}
      </View>
      <View style={styles.pointsWrap}>
        <Text style={styles.pointsText}>{points}</Text>
        {cta ? (
          <Link asChild href={label === "Profile complete" ? "/profile/info" : "/"}>
            <Pressable style={styles.rowCta}>
              <Text style={styles.rowCtaText}>{cta}</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function CreditScoreBenefits() {
  return (
    <View style={styles.benefitsSection}>
      <Text style={styles.benefitsTitle}>{webCreditScorePage.benefitsTitle}</Text>
      <BenefitGroup label={webCreditScorePage.activeBenefitsLabel}>
        {webCreditScorePage.activeBenefits.map((item) => (
          <BenefitCard active item={item} key={item.label} />
        ))}
      </BenefitGroup>
      <BenefitGroup label={webCreditScorePage.lockedBenefitsLabel}>
        {webCreditScorePage.lockedBenefits.map((item) => (
          <BenefitCard item={item} key={item.label} locked />
        ))}
      </BenefitGroup>
      <BenefitGroup label={webCreditScorePage.comingSoonLabel}>
        {webCreditScorePage.comingBenefits.map((item) => (
          <BenefitCard item={item} key={item.label} />
        ))}
      </BenefitGroup>
    </View>
  );
}

function BenefitGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.benefitGroup}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.rowStack}>{children}</View>
    </View>
  );
}

function BenefitCard({
  active = false,
  item,
  locked = false,
}: {
  active?: boolean;
  item: { icon: string; label: string; note?: string; status?: string };
  locked?: boolean;
}) {
  return (
    <View style={[styles.benefitCard, locked ? styles.benefitCardLocked : null]}>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>
          <Text style={styles.benefitIcon}>{item.icon}</Text>
          {"  "}
          {item.label}
        </Text>
        {item.note ? <Text style={styles.benefitNote}>{item.note}</Text> : null}
      </View>
      {active || item.status ? (
        <Text style={[styles.statusPill, active ? styles.statusPillActive : null]}>
          {item.status ?? "Active"}
        </Text>
      ) : (
        <Text style={styles.lockIcon}>🔒</Text>
      )}
    </View>
  );
}

function CreditScoreStreakCard() {
  return (
    <View style={styles.streakCard}>
      <Text style={styles.streakTitle}>{webCreditScorePage.streakTitle}</Text>
      <Text style={styles.streakSubtitle}>{webCreditScorePage.streakSubtitle}</Text>
      <View style={styles.monthTrack}>
        {[1, 2, 3].map((month) => (
          <View key={month} style={styles.monthItem}>
            <View style={styles.monthDot} />
            <Text style={styles.monthLabel}>Month {month}</Text>
          </View>
        ))}
      </View>
      <View style={styles.monthRows}>
        {[1, 2, 3].map((month) => (
          <View key={month} style={styles.monthRow}>
            <Text style={styles.monthRowText}>Month {month}</Text>
            <Text style={styles.monthStatus}>{month === 2 ? "🔥 In progress" : "🔒 Locked"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CreditScoreBoostCard() {
  return (
    <View style={styles.boostCard}>
      <Text style={styles.boostTitle}>{webCreditScorePage.boostTitle}</Text>
      <Text style={styles.boostBody}>{webCreditScorePage.boostBody}</Text>
      <Link asChild href="/">
        <Pressable style={styles.boostButton}>
          <Text style={styles.boostButtonText}>{webCreditScorePage.boostCta}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    width: "100%",
  },
  creditScoreSurfaceBleed: {
    marginHorizontal: -8,
    marginTop: 18,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: 96,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    overflow: "hidden",
    padding: 20,
  },
  cardTopStrip: {
    backgroundColor: colors.primary,
    height: 6,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  heroLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 15,
    marginTop: 10,
    textAlign: "center",
  },
  scoreStack: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  scoreEmoji: {
    fontSize: 50,
    lineHeight: 56,
  },
  scoreValue: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 76,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 82,
  },
  progressTrack: {
    backgroundColor: "#F3F5F8",
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 12,
    overflow: "hidden",
    width: "100%",
  },
  progressTrackSlim: {
    borderWidth: 0,
    height: 7,
    marginTop: spacing.md,
  },
  progressFill: {
    backgroundColor: colors.primaryDark,
    height: "100%",
  },
  tierLabel: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
    textAlign: "center",
  },
  mutedCenter: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: "center",
  },
  progressCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    gap: spacing.sm,
    padding: 20,
  },
  progressTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  progressLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  breakdownSection: {
    gap: spacing.sm,
  },
  breakdownTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 38,
    fontWeight: "600",
    lineHeight: 44,
  },
  sectionLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  todoLabel: {
    marginTop: spacing.sm,
  },
  rowStack: {
    gap: spacing.sm,
  },
  scoreRow: {
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  scoreRowComplete: {
    backgroundColor: colors.card,
  },
  scoreRowTodo: {
    backgroundColor: "#F4F7F5",
  },
  scoreRowCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  scoreRowTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
  },
  scoreRowSub: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
  },
  pointsWrap: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  pointsText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
  },
  rowCta: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: radii.chip,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  rowCtaText: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
  },
  benefitsSection: {
    gap: spacing.md,
  },
  benefitsTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "600",
  },
  benefitGroup: {
    gap: spacing.sm,
  },
  benefitCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  benefitCardLocked: {
    opacity: 0.55,
  },
  benefitCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  benefitIcon: {
    fontSize: 16,
  },
  benefitTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  benefitNote: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
  },
  statusPill: {
    backgroundColor: "#F3F5F8",
    borderRadius: radii.chip,
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillActive: {
    backgroundColor: colors.primarySoft,
    color: colors.accent,
    fontWeight: "700",
  },
  lockIcon: {
    fontSize: 15,
  },
  streakCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#B7F0DC",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 20,
  },
  streakTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
  },
  streakSubtitle: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    marginTop: 4,
  },
  monthTrack: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.md,
  },
  monthItem: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  monthDot: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 36,
    width: 36,
  },
  monthLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "500",
  },
  monthRows: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  monthRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthRowText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  monthStatus: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "700",
  },
  boostCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#B7F0DC",
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 20,
  },
  boostTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  boostBody: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  boostButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 48,
  },
  boostButtonText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 15,
    fontWeight: "700",
  },
});
