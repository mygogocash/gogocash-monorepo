import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// CustomerQuestScreen renders inside AccountPageShell, which reaches i18n/LocaleProvider
// (-> CustomerLocaleRegionControl -> expo-localization -> expo-modules-core, which touches
// the native `expo` global that does not exist under happy-dom: "__DEV__ is not defined").
// Device locale is not under test, so mock the module at the seam — the same pattern the
// wallet/auth/profile/discovery render tests use. (No @mobile/observability mock needed:
// this screen does not import Sentry — verified in source.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

// Quest tasks now come from TWO hooks (the "Both" design): useQuestTaskRows = the signed-in
// user's PERSONAL progress (/point/quest-progress, auth-gated), and useQuestBrandTasks = the
// PUBLIC earn-list (/offer/extra-point, shown to everyone). Both are stubbed here via mutable
// state so a single mock factory can model signed-in vs signed-out without re-mocking.
type QuestRowLike = Record<string, unknown> & { key: string };
type HookResultLike = {
  error: null;
  retry: () => void;
  rows: QuestRowLike[];
  status: "error" | "loading" | "ready";
};

const PERSONAL_ROWS: QuestRowLike[] = [
  {
    current: 1,
    href: "/shop/offer-1",
    icon: "go",
    key: "quest:brand",
    points: "+50 Points",
    progressLabel: "1 / 1 purchase",
    state: "completed",
    stateLabel: "Completed",
    target: 1,
    taskType: "brand_purchase",
    title: "Brand purchase task",
    unit: "purchase",
  },
  {
    capLabel: "Reward limit reached",
    capReached: true,
    capReason: "max_referrals_per_user",
    current: 2,
    icon: "glow",
    key: "quest:referral",
    points: "+75 Points",
    progressLabel: "2 / 2 referrals",
    state: "in_progress",
    stateLabel: "In progress",
    target: 2,
    taskType: "friend_referral",
    title: "Friend referral task",
    unit: "referral",
  },
  {
    current: 125000,
    icon: "orbit",
    key: "quest:spend",
    points: "+100 Points",
    progressLabel: "THB 1,250 / THB 1,500",
    state: "compensated",
    stateLabel: "Reversed",
    target: 150000,
    taskType: "spend_target",
    title: "Spend target task",
    unit: "thb_minor",
  },
  {
    current: 0,
    href: "/shop/offer-2",
    icon: "go",
    key: "quest:not-started",
    points: "+25 Points",
    progressLabel: "0 / 1 purchase",
    state: "not_started",
    stateLabel: "Not started",
    target: 1,
    taskType: "brand_purchase",
    title: "Not started task",
    unit: "purchase",
  },
];

const BRAND_ROWS: QuestRowLike[] = [
  {
    current: 0,
    href: "/shop/offer-klook",
    icon: "go",
    key: "extra-point:offer-klook",
    points: "+50 Points",
    progressLabel: "",
    state: "not_started",
    stateLabel: "",
    target: 1,
    taskType: "brand_purchase",
    title: "Klook Travel",
    unit: "purchase",
  },
  {
    current: 0,
    href: "/shop/offer-traveloka",
    icon: "go",
    key: "extra-point:offer-traveloka",
    points: "+50 Points",
    progressLabel: "",
    state: "not_started",
    stateLabel: "",
    target: 1,
    taskType: "brand_purchase",
    title: "Traveloka TH",
    unit: "purchase",
  },
  {
    current: 0,
    href: "/shop",
    icon: "go",
    key: "extra-point:shop-300",
    points: "+50 Points",
    progressLabel: "",
    state: "not_started",
    stateLabel: "",
    target: 1,
    taskType: "brand_purchase",
    title: "Shop 300 Baht+ on any shops",
    unit: "purchase",
  },
];

const ready = (rows: QuestRowLike[]): HookResultLike => ({
  error: null,
  retry: vi.fn(),
  rows,
  status: "ready",
});

let personalState: HookResultLike;
let brandState: HookResultLike;

vi.mock("@mobile/quest/questTaskResource", () => ({
  useQuestTaskRows: () => personalState,
  useQuestBrandTasks: () => brandState,
}));

