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
import { Image, Modal, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import profileAvatarImage from "../../assets/profile-avatar.png";
import questBannerImage from "../../assets/quest-banner-en.png";
import questHowToEarnImage from "../../assets/quest-how-to-earn-en.png";
import questPromoImage from "../../assets/quest-banner2.png";
import questRank1 from "../../assets/quest-rank/rank1.png";
import questRank2 from "../../assets/quest-rank/rank2.png";
import questRank3 from "../../assets/quest-rank/rank3.png";
import questRank4 from "../../assets/quest-rank/rank4.png";
import questRank5 from "../../assets/quest-rank/rank5.png";
import questRank6to10 from "../../assets/quest-rank/rank6_10.png";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { QuestCoinIcon } from "@mobile/components/QuestCoinIcon";
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

type QuestMyRankData = {
  rankLabel: string;
  rankValue: string;
  pointsLabel: string;
  pointsValue: string;
  viewPointsLabel: string;
  spendingLabel: string;
  spendingValue: string;
  specialTasksLabel: string;
  specialTasksValue: string;
};

function QuestMyRankCard({ data = webQuestMyRank }: { data?: QuestMyRankData }) {
  const tc = useCopy();
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <View style={styles.myRankCard}>
        <View style={styles.myRankColumn}>
          <Text numberOfLines={1} style={styles.myRankLabel}>
            {tc(data.rankLabel)}
          </Text>
          <View style={styles.myRankValueWrap}>
            <Text style={styles.myRankValue}>{data.rankValue}</Text>
          </View>
        </View>
        <View style={styles.myRankColumn}>
          <Text numberOfLines={1} style={styles.myRankLabel}>
            {tc(data.pointsLabel)}
          </Text>
          <View style={styles.myRankValueWrap}>
            <Text style={styles.myRankValue}>{data.pointsValue}</Text>
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
          {tc(data.viewPointsLabel)}
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
            <Text style={styles.myRankBreakdownLabel}>{tc(data.spendingLabel)}</Text>
            <Text style={styles.myRankBreakdownValue}>{data.spendingValue}</Text>
          </View>
          <Text style={styles.myRankBreakdownPlus}>+</Text>
          <View style={styles.myRankBreakdownColumn}>
            <Text style={styles.myRankBreakdownLabel}>{tc(data.specialTasksLabel)}</Text>
            <Text style={styles.myRankBreakdownValue}>{data.specialTasksValue}</Text>
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
        <QuestRankRows
          rows={webQuestLeaderboardRows.map((row) => ({
            key: row.name,
            name: row.name,
            points: row.points,
          }))}
        />
      </View>
    </View>
  );
}

// Web parity: rendered trophy PNGs per place (public/quest/rank{1..5}.png + rank6_10.png),
// not a tinted flat icon. Index 0-4 map to rank1-5; rank 6+ shares rank6_10.
const rankTrophyImages = [questRank1, questRank2, questRank3, questRank4, questRank5] as const;

