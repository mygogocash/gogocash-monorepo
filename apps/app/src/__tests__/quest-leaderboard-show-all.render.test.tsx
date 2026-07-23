import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Device locale is not under test — mock the native seam (same pattern as the other quest
// render tests) so happy-dom doesn't trip on the expo native global.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

// Both CustomerQuestScreen AND AccountPageShell read useWindowDimensions to decide the
// mobile/desktop branch (isDesktop = width >= 1024). Mock that ONE react-native export
// (keep everything else -> react-native-web) and mutate `viewport.width` per test.
const viewport = { width: 375, height: 812, scale: 2, fontScale: 1 };
vi.mock("react-native", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-native");
  return { ...actual, useWindowDimensions: () => viewport };
});

// The Tasks panels need the task hooks; this suite is about the LEADERBOARD, so stub the
// task resource to empty-but-ready so the screen mounts on any tab without throwing.
vi.mock("@mobile/quest/questTaskResource", () => ({
  useQuestTaskRows: () => ({ error: null, retry: vi.fn(), rows: [], status: "ready" }),
  useQuestBrandTasks: () => ({ error: null, retry: vi.fn(), rows: [], status: "ready" }),
}));

// Drive the leaderboard with a controllable, larger-than-top-5 set. This isolates the
// PANEL behavior (how many of the hook's rows it renders); the hook's own "return ALL
// ranked rows" mapping is covered by quest-rank-mapper.test.ts.
const SEVEN_ROWS = [
  { key: "r1", name: "Racer-1", points: "56,477" },
  { key: "r2", name: "Racer-2", points: "54,912" },
  { key: "r3", name: "Racer-3", points: "53,005" },
  { key: "r4", name: "Racer-4", points: "42,575" },
  { key: "r5", name: "Racer-5", points: "32,159" },
  { key: "r6", name: "Racer-6", points: "21,004" },
  { key: "r7", name: "Racer-7", points: "12,880" },
];

vi.mock("@mobile/quest/questRankResource", () => ({
  // The screen imports this constant for the compact desktop-rail cap — keep it in sync
  // with the real module (mapper QUEST_LEADERBOARD_TOP_N = 5) so the rail limit is real.
  QUEST_LEADERBOARD_TOP_N: 5,
  useQuestWindow: () => ({
    status: "ready",
    window: { startPath: "2026-07-01", endPath: "2026-07-31" },
  }),
  useQuestLeaderboard: () => ({
    rows: SEVEN_ROWS,
    status: "ready",
    usesFixture: false,
  }),
  useMyQuestRank: () => ({
    data: {
      rankValue: "12th",
      pointsValue: "1,250",
      spendingValue: "950",
      specialTasksValue: "300",
    },
    status: "ready",
  }),
}));

import { CustomerQuestScreen } from "@mobile/screens/CustomerQuestScreen";

function renderQuest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerQuestScreen, {}),
    ),
  );
}

beforeEach(() => {
  viewport.width = 375;
});

describe("GoGoQuest leaderboard — shows all participants", () => {
  it("leaderboard tab lists EVERY participant, not just the top 5", () => {
    renderQuest();
    fireEvent.click(screen.getByText(/Leaderboard/));

    // All seven ranked players render — including ranks 6 and 7 that the old top-5 cap hid.
    for (const row of SEVEN_ROWS) {
      expect(screen.getByText(row.name)).toBeTruthy();
    }
  });

  it("desktop side-rail (shown beside other tabs) stays a compact top-5 glance", () => {
    // On desktop, while viewing How-to-win/Tasks, the leaderboard renders as a secondary
    // rail — that glance must stay compact even though the tab shows everyone.
    viewport.width = 1440;
    renderQuest(); // default tab = How-to-win -> the rail is the only leaderboard surface

    expect(screen.getByText("Racer-1")).toBeTruthy();
    expect(screen.getByText("Racer-5")).toBeTruthy();
    // Ranks 6+ are trimmed from the compact rail.
    expect(screen.queryByText("Racer-6")).toBeNull();
    expect(screen.queryByText("Racer-7")).toBeNull();
  });
});
