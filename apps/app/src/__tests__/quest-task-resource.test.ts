import { describe, expect, it, vi } from "vitest";

import {
  mapBackendQuestTasks,
  questTaskEndpoint,
} from "@mobile/quest/questTaskMapper";
import {
  fetchQuestTaskPayload,
  questTaskQueryKey,
} from "@mobile/quest/questTaskResource";

const progressPayload = [
  {
    quest_id: "quest-1",
    reward_model: "task_v2",
    config_revision: 3,
    window: {
      start_at: "2026-07-01T00:00:00.000Z",
      end_at: "2026-07-31T00:00:00.000Z",
      timezone: "Asia/Bangkok",
    },
    tasks: [
      {
        task_key: "task-brand",
        task_type: "brand_purchase",
        points: 50,
        wording_en: "Buy from Klook",
        wording_th: "ซื้อสินค้าจาก Klook",
        offer: {
          id: "offer-mongo-id",
          name: "Klook",
          logo_url: "https://cdn.example/klook.png",
          shop_path: "/shop/offer-mongo-id",
        },
        progress: {
          state: "completed",
          current: 1,
          target: 1,
          unit: "purchase",
          completion_count: 1,
        },
      },
      {
        task_key: "task-referral",
        task_type: "friend_referral",
        points: 75,
        wording_en: "Invite three friends",
        wording_th: "ชวนเพื่อนสามคน",
        progress: {
          state: "in_progress",
          current: 2,
          target: 2,
          unit: "referral",
          completion_count: 2,
          cap_reached: true,
          cap_reason: "max_referrals_per_user",
        },
      },
      {
        task_key: "task-spend",
        task_type: "spend_target",
        points: 100,
        wording_en: "Spend THB 1,500",
        wording_th: "ใช้จ่าย 1,500 บาท",
        progress: {
          state: "compensated",
          current: 125000,
          target: 150000,
          unit: "thb_minor",
          completion_count: 0,
        },
      },
      {
        task_key: "task-not-started",
        task_type: "brand_purchase",
        points: 25,
        wording_en: "Make another purchase",
        offer: { id: "offer-two" },
        progress: {
          state: "not_started",
          current: 0,
          target: 1,
          unit: "purchase",
          completion_count: 0,
        },
      },
    ],
  },
];

describe("quest task resource", () => {
  it("maps all canonical task types and progress states without shop links on non-brand tasks", () => {
    expect(mapBackendQuestTasks(progressPayload)).toEqual([
      {
        current: 1,
        href: "/shop/offer-mongo-id",
        icon: "go",
        key: "quest-1:task-brand",
        logoUri: "https://cdn.example/klook.png",
        points: "+50 Points",
        progressLabel: "1 / 1 purchase",
        state: "completed",
        stateLabel: "Completed",
        target: 1,
        taskType: "brand_purchase",
        title: "Buy from Klook",
        unit: "purchase",
      },
      {
        capLabel: "Reward limit reached",
        capReached: true,
        capReason: "max_referrals_per_user",
        current: 2,
        icon: "glow",
        key: "quest-1:task-referral",
        points: "+75 Points",
        progressLabel: "2 / 2 referrals",
        state: "in_progress",
        stateLabel: "In progress",
        target: 2,
        taskType: "friend_referral",
        title: "Invite three friends",
        unit: "referral",
      },
      {
        current: 125000,
        icon: "orbit",
        key: "quest-1:task-spend",
        points: "+100 Points",
        progressLabel: "THB 1,250 / THB 1,500",
        state: "compensated",
        stateLabel: "Reversed",
        target: 150000,
        taskType: "spend_target",
        title: "Spend THB 1,500",
        unit: "thb_minor",
      },
      {
        current: 0,
        href: "/shop/offer-two",
        icon: "go",
        key: "quest-1:task-not-started",
        points: "+25 Points",
        progressLabel: "0 / 1 purchase",
        state: "not_started",
        stateLabel: "Not started",
        target: 1,
        taskType: "brand_purchase",
        title: "Make another purchase",
        unit: "purchase",
      },
    ]);
  });

  it("prefers Thai wording and localizes progress copy", () => {
    const rows = mapBackendQuestTasks(progressPayload, [], "th");

    expect(rows[0]).toMatchObject({
      title: "ซื้อสินค้าจาก Klook",
      progressLabel: "1 / 1 รายการซื้อ",
      stateLabel: "สำเร็จแล้ว",
    });
    expect(rows[1]).toMatchObject({
      title: "ชวนเพื่อนสามคน",
      progressLabel: "2 / 2 คนที่แนะนำ",
      stateLabel: "กำลังดำเนินการ",
      capLabel: "ถึงขีดจำกัดรางวัลแล้ว",
    });
    expect(rows[2]).toMatchObject({
      title: "ใช้จ่าย 1,500 บาท",
      progressLabel: "1,250 บาท / 1,500 บาท",
      stateLabel: "ย้อนรายการแล้ว",
    });
  });

  it("accepts a data envelope and rejects malformed task rows", () => {
    expect(mapBackendQuestTasks({ data: progressPayload })).toHaveLength(4);
    expect(mapBackendQuestTasks([{ quest_id: "bad", tasks: [{}] }])).toEqual(
      [],
    );
  });

  it("uses the authenticated progress endpoint and a session-scoped query key", async () => {
    const client = { get: vi.fn().mockResolvedValue(progressPayload) };

    await expect(fetchQuestTaskPayload(client)).resolves.toBe(progressPayload);
    expect(client.get).toHaveBeenCalledWith("/point/quest-progress");
    expect(questTaskEndpoint).toBe("/point/quest-progress");
    expect(
      questTaskQueryKey("https://api.dev.gogocash.co", "user-1", "th"),
    ).toEqual([
      "quest-task-progress",
      "https://api.dev.gogocash.co",
      "/point/quest-progress",
      "user-1",
      "th",
    ]);
  });

  it("returns an empty task list when no active quest exists", () => {
    expect(mapBackendQuestTasks([])).toEqual([]);
    expect(mapBackendQuestTasks({ data: [] })).toEqual([]);
  });
});