import { CustomerQuestScreen } from "@mobile/screens/CustomerQuestScreen";

// Wave B (B5) per-screen UX adoption for the GoGoQuest screen (quest banner, How-to-win /
// Tasks / Leaderboard tabs, my-rank card, leaderboard rows, and the Quest History view).
// RENDER suite: it MOUNTS the hub (default + history) to prove the screen still renders after
// the additive changes, AND reads the screen source to assert a behavior/source signal for
// each applied Wave A foundation.
//
// useCopy is stubbed to a passthrough in the render harness (vitest.render.config.ts), so
// tc("...") returns the English literal verbatim — getByText asserts against English copy.
const questSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../screens/CustomerQuestScreen.tsx",
  ),
  "utf8",
);

function renderQuest(props?: { history?: boolean }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerQuestScreen, props),
    ),
  );
}

beforeEach(() => {
  // Default: signed-in shopper with personal progress AND the public earn-list ("Both").
  personalState = ready(PERSONAL_ROWS);
  brandState = ready(BRAND_ROWS);
});

describe("CustomerQuestScreen (render)", () => {
  it("mounts the quest hub without throwing", () => {
    expect(() => renderQuest()).not.toThrow();
  });

  it("renders the default How-to-win hub with its three tabs", () => {
    renderQuest();
    // Tab labels come straight from webQuestTabs; the leaderboard tab is prefixed "🏆 ".
    expect(screen.getByText("How to win!")).toBeTruthy();
    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.getByText(/Leaderboard/)).toBeTruthy();
    // "Explore other Shops" footer section renders below the grid.
    expect(screen.getByText("Explore other Shops")).toBeTruthy();
  });

  it("shows the public brand earn-list under the How-to-win tab too", () => {
    // Prod parity: the tasks are visible on the how-to-earn tab, not only the Tasks tab.
    renderQuest();
    expect(screen.getAllByText("Klook Travel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shop 300 Baht+ on any shops").length).toBeGreaterThan(0);
  });

  it("renders every canonical personal task type with progress, points, and completion state", () => {
    renderQuest();
    fireEvent.click(screen.getByText("Tasks"));

    expect(screen.getByText("Brand purchase task")).toBeTruthy();
    expect(screen.getByText("Friend referral task")).toBeTruthy();
    expect(screen.getByText("Spend target task")).toBeTruthy();
    expect(screen.getByText("1 / 1 purchase")).toBeTruthy();
    expect(screen.getByText("2 / 2 referrals")).toBeTruthy();
    expect(screen.getByText("THB 1,250 / THB 1,500")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("Reward limit reached")).toBeTruthy();
    expect(screen.getByText("Reversed")).toBeTruthy();
    expect(screen.getByText("Not started")).toBeTruthy();
  });

  it("signed-in: renders BOTH the personal progress section and the public earn-list", () => {
    renderQuest();
    fireEvent.click(screen.getByText("Tasks"));

    // Personal overlay (signed-in only) carries its own "Quest progress" section header.
    expect(screen.getByText("Quest progress")).toBeTruthy();
    expect(screen.getByText("Brand purchase task")).toBeTruthy();
    // Public earn-list is shown to everyone.
    expect(screen.getAllByText("Klook Travel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Traveloka TH").length).toBeGreaterThan(0);
  });

  it("signed-out: shows the public brand list to everyone, not an empty state", () => {
    personalState = ready([]); // signed-out -> no personal rows
    renderQuest();
    fireEvent.click(screen.getByText("Tasks"));

    // The public earn-list still renders for a signed-out visitor (prod parity).
    expect(screen.getAllByText("Klook Travel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shop 300 Baht+ on any shops").length).toBeGreaterThan(0);
    // No personal section and no "nothing here" dead-end.
    expect(screen.queryByText("Quest progress")).toBeNull();
    expect(screen.queryByText("No active quest tasks right now.")).toBeNull();
  });

  it("mounts the quest history view without throwing", () => {
    expect(() => renderQuest({ history: true })).not.toThrow();
  });

  it("renders the quest history leaderboard + month-over-month insight sections", () => {
    renderQuest({ history: true });
    expect(screen.getByText("How shoppers rank")).toBeTruthy();
    expect(screen.getByText("A quick read on your months")).toBeTruthy();
    expect(screen.getByText("Which period do you want to see?")).toBeTruthy();
    // Populated mock data (web parity mock mode): a reward row renders.
    expect(screen.getByText("March top-10 bonus")).toBeTruthy();
    // Leaderboard mock: the current user row + per-row View buttons render.
    expect(screen.getByText("Demo S...hopper")).toBeTruthy();
    expect(screen.getAllByText("View").length).toBeGreaterThan(0);
  });
});

