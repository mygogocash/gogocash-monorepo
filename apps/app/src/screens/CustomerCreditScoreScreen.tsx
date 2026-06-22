import { Link } from "expo-router";
import { ChevronLeft as ChevronLeftIcon } from "@mobile/theme/icons";
import type { ReactNode } from "react";
import { Fragment } from "react";
import type { DimensionValue, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import { mobileShellLayout, webCreditScorePage } from "@mobile/design/webDesignParity";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, shadows, spacing, typography } from "@mobile/theme/tokens";

export function CustomerCreditScoreScreen() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;

  return (
    <CreditScoreSubPage>
      {/* Mobile-only back link — on desktop the persistent sidebar handles navigation
          (web parity: the SubPage topbar is md:hidden). */}
      {isDesktop ? null : <CreditScoreTopBar />}
      {/* Web parity: the page is a centered column capped at max-w-2xl (672px) on desktop. */}
      <View style={[styles.content, isDesktop ? styles.contentDesktop : null]}>
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
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <AccountPageShell activeRouteId="profile" showTitle={false} title={tc(webCreditScorePage.title)}>
      <View style={[styles.surface, styles.creditScoreSurfaceBleed]}>{children}</View>
    </AccountPageShell>
  );
}

function CreditScoreTopBar() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const { colors } = useTheme();
  const tc = useCopy();
  return (
    <Link asChild href="/profile">
      <Pressable accessibilityRole="link" style={styles.topBar}>
        <ChevronLeftIcon color={colors.accent} size={26} strokeWidth={typography.iconStrokeWidth} />
        <Text style={styles.topBarTitle}>{tc(webCreditScorePage.title)}</Text>
      </Pressable>
    </Link>
  );
}

function CreditScoreHero() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  const heroProgress = `${webCreditScorePage.score}%` as DimensionValue;

  return (
    <View style={styles.heroCard}>
      <View style={styles.cardTopStrip} />
      <Text style={styles.heroLabel}>{tc(webCreditScorePage.heroLabel)}</Text>
      <View style={styles.scoreStack}>
        <Text style={styles.scoreEmoji}>{webCreditScorePage.scoreEmoji}</Text>
        <Text style={styles.scoreValue}>{webCreditScorePage.score}</Text>
      </View>
      <ProgressTrack progress={heroProgress} slim />
      <Text numberOfLines={1} style={styles.tierLabel}>
        {tc(webCreditScorePage.tier)}
      </Text>
      <Text numberOfLines={2} style={styles.mutedCenter}>
        {tc(webCreditScorePage.pointsToTrusted)}
      </Text>
    </View>
  );
}

function CreditScoreProgressCard() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.progressCard}>
      <Text style={styles.progressTitle}>{tc(webCreditScorePage.progressTitle)}</Text>
      <ProgressTrack progress="50%" />
      <Text style={styles.progressLabel}>{webCreditScorePage.progressLabel}</Text>
      <Text numberOfLines={2} style={styles.mutedCenter}>
        {tc(webCreditScorePage.pointsToTrusted)}
      </Text>
    </View>
  );
}

function ProgressTrack({ progress, slim = false }: { progress: DimensionValue; slim?: boolean }) {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  return (
    <View style={[styles.progressTrack, slim ? styles.progressTrackSlim : null]}>
      <View style={[styles.progressFill, progressFillGradient, { width: progress }]} />
    </View>
  );
}

function CreditScoreBreakdown() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.breakdownSection}>
      <Text style={styles.breakdownTitle}>{tc(webCreditScorePage.breakdownTitle)}</Text>
      <Text style={styles.sectionLabel}>{tc(webCreditScorePage.completeSectionLabel)}</Text>
      <View style={styles.rowStack}>
        {webCreditScorePage.completeRows.map((row) => (
          <ScoreRow complete key={row.label} label={row.label} points={row.points} />
        ))}
      </View>

      <Text style={[styles.sectionLabel, styles.todoLabel]}>{tc(webCreditScorePage.todoSectionLabel)}</Text>
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
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={[styles.scoreRow, complete ? styles.scoreRowComplete : styles.scoreRowTodo]}>
      <View style={styles.scoreRowCopy}>
        <Text numberOfLines={2} style={styles.scoreRowTitle}>
          {complete ? "✅ " : "🔒 "}
          {tc(label)}
        </Text>
        {subLabel ? (
          <Text numberOfLines={1} style={styles.scoreRowSub}>
            {tc(subLabel)}
          </Text>
        ) : null}
      </View>
      <View style={styles.pointsWrap}>
        <Text style={styles.pointsText}>{points}</Text>
        {cta ? (
          <Link asChild href={label === "Profile complete" ? "/profile/info" : "/"}>
            <Pressable hitSlop={8} onPress={() => haptics.impact()} style={styles.rowCta}>
              <Text style={styles.rowCtaText}>{tc(cta)}</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function CreditScoreBenefits() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.benefitsSection}>
      <Text style={styles.benefitsTitle}>{tc(webCreditScorePage.benefitsTitle)}</Text>
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
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.benefitGroup}>
      <Text style={styles.sectionLabel}>{tc(label)}</Text>
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
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={[styles.benefitCard, locked ? styles.benefitCardLocked : null]}>
      <View style={styles.benefitCopy}>
        <Text numberOfLines={2} style={styles.benefitTitle}>
          <Text style={styles.benefitIcon}>{item.icon}</Text>
          {"  "}
          {tc(item.label)}
        </Text>
        {item.note ? (
          <Text numberOfLines={2} style={styles.benefitNote}>
            {tc(item.note)}
          </Text>
        ) : null}
      </View>
      {active || item.status ? (
        <Text style={[styles.statusPill, active ? styles.statusPillActive : null]}>
          {tc(item.status ?? "Active")}
        </Text>
      ) : (
        <Text style={styles.lockIcon}>🔒</Text>
      )}
    </View>
  );
}

