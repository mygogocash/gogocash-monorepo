import { Link } from "expo-router";
import {
  CircleDollarSign as CoinIcon,
  MousePointerClick as MousePointerClickIcon,
  Trophy as TrophyIcon,
} from "@mobile/theme/icons";
import { ChevronUp as ChevronUpIcon } from "@mobile/theme/icons";
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
          <QuestLeaderboardPanel mediaColumnWidth={mediaColumnWidth} />
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

function TaskLogo({ task }: { task: (typeof webQuestTaskRows)[number] }) {
  if (task.icon === "watchAds") {
    return (
      <View style={[styles.taskLogo, styles.taskLogoSoft]}>
        <MousePointerClickIcon
          color={colors.primaryDark}
          size={28}
          strokeWidth={typography.iconStrokeWidth}
        />
      </View>
    );
  }

  if (task.icon === "pixel") {
    return <View style={[styles.taskLogo, styles.pixelLogo]} />;
  }

  if (task.icon === "orbit") {
    return (
      <View style={[styles.taskLogo, styles.orbitLogo]}>
        <Text style={styles.orbitLogoText}>◐</Text>
      </View>
    );
  }

  if (task.icon === "glow") {
    return (
      <View style={[styles.taskLogo, styles.glowLogo]}>
        <Text style={styles.glowLogoText}>G</Text>
      </View>
    );
  }

  return (
    <View style={[styles.taskLogo, styles.goLogo]}>
      <Text style={styles.goLogoText}>GO</Text>
    </View>
  );
}

function TaskPointsPill({ points }: { points: string }) {
  return (
    <View style={styles.taskPointsPill}>
      <Text style={styles.taskPointsText}>{points}</Text>
      <View style={styles.taskCoin}>
        <CoinIcon color={colors.white} size={14} strokeWidth={typography.iconStrokeWidth} />
      </View>
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
            <Text style={styles.rankTrophy}>{index === 0 ? "🏆" : index === 1 ? "🏆" : "🏆"}</Text>
            <View style={styles.rankPointRow}>
              <CoinIcon color={colors.primary} size={18} strokeWidth={typography.iconStrokeWidth} />
              <Text style={styles.rankPoint}>{row.points}</Text>
            </View>
          </View>
        ))}
      </View>
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
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 34,
    marginBottom: spacing.lg,
  },
  taskRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 78,
    paddingVertical: spacing.md,
  },
  taskLogo: {
    alignItems: "center",
    borderRadius: radii.chip,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  taskLogoSoft: {
    backgroundColor: "#E8FBF5",
  },
  goLogo: {
    backgroundColor: "#D9F8EF",
  },
  goLogoText: {
    color: colors.primaryDark,
    fontFamily: typography.family,
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: 0,
  },
  orbitLogo: {
    backgroundColor: "#607287",
  },
  orbitLogoText: {
    color: "#EAF3FB",
    fontSize: 40,
    lineHeight: 42,
  },
  pixelLogo: {
    backgroundColor: "#637486",
    borderRadius: 16,
    height: 44,
  },
  glowLogo: {
    backgroundColor: "#F3F4F6",
  },
  glowLogoText: {
    color: "#4285F4",
    fontFamily: typography.family,
    fontSize: 36,
    fontWeight: "700",
  },
  taskCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  taskName: {
    color: "#14233A",
    fontFamily: typography.family,
    fontSize: 22,
    fontWeight: typography.bodyWeight,
  },
  taskPointsPill: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.chip,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 148,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  taskPointsText: {
    color: colors.white,
    fontFamily: typography.family,
    fontSize: 20,
    fontWeight: "500",
  },
  taskCoin: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: radii.chip,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26,
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
    fontWeight: "700",
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
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
  },
  rankAvatarImage: {
    borderRadius: radii.chip,
    height: 46,
    width: 46,
  },
  rankName: {
    color: "#14233A",
    flex: 1,
    fontFamily: typography.family,
    fontSize: 22,
    minWidth: 0,
  },
  rankTrophy: {
    fontSize: 24,
    lineHeight: 28,
  },
  rankPointRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 88,
  },
  rankPoint: {
    color: colors.primary,
    fontFamily: typography.family,
    fontSize: 24,
    fontWeight: typography.bodyWeight,
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
