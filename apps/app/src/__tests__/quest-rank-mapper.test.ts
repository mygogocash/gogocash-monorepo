import { describe, expect, it } from "vitest";

import {
  QUEST_LEADERBOARD_TOP_N,
  mapMyQuestRank,
  mapQuestLeaderboardRows,
  mapQuestWindow,
  questLeaderboardEndpoint,
  questMyRankEndpoint,
  questWindowEndpoint,
} from "@mobile/quest/questRankMapper";

// Real /point/check-points row shape (verified against api-beta 2026-07-22): each row
// carries user_id, username, email, point, and sometimes the breakdown fields. NO rank
// field (rank = sort index). Email must NEVER be surfaced to the UI.
const leaderboardPayload = [
  {
    _id: "69701fc66e498fea442c9e17",
    user_id: "69701fc66e498fea442c9e17",
    username: "Jobjob 3",
    email: "grvos21@gmail.com",
    point: 56477,
    extra_point_received: 50,
    bonus_over_300_received: 50,
  },
  {
    user_id: "u2",
    username: "จารุวัฒน์ ตันติเตชานันท์",
    email: "leak@example.com",
    point: 54912,
  },
  { user_id: "u3", username: "Ann", email: "a@b.co", point: 900 },
  { user_id: "u4", username: "Zarawut Piromrit", email: "z@z.co", point: 800 },
  { user_id: "u5", username: "Neo", email: "n@n.co", point: 700 },
  { user_id: "u6", username: "Overflow", email: "o@o.co", point: 10 },
];

describe("mapQuestLeaderboardRows", () => {
  it("maps real rows to {key,name,points}, truncates like prod, and never leaks email", () => {
    const rows = mapQuestLeaderboardRows(leaderboardPayload);

    // The leaderboard tab shows EVERY ranked participant — mapping keeps all rows by
    // default (the compact desktop rail asks for a top-N slice explicitly, see below).
    expect(rows).toHaveLength(leaderboardPayload.length); // all 6, NOT capped to top-5
    // The 6th row (dropped by the old default top-5 cap) is now surfaced.
    expect(rows[5]).toEqual({ key: "u6", name: "Ove...low", points: "10" }); // "Overflow" (8)
    // Prod truncation: len<=11 -> slice(0,3)+"..."+slice(-3); len>11 -> slice(0,6)+"..."+slice(-6).
    expect(rows[0]).toEqual({
      key: "69701fc66e498fea442c9e17",
      name: "Job...b 3", // "Jobjob 3" (8 chars)
      points: "56,477",
    });
    // Thai name (>11 code units): truncated 6+6 with an ellipsis, exact UTF-16 slice
    // left unpinned (combining marks make it fragile) — but it must be shortened.
    expect(rows[1].name).toContain("...");
    expect(rows[1].name).not.toBe("จารุวัฒน์ ตันติเตชานันท์");
    expect(rows[3].name).toBe("Zarawu...romrit"); // "Zarawut Piromrit" (16 chars) -> 6+6

    // No object anywhere carries an email field.
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(["key", "name", "points"]);
      expect(JSON.stringify(row)).not.toContain("@");
    }
  });

  it("returns [] for a non-array payload", () => {
    expect(mapQuestLeaderboardRows(null)).toEqual([]);
    expect(mapQuestLeaderboardRows({ data: [] })).toEqual([]);
  });

  it("honors an explicit topN (the compact desktop rail asks for QUEST_LEADERBOARD_TOP_N)", () => {
    expect(mapQuestLeaderboardRows(leaderboardPayload, 2)).toHaveLength(2);
    expect(
      mapQuestLeaderboardRows(leaderboardPayload, QUEST_LEADERBOARD_TOP_N),
    ).toHaveLength(QUEST_LEADERBOARD_TOP_N); // 5
  });
});

