import { Link } from "expo-router";
import {
  CircleDollarSign as CoinIcon,
  MousePointerClick as MousePointerClickIcon,
  Trophy as TrophyIcon,
} from "@mobile/theme/icons";
import { useState } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import profileAvatarImage from "../../assets/profile-avatar.png";
import questBannerImage from "../../assets/quest-banner-en.png";
import questHowToEarnImage from "../../assets/quest-how-to-earn-en.png";
import questPromoImage from "../../assets/quest-banner2.png";
import { AccountPageShell } from "@mobile/components/AccountPageShell";
import { MotionPressable } from "@mobile/components/MotionPressable";
import {
  mobileShellLayout,
  webAccountPageSurface,
  webHomePromoSections,
  webQuestLeaderboardRows,
  webQuestTaskRows,
  webQuestTabs,
} from "@mobile/design/webDesignParity";
import { colors, radii, shadows, spacing, typography } from "@mobile/theme/tokens";

type QuestTabId = (typeof webQuestTabs)[number]["id"];

const exploreOtherShops = webHomePromoSections.find((section) => section.id === "travel");

export function CustomerQuestScreen({ history = false }: { history?: boolean }) {
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

  return (
    <AccountPageShell activeRouteId="quest" title={history ? "Quest History" : "Quest"}>
      <Image
        alt="GoGoQuest bonus banner"
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
              onPress={() => setActiveTab(tab.id)}
              pressScale={0.98}
              style={[styles.tabButton, active ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {"icon" in tab ? "🏆 " : ""}
                {tab.label}
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
              alt="GoGoQuest how to earn illustration"
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
  return (
    <View style={styles.taskPanel}>
      <Text style={styles.taskTitle}>Let’s Got the Tasks Done!</Text>
      {webQuestTaskRows.map((task) => (
        <View key={task.title} style={styles.taskRow}>
          <TaskLogo task={task} />
          <View style={styles.taskCopy}>
            <Text style={styles.taskName}>{task.title}</Text>
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

function QuestLeaderboardPanel({ mediaColumnWidth }: { mediaColumnWidth: number }) {
  return (
    <View style={styles.leaderboardPanel}>
      <Image
        alt="GoGoQuest leaderboard tips illustration"
        resizeMode="cover"
        source={questPromoImage}
        style={[styles.promoImage, { height: mediaColumnWidth / (484 / 320) }]}
      />
      <View style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <View style={styles.leaderboardTitleRow}>
            <Text style={styles.leaderboardEmoji}>🏆</Text>
            <Text style={styles.leaderboardTitle}>GoGoQuest</Text>
          </View>
          <Link asChild href="/quest/history">
            <MotionPressable pressScale={0.98} style={styles.historyButton}>
              <TrophyIcon
                color={colors.primaryDark}
                size={20}
                strokeWidth={typography.iconStrokeWidth}
              />
              <Text style={styles.historyLink}>GoGoQuest History</Text>
            </MotionPressable>
          </Link>
        </View>
        {webQuestLeaderboardRows.map((row, index) => (
          <View key={row.name} style={styles.rankRow}>
            <Image
              alt={`${row.name} avatar`}
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
  if (!exploreOtherShops) {
    return null;
  }

  return (
    <View style={styles.exploreSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Explore other Shops</Text>
        <Link asChild href="/brand">
          <MotionPressable pressScale={0.98}>
            <Text style={styles.viewAll}>View all →</Text>
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
                    alt={`${card.brand} logo`}
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
                <Text style={styles.shopCashbackLabel}>Cashback up to</Text>
                <Text style={styles.shopCashback}>{card.cashback}</Text>
              </View>
            </MotionPressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
