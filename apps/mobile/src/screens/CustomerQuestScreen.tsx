import { Link } from "expo-router";
import {
  CircleDollarSign as CoinIcon,
  DeviceMobile as DeviceMobileIcon,
  MousePointerClick as MousePointerClickIcon,
  Plane as PlaneIcon,
  Sparkles as SparklesIcon,
  Storefront as StorefrontIcon,
  Trophy as TrophyIcon,
} from "@mobile/theme/icons";
import { ChevronUp as ChevronUpIcon } from "@mobile/theme/icons";
import type { IconComponent } from "@mobile/theme/icons";
import { useState } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import profileAvatarImage from "../../assets/profile-avatar.png";
import questBannerImage from "../../assets/quest-banner-en.png";
import questHowToEarnImage from "../../assets/quest-how-to-earn-en.png";
import questPromoImage from "../../assets/quest-banner2.png";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { haptics } from "@mobile/lib/haptics";
import {
  mobileShellLayout,
  webAccountPageSurface,
  webHomePromoSections,
  webQuestHistory,
  webQuestLeaderboardRows,
  webQuestMyRank,
  webQuestTaskRows,
  webQuestTabs,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type QuestTabId = (typeof webQuestTabs)[number]["id"];

const exploreOtherShops = webHomePromoSections.find((section) => section.id === "travel");

export function CustomerQuestScreen({ history = false }: { history?: boolean }) {
  const tc = useCopy();
  const [activeTab, setActiveTab] = useState<QuestTabId>(history ? "leaderboard" : "how-to-win");
  const { width } = useWindowDimensions();
  const isDesktop = width >= mobileShellLayout.desktopBreakpoint;
  const shellWidth = Math.min(
    width,
    isDesktop ? webAccountPageSurface.desktopContentMaxWidth : mobileShellLayout.contentMaxWidth
  );
  const contentWidth =
    shellWidth -
    (isDesktop
      ? mobileShellLayout.desktopContentHorizontalPadding * 2
      : mobileShellLayout.contentHorizontalPadding * 2);
  const heroHeight = contentWidth / (1200 / 675);
  const mediaColumnWidth = isDesktop ? (contentWidth - spacing.lg) / 2 : contentWidth;

  if (history) {
    return (
      <AccountPageShell activeRouteId="quest" title={tc("Quest History")}>
        <QuestHistoryView />
      </AccountPageShell>
    );
  }

  return (
    <AccountPageShell activeRouteId="quest" title={history ? tc("Quest History") : tc("Quest")}>
      <Image
        alt={tc("GoGoQuest bonus banner")}
        resizeMode="cover"
        source={questBannerImage}
        style={[styles.heroBanner, { height: heroHeight }]}
      />
      <View style={styles.tabStrip}>
        {webQuestTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <MotionPressable
              hoverLift={false}
              key={tab.id}
              onPress={() => {
                haptics.impact();
                setActiveTab(tab.id);
              }}
              pressScale={0.98}
              style={[styles.tabButton, active ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {"icon" in tab ? "🏆 " : ""}
                {tc(tab.label)}
              </Text>
            </MotionPressable>
          );
        })}
      </View>
      <View
        style={[
          styles.questGrid,
          isDesktop && activeTab !== "leaderboard" ? styles.questGridDesktop : null,
        ]}
      >
        {activeTab === "how-to-win" ? (
          <View style={styles.questColumn}>
            <Image
              alt={tc("GoGoQuest how to earn illustration")}
              resizeMode="cover"
              source={questHowToEarnImage}
              style={[styles.howToEarnImage, { height: mediaColumnWidth / (1216 / 930) }]}
            />
          </View>
        ) : null}
        {activeTab === "tasks" ? (
          <View style={styles.questColumn}>
            <QuestTaskPanel />
          </View>
        ) : null}
        {activeTab === "leaderboard" ? (
          <QuestLeaderboardPanel mediaColumnWidth={contentWidth} />
        ) : null}
        {isDesktop && activeTab !== "leaderboard" ? (
          <View style={styles.questColumn}>
            <QuestLeaderboardPanel mediaColumnWidth={mediaColumnWidth} />
          </View>
        ) : null}
      </View>
      <ExploreOtherShops />
    </AccountPageShell>
  );
}