describe("mapMyQuestRank", () => {
  it("computes rank ordinal, points, and the prod spending/special-tasks split", () => {
    // specialTasks = extra_point_received + extra_point_referral + bonus_over_300_received
    //              + point_social_reward ; spending = point - specialTasks.
    const mapped = mapMyQuestRank({
      rank: 12,
      point: 1250,
      extra_point_received: 100,
      extra_point_referral: 50,
      bonus_over_300_received: 50,
      point_social_reward: 100,
    });
    expect(mapped).toEqual({
      rankValue: "12th",
      pointsValue: "1,250",
      spendingValue: "950",
      specialTasksValue: "300",
    });
  });

  it("defaults missing breakdown fields to 0", () => {
    const mapped = mapMyQuestRank({ rank: 4, point: 800, extra_point_received: 50 });
    expect(mapped).toEqual({
      rankValue: "4th",
      pointsValue: "800",
      spendingValue: "750",
      specialTasksValue: "50",
    });
  });

  it("accepts an array payload (uses the first row)", () => {
    expect(mapMyQuestRank([{ rank: 1, point: 100 }])?.rankValue).toBe("1st");
  });

  it("mirrors prod's ordinal (1/2/3 -> st/nd/rd, everything else -> th)", () => {
    expect(mapMyQuestRank({ rank: 1, point: 1 })?.rankValue).toBe("1st");
    expect(mapMyQuestRank({ rank: 2, point: 1 })?.rankValue).toBe("2nd");
    expect(mapMyQuestRank({ rank: 3, point: 1 })?.rankValue).toBe("3rd");
    expect(mapMyQuestRank({ rank: 13, point: 1 })?.rankValue).toBe("13th");
  });

  it("returns null for an unusable payload", () => {
    expect(mapMyQuestRank(null)).toBeNull();
    expect(mapMyQuestRank({})).toBeNull();
  });

  it("treats an unranked user as no-rank (never a fabricated '0th')", () => {
    // The backend's getMyQuestRankListOfPoint returns { rank: 0 } (findIndex(-1)+1) with
    // NO point field when the authed user has no qualifying points in the window — i.e. they
    // are unranked. That must map to null (-> honest signed-out zeros), not "0th".
    expect(mapMyQuestRank({ rank: 0 })).toBeNull();
    expect(mapMyQuestRank({ rank: 0, point: 0, extra_point_received: 0 })).toBeNull();
    expect(mapMyQuestRank({ rank: -1, point: 5 })).toBeNull();
  });
});

describe("mapQuestWindow", () => {
  it("extracts UTC YYYY-MM-DD path params + banner ids from get-quest-open", () => {
    const win = mapQuestWindow({
      _id: "6a43f952106c296bf96389be",
      status: "open",
      start_date: "2026-07-01T00:00:00.000Z",
      end_date: "2026-07-31T00:00:00.000Z",
      banner_en: "1j5ZVzJtHTAwP0XNrWWU70QxZs7Kld2Ns",
      banner_th: "1Wj9OZaA4lDjrL8LziP-xMLxHsNy_4drV",
      sub_banner_en: "1C0dfMXsu_OENLX1mqA61efAao4vFHlV3",
      sub_banner_th: "1VTiRsCi5Eg-pQvYp49WPrKL0z2M1skfk",
    });
    expect(win).toMatchObject({ startPath: "2026-07-01", endPath: "2026-07-31" });
    expect(win?.bannerEn).toBe("1j5ZVzJtHTAwP0XNrWWU70QxZs7Kld2Ns");
  });

  it("returns null when there is no valid open window", () => {
    expect(mapQuestWindow(null)).toBeNull();
    expect(mapQuestWindow({ start_date: "not-a-date" })).toBeNull();
    expect(mapQuestWindow({ start_date: "2026-07-01T00:00:00Z" })).toBeNull(); // no end_date
  });
});

describe("endpoint constants", () => {
  it("point at the verified customer quest routes", () => {
    expect(questWindowEndpoint).toBe("/point/get-quest-open");
    expect(questLeaderboardEndpoint).toBe("/point/check-points");
    expect(questMyRankEndpoint).toBe("/point/my-quest-list");
  });
});