function RankTrophy({ index }: { index: number }) {
  const source = rankTrophyImages[index] ?? questRank6to10;
  return (
    <View style={styles.rankTrophy}>
      <Image
        alt={`rank ${index + 1} trophy`}
        resizeMode="contain"
        source={source}
        style={styles.rankTrophyImage}
      />
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

const QUEST_HISTORY_LEADERBOARD_PERIODS = [
  "This round",
  "March 2026",
  "February 2026",
  "January 2026",
] as const;

// Static mock quest-history data (web parity: src/mocks/homeApi.ts mock-mode fixtures). No live data here.
const QUEST_HISTORY_MOCK = {
  periodRange: "March 1 – March 31, 2026",
  daysLeft: "4 days left in this round",
  score: "940",
  monthly: [
    { month: "March 2026", points: 520 },
    { month: "February 2026", points: 380 },
    { month: "January 2026", points: 210 },
  ],
  rewards: [
    {
      id: "reward-1",
      title: "March top-10 bonus",
      description: "Campaign leaderboard reward",
      date: "Mar 20, 2026",
      points: 80,
      isNew: true,
    },
    {
      id: "reward-2",
      title: "Social share milestone",
      description: "",
      date: "Mar 12, 2026",
      points: 25,
      isNew: false,
    },
    {
      id: "reward-3",
      title: "Spend bonus over 300",
      description: "",
      date: "Feb 28, 2026",
      points: 30,
      isNew: false,
    },
  ],
} as const;
const QUEST_HISTORY_MONTHLY_MAX = Math.max(...QUEST_HISTORY_MOCK.monthly.map((row) => row.points));

// Full mock leaderboard (web parity: src/mocks/homeApi.ts getMockQuestLeaderboard). The active user
// "Demo Shopper" sits at rank 4 with 940 pts. Usernames are stored in full and truncated at render.
const QUEST_HISTORY_LEADERBOARD = [
  { id: "rank-1", name: "StarHunter", points: 2100, rank: 1 },
  { id: "rank-2", name: "LunaMint", points: 1840, rank: 2 },
  { id: "rank-3", name: "QuestKid", points: 1590, rank: 3 },
  { id: "rank-4", name: "Demo Shopper", points: 940, rank: 4 },
  { id: "rank-5", name: "NeoShop", points: 720, rank: 5 },
  { id: "rank-6", name: "PixelPilot", points: 695, rank: 6 },
  { id: "rank-7", name: "CashFlowCat", points: 672, rank: 7 },
  { id: "rank-8", name: "TurboSaver", points: 648, rank: 8 },
  { id: "rank-9", name: "MintMarathon", points: 625, rank: 9 },
  { id: "rank-10", name: "ShopHunter88", points: 601, rank: 10 },
  { id: "rank-11", name: "BonusBuilder", points: 578, rank: 11 },
  { id: "rank-12", name: "QuestNova", points: 554, rank: 12 },
  { id: "rank-13", name: "DealDrifter", points: 531, rank: 13 },
  { id: "rank-14", name: "RewardRider", points: 508, rank: 14 },
  { id: "rank-15", name: "TierTrader", points: 484, rank: 15 },
  { id: "rank-16", name: "CashbackAce", points: 461, rank: 16 },
  { id: "rank-17", name: "OfferOptIn", points: 438, rank: 17 },
  { id: "rank-18", name: "StackStar", points: 414, rank: 18 },
  { id: "rank-19", name: "PointsPanda", points: 391, rank: 19 },
  { id: "rank-20", name: "SwiftShopper", points: 368, rank: 20 },
] as const;

type QuestHistoryPlayer = (typeof QUEST_HISTORY_LEADERBOARD)[number];

// Active user's My Rank (web mock: rank 4, 940 pts = 725 spending + 215 special tasks). Labels reuse
// the shared webQuestMyRank fixture; only the values are overridden for the history view.
const QUEST_HISTORY_MY_RANK = {
  ...webQuestMyRank,
  rankValue: "4th",
  pointsValue: "940",
  spendingValue: "725",
  specialTasksValue: "215",
};

// Thousands separator (e.g. 2100 -> "2,100").
function formatPoints(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Privacy-shortened username (web parity: <=11 chars -> first3...last3, else first6...last6).
function truncateQuestName(username: string): string {
  const name = username.trim();
  return name.length <= 11
    ? `${name.slice(0, 3)}...${name.slice(-3)}`
    : `${name.slice(0, 6)}...${name.slice(-6)}`;
}

// Static-mock interpolation for the web's ICU {placeholder} copy (this build has no live quest data).
function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    template,
  );
}

type QuestRankDisplayRow = { key: string; name: string; points: string };

// Reusable leaderboard rank rows — shared by the /quest tab panel and the history leaderboard.
// When onView + viewLabel are supplied, each row gets a "View" button (history leaderboard).
function QuestRankRows({
  rows,
  onView,
  viewLabel,
}: {
  rows: QuestRankDisplayRow[];
  onView?: (index: number) => void;
  viewLabel?: string;
}) {
  const tc = useCopy();
  return (
    <>
      {rows.map((row, index) => (
        <View key={row.key} style={styles.rankRow}>
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
            <QuestCoinIcon size={18} />
            <Text style={styles.rankPoint}>{row.points}</Text>
          </View>
          {onView && viewLabel ? (
            <MotionPressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onView(index)}
              pressScale={0.97}
              style={styles.rankViewButton}
            >
              <Text style={styles.rankViewText}>{viewLabel}</Text>
            </MotionPressable>
          ) : null}
        </View>
      ))}
    </>
  );
}