function QuestTaskPanel() {
  const tc = useCopy();
  return (
    <View style={styles.taskPanel}>
      <Text style={styles.taskTitle}>{tc("Let’s Got the Tasks Done!")}</Text>
      {webQuestTaskRows.map((task) => (
        <View key={task.title} style={styles.taskRow}>
          <TaskLogo task={task} />
          <View style={styles.taskCopy}>
            <Text numberOfLines={1} style={styles.taskName}>
              {tc(task.title)}
            </Text>
          </View>
          <TaskPointsPill points={task.points} />
        </View>
      ))}
    </View>
  );
}

// Web renders every task row with a circular mint bubble (bg #E8FBF5). Map each task's icon
// kind to a clean glyph so the column reads as an intentional, uniform list (the way the web
// merchant logos do) instead of mismatched colored boxes.
const taskGlyphByIcon: Record<string, IconComponent> = {
  watchAds: MousePointerClickIcon,
  orbit: PlaneIcon,
  pixel: DeviceMobileIcon,
  glow: SparklesIcon,
  go: StorefrontIcon,
};

function TaskLogo({ task }: { task: (typeof webQuestTaskRows)[number] }) {
  const Glyph = taskGlyphByIcon[task.icon] ?? StorefrontIcon;
  return (
    <View style={styles.taskLogo}>
      <Glyph color={colors.primaryDark} size={26} strokeWidth={typography.iconStrokeWidth} />
    </View>
  );
}

function TaskPointsPill({ points }: { points: string }) {
  return (
    <View style={styles.taskPointsPill}>
      <Text numberOfLines={1} style={styles.taskPointsText}>
        {points}
      </Text>
      <CoinIcon color={colors.white} size={18} strokeWidth={typography.iconStrokeWidth} />
    </View>
  );
}

