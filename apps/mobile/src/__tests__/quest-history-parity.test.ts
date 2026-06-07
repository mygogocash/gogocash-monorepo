import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { webQuestHistory } from "@mobile/design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

// Quest History parity: /quest/history renders <CustomerQuestScreen history />. The dedicated
// history view mirrors the web GogoquestHistory.tsx — hero + plan card, "this round" campaign card
// (populated with mock-mode data), monthly bars, rewards list, leaderboard + month-over-month
// insight. Copy is the EXACT web next-intl gogoquestHistory* English values.
describe("Quest History parity", () => {
  it("quest history fixture > given the web gogoquestHistory copy > then the mobile fixture matches it verbatim", () => {
    expect(webQuestHistory).toMatchObject({
      heroKicker: "GoGoQuest",
      heroTitle: "See your points, rewards, and how you rank—then plan your next shop.",
      pageIntro: "Earn quest points when you shop through GoGoCash during an active round. Here you can check your score, look back month by month, see bonuses you unlocked, and peek at the leaderboard. Use it to decide when to shop next and which tasks or stores to hit.",
      planTitle: "Plan your next round",
      planSteps: [
        "Open Quest to see time-limited tasks and stores that give extra points.",
        "Start from GoGoCash, then complete checkout at the partner store so your order counts.",
        "Check this page again to watch your points grow and grab bonuses when you qualify.",
      ],
      viewQuestHubShort: "Quest",
      planCtaBrowseShort: "Stores",
      currentCampaign: "This quest round",
      roundShopHint: "These are the dates when eligible shopping and tasks can add to your quest score.",
      periodLabel: "Shop & earn during",
      periodPending: "The next quest round is not open yet. We will show the dates here when it starts.",
      yourScoreLabel: "Your quest points",
      signInHint: "Sign in to see your quest points and history.",
      scoreFootnote: "From this round only. Older months are listed below.",
      monthlySection: "Your points by month",
      monthlySectionHint: "Taller bars mean a stronger month—use it to spot when you shopped most.",
      emptyMonthly: "Once you earn quest points, you will see each month here with a simple bar so you can compare at a glance.",
      pointsSuffix: "pts",
      rewardsSection: "Bonuses you earned",
      rewardsSectionHint: "Extra points or perks unlocked from quests—great to review before the next round.",
      emptyRewards: "No bonuses yet—complete quest tasks during a round to unlock extra points and perks.",
    });
  });

  it("quest screen > given the history route > then it renders a dedicated QuestHistoryView from the fixture", () => {
    const questScreen = readMobileFile("src/screens/CustomerQuestScreen.tsx");

    // history branch renders the dedicated view (not just the leaderboard tab)
    expect(questScreen).toContain("QuestHistoryView");
    expect(questScreen).toContain("webQuestHistory");
    expect(questScreen).toContain("if (history)");
    expect(questScreen).toContain("<QuestHistoryView />");

    // each minimal-slice section is surfaced via the fixture
    expect(questScreen).toContain("webQuestHistory.heroTitle");
    expect(questScreen).toContain("webQuestHistory.planTitle");
    expect(questScreen).toContain("webQuestHistory.planSteps");
    expect(questScreen).toContain("webQuestHistory.currentCampaign");
    expect(questScreen).toContain("webQuestHistory.yourScoreLabel");
    expect(questScreen).toContain("webQuestHistory.monthlySection");
    expect(questScreen).toContain("webQuestHistory.rewardsSection");
  });

  it("quest history > given the desktop sub-page > then it adds the leaderboard + month-over-month insight sections", () => {
    const questScreen = readMobileFile("src/screens/CustomerQuestScreen.tsx");
    // Month-over-month insight (web parity: GogoquestHistoryInsightSection)
    expect(questScreen).toContain("QuestHistoryInsight");
    expect(questScreen).toContain("A quick read on your months");
    // "How shoppers rank" leaderboard with the period picker + reusable ranking table
    expect(questScreen).toContain("QuestHistoryLeaderboard");
    expect(questScreen).toContain("How shoppers rank");
    expect(questScreen).toContain("Which period do you want to see?");
    expect(questScreen).toContain("QuestRankRows");
    // Both new sections are rendered inside the history view
    expect(questScreen).toContain("<QuestHistoryInsight />");
    expect(questScreen).toContain("<QuestHistoryLeaderboard />");
    // Per-rank trophy icons use the web rank PNGs (rank1..5 + rank6_10), not a tinted flat icon.
    expect(questScreen).toContain("quest-rank/rank1.png");
    expect(questScreen).toContain("rankTrophyImages");
    expect(questScreen).not.toContain("rankTrophyTints");
  });

  it("quest history > given mock mode > then this-round/monthly/rewards show populated mock data", () => {
    const questScreen = readMobileFile("src/screens/CustomerQuestScreen.tsx");
    expect(questScreen).toContain("QUEST_HISTORY_MOCK");
    // This-round shows the campaign date range + days-left + score, not the pending/sign-in states.
    expect(questScreen).toContain("March 1 – March 31, 2026");
    expect(questScreen).toContain("historyScoreValue");
    expect(questScreen).not.toContain("webQuestHistory.periodPending");
    expect(questScreen).not.toContain("webQuestHistory.signInHint");
    // Monthly bars + reward rows replace the empty states.
    expect(questScreen).toContain("historyMonthlyBarFill");
    expect(questScreen).toContain("March top-10 bonus");
    expect(questScreen).not.toContain("webQuestHistory.emptyMonthly");
    expect(questScreen).not.toContain("webQuestHistory.emptyRewards");
  });

  it("quest history > leaderboard shows the full mock ranking + per-row View player dialog", () => {
    const questScreen = readMobileFile("src/screens/CustomerQuestScreen.tsx");
    expect(questScreen).toContain("QUEST_HISTORY_LEADERBOARD");
    expect(questScreen).toContain("Demo Shopper");
    // My Rank reflects the web mock (4th / 940).
    expect(questScreen).toContain("QUEST_HISTORY_MY_RANK");
    expect(questScreen).toContain('rankValue: "4th"');
    // Per-row "View" opens the player summary dialog.
    expect(questScreen).toContain("QuestPlayerSummaryDialog");
    expect(questScreen).toContain("Player quest summary");
    expect(questScreen).toContain("truncateQuestName");
    // Only the top 10 ranks are listed, and the point coin matches the web (bath.svg port).
    expect(questScreen).toContain("QUEST_HISTORY_LEADERBOARD.slice(0, 10)");
    expect(questScreen).toContain("QuestCoinIcon");
  });
});