// Month-over-month insight (web parity: GogoquestHistoryInsightSection). Static example values
// since this build has no live monthly data.
function QuestHistoryInsight() {
  const tc = useCopy();
  // Derive the insight from the mock monthly data so it stays consistent (recent vs previous month).
  const [recentMonth, olderMonth] = QUEST_HISTORY_MOCK.monthly;
  const percent = Math.round(((recentMonth.points - olderMonth.points) / olderMonth.points) * 100);
  const activeMonths = QUEST_HISTORY_MOCK.monthly.filter((row) => row.points > 0).length;
  return (
    <View style={styles.historyInsightCard}>
      <Text style={styles.historyInsightTitle}>{tc("A quick read on your months")}</Text>
      <Text style={styles.historyInsightBody}>
        {fillTemplate(
          tc("You earned about {percent}% more points in {recentMonth} than in {olderMonth}."),
          {
            percent: String(percent),
            recentMonth: recentMonth.month,
            olderMonth: olderMonth.month,
          },
        )}
      </Text>
      <Text style={styles.historyInsightStrip}>
        {fillTemplate(tc("You picked up quest points in {active} of the last {total} months."), {
          active: String(activeMonths),
          total: String(QUEST_HISTORY_MOCK.monthly.length),
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
  const [viewPlayer, setViewPlayer] = useState<QuestHistoryPlayer | null>(null);
  // Web parity: the leaderboard table lists only the top 10 ranks.
  const rankRows = QUEST_HISTORY_LEADERBOARD.slice(0, 10).map((row) => ({
    key: row.id,
    name: truncateQuestName(row.name),
    points: formatPoints(row.points),
  }));

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
          {fillTemplate(tc("You are viewing: {period}"), {
            period: selectedPeriod === "This round" ? QUEST_HISTORY_MOCK.periodRange : selectedPeriod,
          })}
        </Text>
      </View>
      <QuestMyRankCard data={QUEST_HISTORY_MY_RANK} />
      <View style={styles.leaderboardCard}>
        <QuestRankRows
          onView={(index) => setViewPlayer(QUEST_HISTORY_LEADERBOARD[index])}
          rows={rankRows}
          viewLabel={tc("View")}
        />
      </View>
      <QuestPlayerSummaryDialog onClose={() => setViewPlayer(null)} player={viewPlayer} />
    </View>
  );
}

// Per-player summary dialog (web parity: GogoquestPlayerSummaryDialog) — an RN Modal opened from a
// row's "View" button; shows the player's rank, points, and rewards for the selected period.
function QuestPlayerSummaryDialog({
  player,
  onClose,
}: {
  player: QuestHistoryPlayer | null;
  onClose: () => void;
}) {
  const tc = useCopy();
  if (!player) {
    return null;
  }
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <MotionPressable
        hoverLift={false}
        onPress={onClose}
        pressScale={1}
        style={styles.dialogOverlay}
      >
        <View onStartShouldSetResponder={() => true} style={styles.dialogCard}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>{tc("Player quest summary")}</Text>
            <MotionPressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              pressScale={0.97}
            >
              <Text style={styles.dialogClose}>{tc("Close")}</Text>
            </MotionPressable>
          </View>
          <Text style={styles.dialogPlayerName}>{truncateQuestName(player.name)}</Text>
          <View style={styles.dialogStatsRow}>
            <View style={styles.dialogStat}>
              <Text style={styles.dialogStatLabel}>{tc("Rank")}</Text>
              <Text style={styles.dialogStatValue}>{player.rank}</Text>
            </View>
            <View style={styles.dialogStat}>
              <Text style={styles.dialogStatLabel}>{tc("Points")}</Text>
              <Text style={styles.dialogStatValue}>{formatPoints(player.points)}</Text>
            </View>
          </View>
          <Text style={styles.dialogRewardsTitle}>{tc("Rewards this period")}</Text>
          <Text style={styles.dialogNoRewards}>{tc("No rewards recorded for this period.")}</Text>
        </View>
      </MotionPressable>
    </Modal>
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
                <Text style={styles.historyPlanCtaPrimaryText}>{tc("Brands")}</Text>
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
            <Text style={styles.historyCampaignPeriod}>{QUEST_HISTORY_MOCK.periodRange}</Text>
            <View style={styles.historyDaysLeftBadge}>
              <Text style={styles.historyDaysLeftText}>{QUEST_HISTORY_MOCK.daysLeft}</Text>
            </View>
          </View>
          <View style={styles.historyScoreCard}>
            <Text style={styles.historyCampaignLabel}>{tc(webQuestHistory.yourScoreLabel)}</Text>
            <Text style={styles.historyScoreValue}>{QUEST_HISTORY_MOCK.score}</Text>
            <Text style={styles.historyScoreFootnote}>{tc(webQuestHistory.scoreFootnote)}</Text>
          </View>
        </View>
      </View>

      {/* A quick read on your months (web parity: GogoquestHistoryInsightSection) */}
      <QuestHistoryInsight />

      {/* Your points by month — mock data with proportional bars (web parity) */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>{tc(webQuestHistory.monthlySection)}</Text>
        <Text style={styles.historySectionHint}>{tc(webQuestHistory.monthlySectionHint)}</Text>
        <View style={styles.historyMonthlyCard}>
          {QUEST_HISTORY_MOCK.monthly.map((row) => (
            <View key={row.month} style={styles.historyMonthlyRow}>
              <Text numberOfLines={1} style={styles.historyMonthlyLabel}>
                {row.month}
              </Text>
              <View style={styles.historyMonthlyBarTrack}>
                <View
                  style={[
                    styles.historyMonthlyBarFill,
                    { width: `${Math.round((row.points / QUEST_HISTORY_MONTHLY_MAX) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.historyMonthlyPoints}>
                {`${row.points} ${tc(webQuestHistory.pointsSuffix)}`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bonuses you earned — mock data (web parity) */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>{tc(webQuestHistory.rewardsSection)}</Text>
        <Text style={styles.historySectionHint}>{tc(webQuestHistory.rewardsSectionHint)}</Text>
        <View style={styles.historyRewardsCard}>
          {QUEST_HISTORY_MOCK.rewards.map((reward) => (
            <View key={reward.id} style={styles.historyRewardRow}>
              <View style={styles.historyRewardInfo}>
                <View style={styles.historyRewardTitleRow}>
                  <Text numberOfLines={1} style={styles.historyRewardTitle}>
                    {reward.title}
                  </Text>
                  {reward.isNew ? (
                    <View style={styles.historyRewardNewBadge}>
                      <Text style={styles.historyRewardNewText}>{tc("New")}</Text>
                    </View>
                  ) : null}
                </View>
                {reward.description ? (
                  <Text style={styles.historyRewardDesc}>{reward.description}</Text>
                ) : null}
                <Text style={styles.historyRewardDate}>{reward.date}</Text>
              </View>
              <View style={styles.historyRewardPointsPill}>
                <Text style={styles.historyRewardPoints}>
                  {`+${reward.points} ${tc(webQuestHistory.pointsSuffix)}`}
                </Text>
              </View>
            </View>
          ))}
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
  historyDaysLeftBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E6FAF5",
    borderRadius: radii.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  historyDaysLeftText: {
    color: "#007D5E",
    fontFamily: typography.family,
    fontSize: 12,
    fontWeight: "600",
  },
  historyScoreValue: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 32,
    fontWeight: "700",
  },
  historyMonthlyCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  historyMonthlyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  historyMonthlyLabel: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    width: 96,
  },
  historyMonthlyBarTrack: {
    backgroundColor: colors.background,
    borderRadius: radii.chip,
    flex: 1,
    height: 10,
    overflow: "hidden",
  },
  historyMonthlyBarFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    height: "100%",
  },
  historyMonthlyPoints: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    width: 64,
  },
  historyRewardsCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.lg,
  },
  historyRewardRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  historyRewardInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  historyRewardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  historyRewardTitle: {
    color: colors.ink,
    flexShrink: 1,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  historyRewardNewBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  historyRewardNewText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 11,
    fontWeight: "700",
  },
  historyRewardDesc: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
  },
  historyRewardDate: {
    color: colors.textSoft,
    fontFamily: typography.family,
    fontSize: 12,
  },
  historyRewardPointsPill: {
    backgroundColor: "#E8FBF5",
    borderRadius: radii.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  historyRewardPoints: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "700",
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
  rankTrophyImage: {
    height: 48,
    width: 44,
  },
  rankViewButton: {
    borderColor: "rgba(0, 170, 128, 0.4)",
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  rankViewText: {
    color: "#00AA80",
    fontFamily: typography.family,
    fontSize: 13,
    fontWeight: "600",
  },
  dialogOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  dialogCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%",
  },
  dialogHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dialogTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 16,
    fontWeight: "700",
  },
  dialogClose: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  dialogPlayerName: {
    color: colors.accent,
    fontFamily: typography.family,
    fontSize: 18,
    fontWeight: "700",
  },
  dialogStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dialogStat: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  dialogStatLabel: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 12,
  },
  dialogStatValue: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: "700",
  },
  dialogRewardsTitle: {
    color: colors.ink,
    fontFamily: typography.family,
    fontSize: 14,
    fontWeight: "600",
  },
  dialogNoRewards: {
    color: colors.muted,
    fontFamily: typography.family,
    fontSize: 13,
    lineHeight: 18,
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