function QuestMyRankCard() {
  const tc = useCopy();
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <View style={styles.myRankCard}>
        <View style={styles.myRankColumn}>
          <Text numberOfLines={1} style={styles.myRankLabel}>
            {tc(webQuestMyRank.rankLabel)}
          </Text>
          <View style={styles.myRankValueWrap}>
            <Text style={styles.myRankValue}>{webQuestMyRank.rankValue}</Text>
          </View>
        </View>
        <View style={styles.myRankColumn}>
          <Text numberOfLines={1} style={styles.myRankLabel}>
            {tc(webQuestMyRank.pointsLabel)}
          </Text>
          <View style={styles.myRankValueWrap}>
            <Text style={styles.myRankValue}>{webQuestMyRank.pointsValue}</Text>
          </View>
        </View>
      </View>
      <MotionPressable
        hitSlop={8}
        hoverLift={false}
        onPress={() => {
          haptics.impact();
          setExpanded((prev) => !prev);
        }}
        pressScale={0.98}
        style={styles.viewPointsButton}
      >
        <Text numberOfLines={1} style={styles.viewPointsText}>
          {tc(webQuestMyRank.viewPointsLabel)}
        </Text>
        <ChevronUpIcon
          color={colors.primary}
          size={18}
          strokeWidth={typography.iconStrokeWidth}
          style={expanded ? undefined : styles.viewPointsIconCollapsed}
        />
      </MotionPressable>
      {expanded ? (
        <View style={styles.myRankBreakdown}>
          <View style={styles.myRankBreakdownColumn}>
            <Text style={styles.myRankBreakdownLabel}>{tc(webQuestMyRank.spendingLabel)}</Text>
            <Text style={styles.myRankBreakdownValue}>{webQuestMyRank.spendingValue}</Text>
          </View>
          <Text style={styles.myRankBreakdownPlus}>+</Text>
          <View style={styles.myRankBreakdownColumn}>
            <Text style={styles.myRankBreakdownLabel}>{tc(webQuestMyRank.specialTasksLabel)}</Text>
            <Text style={styles.myRankBreakdownValue}>{webQuestMyRank.specialTasksValue}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function QuestLeaderboardPanel({ mediaColumnWidth }: { mediaColumnWidth: number }) {
  const tc = useCopy();
  return (
    <View style={styles.leaderboardPanel}>
      <Image
        alt={tc("GoGoQuest leaderboard tips illustration")}
        resizeMode="cover"
        source={questPromoImage}
        style={[styles.promoImage, { height: mediaColumnWidth / (484 / 320) }]}
      />
      <QuestMyRankCard />
      <View style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <View style={styles.leaderboardTitleRow}>
            <Text style={styles.leaderboardEmoji}>🏆</Text>
            <Text style={styles.leaderboardTitle}>GoGoQuest</Text>
          </View>
          <Link asChild href="/quest/history">
            <MotionPressable hitSlop={8} pressScale={0.98} style={styles.historyButton}>
              <TrophyIcon
                color={colors.primaryDark}
                size={20}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text numberOfLines={1} style={styles.historyLink}>{`GoGoQuest ${tc("History")}`}</Text>
            </MotionPressable>
          </Link>
        </View>
        <QuestRankRows />
      </View>
    </View>
  );
}

// Web shows distinct rank trophies per place (rank1/2/3 = gold/silver/bronze medal PNGs, then
// rank4/5). Mirror that hierarchy with tinted trophies so the podium reads at a glance.
const rankTrophyTints = ["#F4B740", "#A9B4C2", "#C8803D"] as const;

function RankTrophy({ index }: { index: number }) {
  const tint = rankTrophyTints[index] ?? colors.textSoft;
  return (
    <View style={styles.rankTrophy}>
      <TrophyIcon color={tint} size={24} strokeWidth={typography.iconStrokeWidth} />
    </View>
  );
}

function ExploreOtherShops() {
  const tc = useCopy();
  if (!exploreOtherShops) {
    return null;
  }

  return (
    <View style={styles.exploreSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tc("Explore other Shops")}</Text>
        <Link asChild href="/brand">
          <MotionPressable pressScale={0.98}>
            <Text style={styles.viewAll}>{`${tc("View all")} →`}</Text>
          </MotionPressable>
        </Link>
      </View>
      <View style={styles.shopGrid}>
        {exploreOtherShops.cards.slice(0, 4).map((card) => (
          <Link
            asChild
            href={`/shop/${card.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` as never}
            key={card.brand}
          >
            <MotionPressable pressScale={0.98} style={styles.shopCard}>
              <View style={[styles.shopLogo, { backgroundColor: card.tint }]}>
                {"logoUri" in card ? (
                  <Image
                    alt={`${card.brand} ${tc("logo")}`}
                    resizeMode="contain"
                    source={{ uri: card.logoUri }}
                    style={styles.shopLogoImage}
                  />
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.shopName}>
                {card.brand}
              </Text>
              <View style={styles.shopCashbackRow}>
                <Text style={styles.shopCashbackLabel}>{tc("Cashback up to")}</Text>
                <Text style={styles.shopCashback}>{card.cashback}</Text>
              </View>
            </MotionPressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const QUEST_HISTORY_LEADERBOARD_PERIODS = ["This round", "May 2025", "April 2025"] as const;

// Static-mock interpolation for the web's ICU {placeholder} copy (this build has no live quest data).
function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    template,
  );
}

// Reusable leaderboard rank rows — shared by the /quest tab panel and the history leaderboard.
function QuestRankRows() {
  const tc = useCopy();
  return (
    <>
      {webQuestLeaderboardRows.map((row, index) => (
        <View key={row.name} style={styles.rankRow}>
          <Image
            alt={`${row.name} ${tc("avatar")}`}
            source={profileAvatarImage}
            style={styles.rankAvatarImage}
          />
          <Text numberOfLines={1} style={styles.rankName}>
            {row.name}
          </Text>
          <RankTrophy index={index} />
          <View style={styles.rankPointRow}>
            <CoinIcon color={colors.primary} size={18} strokeWidth={typography.iconStrokeWidth} />
            <Text style={styles.rankPoint}>{row.points}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

// Month-over-month insight (web parity: GogoquestHistoryInsightSection). Static example values
// since this build has no live monthly data.
function QuestHistoryInsight() {
  const tc = useCopy();
  return (
    <View style={styles.historyInsightCard}>
      <Text style={styles.historyInsightTitle}>{tc("A quick read on your months")}</Text>
      <Text style={styles.historyInsightBody}>
        {fillTemplate(
          tc("You earned about {percent}% more points in {recentMonth} than in {olderMonth}."),
          { percent: "15", recentMonth: "May 2025", olderMonth: "April 2025" },
        )}
      </Text>
      <Text style={styles.historyInsightStrip}>
        {fillTemplate(tc("You picked up quest points in {active} of the last {total} months."), {
          active: "2",
          total: "3",
        })}
      </Text>
    </View>
  );
}

// "How shoppers rank" leaderboard: section + period picker + ranking table + my-rank (web parity,
// static data). The per-player "View" drill-down dialog is intentionally not ported in this pass.
function QuestHistoryLeaderboard() {
  const tc = useCopy();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(QUEST_HISTORY_LEADERBOARD_PERIODS[0]);
  const periodLabel = (period: string) => (period === "This round" ? tc("This round") : period);

  return (
    <View style={styles.historySection}>
      <Text style={styles.historySectionTitle}>{tc("How shoppers rank")}</Text>
      <Text style={styles.historySectionHint}>
        {tc(
          "See how your score compares for the period you picked. Names are shortened to protect privacy. Tap View on a row to see that shopper’s points and rewards for the same dates.",
        )}
      </Text>
      <View style={styles.historyPickerCard}>
        <Text style={styles.historyPickerLabel}>{tc("Which period do you want to see?")}</Text>
        <View style={styles.historyPickerChips}>
          {QUEST_HISTORY_LEADERBOARD_PERIODS.map((period) => {
            const active = period === selectedPeriod;
            return (
              <MotionPressable
                key={period}
                onPress={() => setSelectedPeriod(period)}
                pressScale={0.98}
                style={[styles.historyChip, active ? styles.historyChipActive : null]}
              >
                <Text style={[styles.historyChipText, active ? styles.historyChipTextActive : null]}>
                  {periodLabel(period)}
                </Text>
              </MotionPressable>
            );
          })}
        </View>
        <Text style={styles.historyPickerSelected}>
          {fillTemplate(tc("You are viewing: {period}"), { period: periodLabel(selectedPeriod) })}
        </Text>
      </View>
      <QuestMyRankCard />
      <View style={styles.leaderboardCard}>
        <QuestRankRows />
      </View>
    </View>
  );
}

function QuestHistoryView() {
  const tc = useCopy();
  return (
    <View style={styles.historyView}>
      {/* Hero + plan card */}
      <View style={styles.historyHero}>
        <Text style={styles.historyKicker}>{tc(webQuestHistory.heroKicker)}</Text>
        <Text style={styles.historyHeroTitle}>{tc(webQuestHistory.heroTitle)}</Text>
        <Text style={styles.historyIntro}>{tc(webQuestHistory.pageIntro)}</Text>
        <View style={styles.historyPlanCard}>
          <Text style={styles.historyPlanTitle}>{tc(webQuestHistory.planTitle)}</Text>
          {webQuestHistory.planSteps.map((step, index) => (
            <View key={step} style={styles.historyPlanStepRow}>
              <Text style={styles.historyPlanStepNumber}>{index + 1}.</Text>
              <Text style={styles.historyPlanStepText}>{tc(step)}</Text>
            </View>
          ))}
          <View style={styles.historyPlanCtaRow}>
            <Link asChild href="/quest">
              <MotionPressable pressScale={0.98} style={styles.historyPlanCtaSecondary}>
                <Text style={styles.historyPlanCtaSecondaryText}>
                  {tc(webQuestHistory.viewQuestHubShort)}
                </Text>
              </MotionPressable>
            </Link>
            <Link asChild href="/brand">
              <MotionPressable pressScale={0.98} style={styles.historyPlanCtaPrimary}>
                <Text style={styles.historyPlanCtaPrimaryText}>
                  {tc(webQuestHistory.planCtaBrowseShort)}
                </Text>
              </MotionPressable>
            </Link>
          </View>
        </View>
      </View>

      {/* This round — campaign card */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>{tc(webQuestHistory.currentCampaign)}</Text>
        <Text style={styles.historySectionHint}>{tc(webQuestHistory.roundShopHint)}</Text>
        <View style={styles.historyCampaignCard}>
          <View style={styles.historyCampaignColumn}>
            <Text style={styles.historyCampaignLabel}>{tc(webQuestHistory.periodLabel)}</Text>
            <Text style={styles.historyCampaignPeriod}>{tc(webQuestHistory.periodPending)}</Text>
          </View>
          <View style={styles.historyScoreCard}>
            <Text style={styles.historyCampaignLabel}>{tc(webQuestHistory.yourScoreLabel)}</Text>
            <Text style={styles.historySignInHint}>{tc(webQuestHistory.signInHint)}</Text>
            <Text style={styles.historyScoreFootnote}>{tc(webQuestHistory.scoreFootnote)}</Text>
          </View>
        </View>
      </View>

      {/* A quick read on your months (web parity: GogoquestHistoryInsightSection) */}
      <QuestHistoryInsight />

      {/* Monthly points — empty state */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>{tc(webQuestHistory.monthlySection)}</Text>
        <Text style={styles.historySectionHint}>{tc(webQuestHistory.monthlySectionHint)}</Text>
        <View style={styles.historyEmptyCard}>
          <Text style={styles.historyEmptyText}>{tc(webQuestHistory.emptyMonthly)}</Text>
        </View>
      </View>

      {/* Rewards — empty state */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>{tc(webQuestHistory.rewardsSection)}</Text>
        <Text style={styles.historySectionHint}>{tc(webQuestHistory.rewardsSectionHint)}</Text>
        <View style={styles.historyEmptyCard}>
          <Text style={styles.historyEmptyText}>{tc(webQuestHistory.emptyRewards)}</Text>
        </View>
      </View>

      {/* How shoppers rank — leaderboard + period picker (web parity: GogoquestHistory leaderboard) */}
      <QuestHistoryLeaderboard />
    </View>
  );
}

const styles = StyleSheet.create({
  historyView: {
    gap: spacing.xl,
  },
  historyHero: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  historyKicker: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  historyHeroTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
    lineHeight: 28,
  },
  historyIntro: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 22,
  },
  historyPlanCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  historyPlanTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  historyPlanStepRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  historyPlanStepNumber: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "700",
  },
  historyPlanStepText: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 21,
  },
  historyPlanCtaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  historyPlanCtaSecondary: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.primaryDark,
    borderRadius: radii.chip,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  historyPlanCtaSecondaryText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  historyPlanCtaPrimary: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.chip,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  historyPlanCtaPrimaryText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  historySection: {
    gap: spacing.sm,
  },
  historySectionTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "700",
  },
  historySectionHint: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  historyCampaignCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  historyCampaignColumn: {
    gap: spacing.xs,
  },
  historyCampaignLabel: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "500",
  },
  historyCampaignPeriod: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  historyScoreCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    gap: spacing.xs,
    padding: spacing.md,
  },
  historySignInHint: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  historyScoreFootnote: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: typography.caption,
    lineHeight: 16,
  },
  historyEmptyCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  historyEmptyText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.body,
    lineHeight: 21,
  },
  historyInsightCard: {
    backgroundColor: "#F6FDFB",
    borderColor: "#D8F8EF",
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  historyInsightTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
  },
  historyInsightBody: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  historyInsightStrip: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    lineHeight: 20,
  },
  historyPickerCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
    padding: spacing.md,
  },
  historyPickerLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "500",
  },
  historyPickerChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  historyChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.chip,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  historyChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  historyChipText: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
  },
  historyChipTextActive: {
    color: colors.white,
  },
  historyPickerSelected: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
  },
  heroBanner: {
    borderRadius: radii.lg,
    width: "100%",
  },
  tabStrip: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
  },
  tabButton: {
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
  },
  tabText: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  questGrid: {
    gap: spacing.lg,
  },
  questGridDesktop: {
    flexDirection: "row",
  },
  questColumn: {
    flex: 1,
    gap: spacing.md,
    minWidth: 0,
  },
  howToEarnImage: {
    borderRadius: radii.md,
    width: "100%",
  },
  promoImage: {
    borderRadius: radii.md,
    width: "100%",
  },
  leaderboardPanel: {
    gap: spacing.lg,
    width: "100%",
  },
  taskPanel: {
    gap: 0,
    paddingTop: spacing.lg,
  },
  taskTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  taskRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.md,
  },
  taskLogo: {
    alignItems: "center",
    backgroundColor: "#E8FBF5",
    borderRadius: radii.chip,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  taskCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  taskName: {
    color: "#000000",
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: typography.bodyWeight,
    lineHeight: 24,
  },
  taskPointsPill: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  taskPointsText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "500",
  },
  leaderboardCard: {
    gap: spacing.sm,
  },
  myRankCard: {
    backgroundColor: "#F1FFFC",
    borderColor: colors.primary,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  myRankColumn: {
    alignItems: "center",
    gap: spacing.sm,
  },
  myRankLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
    textAlign: "center",
  },
  myRankValueWrap: {
    alignItems: "center",
    height: 65,
    justifyContent: "center",
  },
  myRankValue: {
    color: colors.accentSoft,
    fontFamily: typography.family,
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
  },
  viewPointsButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  viewPointsText: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "500",
  },
  viewPointsIconCollapsed: {
    transform: [{ rotate: "90deg" }],
  },
  myRankBreakdown: {
    alignItems: "center",
    borderColor: "#CECBCB",
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  myRankBreakdownColumn: {
    gap: spacing.xs,
  },
  myRankBreakdownLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  myRankBreakdownValue: {
    color: "#000000",
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: "500",
  },
  myRankBreakdownPlus: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 24,
    marginHorizontal: spacing.md,
  },
  leaderboardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  leaderboardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  leaderboardEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  leaderboardTitle: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 28,
    fontWeight: "600",
  },
  historyButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
  historyLink: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: typography.bodyWeight,
  },
  rankRow: {
    alignItems: "center",
    borderBottomColor: "#E0E0E0",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.md,
  },
  rankAvatarImage: {
    borderRadius: radii.chip,
    height: 46,
    width: 46,
  },
  rankName: {
    color: "#000000",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 18,
    minWidth: 0,
  },
  rankTrophy: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankPointRow: {
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  rankPoint: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "500",
  },
  exploreSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.title,
    fontWeight: "600",
  },
  viewAll: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: typography.body,
  },
  shopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  shopCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: shadows.cardCss,
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 150,
    padding: spacing.sm,
  },
  shopLogo: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: radii.sm,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  shopLogoImage: {
    height: "70%",
    width: "70%",
  },
  shopName: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: typography.body,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  shopCashbackRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  shopCashbackLabel: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.family,
    fontSize: typography.caption,
  },
  shopCashback: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "600",
  },
});