describe("CustomerQuestScreen — Wave B (B5) foundations adopted (source signals)", () => {
  it("tab labels read normal weight — the active underline carries the emphasis", () => {
    // Design feedback 2026-07-10: วิธีชนะ!/ภารกิจ/ตารางอันดับ carried a 600
    // weight on every tab; the mint underline + color already mark the active
    // one.
    expect(questSource).toMatch(/tabText:[\s\S]*?fontWeight: "400"/);
  });

  it("imports haptics and fires impact() on the quest CTAs", () => {
    // Wired onto the EXISTING tab-select + View Points handlers (selection/confirm cue),
    // not a new path.
    expect(questSource).toContain('from "@mobile/lib/haptics"');
    expect(questSource).toContain("haptics.impact(");
  });

  it("fires the impact() haptic from the tab-strip selection handler", () => {
    // The tab MotionPressable onPress must both switch the tab and fire the haptic.
    expect(questSource).toMatch(/setActiveTab\(tab\.id\)/);
    expect(questSource).toMatch(
      /onPress=\{\(\) => \{[\s\S]*?haptics\.impact\(\)[\s\S]*?\}\}/,
    );
  });

  it("caps the task titles with numberOfLines so they don't overflow in Thai", () => {
    // task titles (e.g. "Grocery Galaxy") grow in Thai; cap the <Text style={styles.taskName}>.
    // Format-agnostic (\s+) so a Prettier one-line/multi-line reflow doesn't break the assertion.
    expect(questSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.taskName\}/,
    );
  });

  it("caps the my-rank labels and View Points label with numberOfLines", () => {
    // "My Total Points" / "View Points" grow in Thai inside fixed-size rank chrome.
    // Format-agnostic: assert numberOfLines={1} co-occurs with each style on the same <Text>
    // (Prettier may keep both props on one line or wrap them).
    expect(questSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.myRankLabel\}/,
    );
    expect(questSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.viewPointsText\}/,
    );
  });

  it("gives the icon-led View Points and History buttons a hitSlop to reach a 44px tap target", () => {
    // Neither button declares a minHeight, so add hitSlop on each MotionPressable.
    expect(questSource).toContain("hitSlop=");
    expect(questSource).toMatch(
      /hitSlop=[\s\S]*?style=\{styles\.viewPointsButton\}/,
    );
    expect(questSource).toMatch(
      /hitSlop=[\s\S]*?style=\{styles\.historyButton\}/,
    );
  });

  it("wires the leaderboard + my-rank + window to the real /point API, not the static fixture", () => {
    // Regression guard: the Quest leaderboard panel must consume the real resource hooks
    // (which fall back to the designed fixtures only in non-backend/design builds), NOT map
    // the static webQuestLeaderboardRows directly. On beta (accountDataSource==="backend")
    // this is what surfaces the real GoGoQuest ranking.
    expect(questSource).toContain('from "@mobile/quest/questRankResource"');
    expect(questSource).toContain("useQuestWindow()");
    expect(questSource).toContain("useQuestLeaderboard(questWindow)");
    expect(questSource).toContain("useMyQuestRank(questWindow)");
    expect(questSource).toContain("rows={leaderboard.rows}");
    expect(questSource).not.toContain("webQuestLeaderboardRows.map(");
  });

  it("wires the PUBLIC brand earn-list to /offer/extra-point via useQuestBrandTasks", () => {
    // The Tasks panel must consume the public hook so signed-out visitors see the earn-list.
    expect(questSource).toContain("useQuestBrandTasks()");
  });
});