function CreditScoreStreakCard() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.streakCard}>
      <Text style={styles.streakTitle}>{tc(webCreditScorePage.streakTitle)}</Text>
      <Text style={styles.streakSubtitle}>{tc(webCreditScorePage.streakSubtitle)}</Text>
      <View style={styles.monthTrack}>
        {[1, 2, 3].map((month) => (
          <Fragment key={month}>
            {/* Web parity: connector lines join the month dots. */}
            {month > 1 ? <View style={styles.monthConnector} /> : null}
            <View style={styles.monthItem}>
              <View style={styles.monthDot} />
              <Text style={styles.monthLabel}>
                {tc("Month")} {month}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>
      <View style={styles.monthRows}>
        {[1, 2, 3].map((month) => (
          <View key={month} style={styles.monthRow}>
            <Text numberOfLines={1} style={styles.monthRowText}>
              {tc("Month")} {month}
            </Text>
            {/* Web parity: status renders as a colored pill (amber in-progress / muted locked). */}
            <View
              style={[
                styles.monthStatusPill,
                month === 2 ? styles.monthStatusPillProgress : styles.monthStatusPillLocked,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.monthStatus,
                  month === 2 ? styles.monthStatusProgress : null,
                ]}
              >
                {month === 2 ? `🔥 ${tc("In progress")}` : `🔒 ${tc("Locked")}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CreditScoreBoostCard() {
  const styles = useThemedStyles(createCreditScoreScreenStyles);
  const tc = useCopy();
  return (
    <View style={styles.boostCard}>
      <Text style={styles.boostTitle}>{tc(webCreditScorePage.boostTitle)}</Text>
      <Text numberOfLines={3} style={styles.boostBody}>
        {tc(webCreditScorePage.boostBody)}
      </Text>
      <Link asChild href="/">
        <Pressable onPress={() => haptics.impact()} style={styles.boostButton}>
          <Text style={styles.boostButtonText}>{tc(webCreditScorePage.boostCta)}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// Web-only gradient for the progress fills (from #00aa80 to #00cc99, web parity).
// Ignored on native, where the solid progressFill backgroundColor stands in.
const progressFillGradient = {
  backgroundImage: "linear-gradient(to right, #00AA80, #00CC99)",
} as unknown as ViewStyle;

function createCreditScoreScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
  contentDesktop: {
    alignSelf: "center",
    maxWidth: 672,
    width: "100%",
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
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  scoreStack: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  scoreEmoji: {
    fontSize: 48,
    lineHeight: 54,
  },
  scoreValue: {
    // Web parity: text-7xl font-black #103522. The app's typography rule caps weights at
    // 800 (DM Sans ships no true 900), so 800 stands in for the web's font-black.
    color: pickThemed(colors, "#103522", colors.accent),
    fontFamily: typography.family,
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 78,
  },
  progressTrack: {
    backgroundColor: colors.background,
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
    fontWeight: "600",
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
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  progressLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  breakdownSection: {
    gap: spacing.sm,
  },
  breakdownTitle: {
    color: pickThemed(colors, "#103522", colors.accent),
    fontFamily: typography.family,
    fontSize: 36,
    fontWeight: "600",
    lineHeight: 42,
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
    backgroundColor: colors.background,
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
    minHeight: 44,
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
    color: pickThemed(colors, "#103522", colors.accent),
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
    backgroundColor: colors.background,
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
    borderColor: "#B7E7DB",
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
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.md,
  },
  monthConnector: {
    backgroundColor: colors.border,
    height: 1,
    marginBottom: 24,
    width: 32,
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
  monthStatusProgress: {
    color: "#B45309",
  },
  monthStatusPill: {
    borderRadius: radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  monthStatusPillProgress: {
    backgroundColor: "#FEF3C7",
  },
  monthStatusPillLocked: {
    backgroundColor: colors.background,
  },
  boostCard: {
    backgroundColor: colors.primarySoft,
    borderColor: "#B7E7DB",
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
    borderRadius: 12,
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
}

