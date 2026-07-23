import { describe, expect, it, vi } from "vitest";

import {
  fetchMyQuestRankPayload,
  fetchQuestLeaderboardPayload,
  fetchQuestWindowPayload,
  fixtureQuestLeaderboardRows,
  questLeaderboardPath,
  questMyRankPath,
  questWindowPath,
  signedOutMyQuestRank,
} from "@mobile/quest/questRankResource";

const window = { startPath: "2026-07-01", endPath: "2026-07-31" };

describe("quest rank resource", () => {
  it("builds windowed paths for the verified customer endpoints", () => {
    expect(questWindowPath()).toBe("/point/get-quest-open");
    expect(questLeaderboardPath(window)).toBe(
      "/point/check-points/2026-07-01/2026-07-31",
    );
    expect(questMyRankPath(window)).toBe(
      "/point/my-quest-list/2026-07-01/2026-07-31",
    );
  });

  it("fetch helpers call the client with the built paths", async () => {
    const get = vi.fn().mockResolvedValue("payload");
    const client = { get };
    await expect(fetchQuestWindowPayload(client)).resolves.toBe("payload");
    await fetchQuestLeaderboardPayload(client, window);
    await fetchMyQuestRankPayload(client, window);
    expect(get).toHaveBeenNthCalledWith(1, "/point/get-quest-open");
    expect(get).toHaveBeenNthCalledWith(
      2,
      "/point/check-points/2026-07-01/2026-07-31",
    );
    expect(get).toHaveBeenNthCalledWith(
      3,
      "/point/my-quest-list/2026-07-01/2026-07-31",
    );
  });

  it("derives the design-mode leaderboard fixture from webDesignParity ({key,name,points}, no email)", () => {
    expect(fixtureQuestLeaderboardRows.length).toBeGreaterThan(0);
    for (const row of fixtureQuestLeaderboardRows) {
      expect(Object.keys(row).sort()).toEqual(["key", "name", "points"]);
      expect(JSON.stringify(row)).not.toContain("@");
    }
  });

  it("signed-out My Rank is honest zeros, never a fabricated rank", () => {
    expect(signedOutMyQuestRank).toEqual({
      rankValue: "-",
      pointsValue: "0",
      spendingValue: "0",
      specialTasksValue: "0",
    });
  });
});
