import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerQuestScreen renders inside AccountPageShell, which reaches i18n/LocaleProvider
// (-> CustomerLocaleRegionControl -> expo-localization -> expo-modules-core, which touches
// the native `expo` global that does not exist under happy-dom: "__DEV__ is not defined").
// Device locale is not under test, so mock the module at the seam — the same pattern the
// wallet/auth/profile/discovery render tests use. (No @mobile/observability mock needed:
// this screen does not import Sentry — verified in source.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
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
//
// Applied here:
//  - haptics.impact() on the quest CTAs: the tab-strip selection (How-to-win / Tasks /
//    Leaderboard) and the "View Points" rank-breakdown expander. Wired onto the EXISTING
//    onPress handlers (a selection/confirm cue), not a duplicated path. There is no claim/
//    start handler on this screen — it is a static leaderboard + task display, not an
//    interactive claim flow — so impact() is the meaningful feedback hook.
//  - Thai-truncation: numberOfLines added to the task titles, the task-panel heading, the
//    my-rank labels, the View Points label, and the GoGoQuest History link — copy that grows
//    in Thai and can overflow its row. (rankName / shopName already carry numberOfLines.)
//  - hitSlop: the icon-led "View Points" chevron button and the "GoGoQuest History" trophy
//    button have no minHeight (just margins / flex-end), so their tap target can fall under
//    44px — give each a hitSlop. (Tab buttons minHeight:48, points pills 48, CTAs 44 already
//    clear the target.)
//
// Intentionally NOT adopted (NOTE for reviewer):
//  - Skeleton + Pull-to-refresh (RefreshControl): the entire screen renders from SYNCHRONOUS
//    design-parity data (webQuestTabs / webQuestTaskRows / webQuestLeaderboardRows /
//    webQuestMyRank / webQuestHistory — all `as const`). It owns NO async resource, does NOT
//    use useCustomerAccountResource, and has no refetch — there is nothing to refresh or to
//    render a skeleton into. Same conclusion as the sibling B4 directories. Skipped by design.
//  - useReducedMotion gate: the screen has NO screen-local Animated. All motion is via
//    MotionPressable, which already consumes useReducedMotion internally (Wave A1). Adding the
//    hook here would be dead code. Skipped.
//  - KeyboardAwareScreen: no inputs on this screen. Skipped.
const questSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerQuestScreen.tsx"),
  "utf8"
);

function renderQuest(props?: { history?: boolean }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerQuestScreen, props)
    )
  );
}

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
    expect(questSource).toMatch(/onPress=\{\(\) => \{[\s\S]*?haptics\.impact\(\)[\s\S]*?\}\}/);
  });

  it("caps the task titles with numberOfLines so they don't overflow in Thai", () => {
    // task titles (e.g. "Grocery Galaxy") grow in Thai; cap the <Text style={styles.taskName}>.
    // Format-agnostic (\s+) so a Prettier one-line/multi-line reflow doesn't break the assertion.
    expect(questSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.taskName\}/);
  });

  it("caps the my-rank labels and View Points label with numberOfLines", () => {
    // "My Total Points" / "View Points" grow in Thai inside fixed-size rank chrome.
    // Format-agnostic: assert numberOfLines={1} co-occurs with each style on the same <Text>
    // (Prettier may keep both props on one line or wrap them).
    expect(questSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.myRankLabel\}/);
    expect(questSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.viewPointsText\}/);
  });

  it("gives the icon-led View Points and History buttons a hitSlop to reach a 44px tap target", () => {
    // Neither button declares a minHeight, so add hitSlop on each MotionPressable.
    expect(questSource).toContain("hitSlop=");
    expect(questSource).toMatch(/hitSlop=[\s\S]*?style=\{styles\.viewPointsButton\}/);
    expect(questSource).toMatch(/hitSlop=[\s\S]*?style=\{styles\.historyButton\}/);
  });
});
