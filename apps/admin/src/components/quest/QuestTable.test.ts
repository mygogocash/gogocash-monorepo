import { describe, expect, it } from "vitest";
import {
  buildQuestRewardPayloads,
  buildQuestRewardSavePayload,
  validateQuestRewardDistribution,
  validateQuestRewards,
} from "./questRewardEditor";
import {
  bangkokDateTimeInputToISOString,
  toBangkokDateTimeInput,
} from "./questDateTime";
import {
  buildQuestTaskPayloads,
  defaultQuestTaskPoints,
  normalizeQuestTaskPoints,
  switchQuestTaskType,
  validateQuestTasks,
} from "./questTaskEditor";

describe("QuestTable task helpers", () => {
  it("buildQuestTaskPayloads emits only fields valid for each task type", () => {
    const payload = buildQuestTaskPayloads([
      {
        clientId: "b",
        task_key: "task_brand_existing_1234",
        task_type: "brand_purchase",
        offer: "offer-b",
        points: 25,
        sort_order: 10,
        enabled: true,
        wording: " Make an order on Klook Travel ",
        notes: " second ",
      },
      {
        clientId: "a",
        task_type: "friend_referral",
        completion_rule: "first_earning_conversion",
        points: 50,
        sort_order: 2,
        enabled: false,
        wording_en: " ",
        wording_th: "",
        notes: "",
      },
      {
        clientId: "c",
        task_type: "spend_target",
        spend_scope: "any_shop_via_ggc",
        target_thb_minor: 150_000,
        points: 100,
        sort_order: 3,
        enabled: true,
        wording_en: "Spend THB 1,500",
        wording_th: "",
        notes: "",
      },
    ]);

    expect(payload).toEqual([
      {
        task_key: "task_brand_existing_1234",
        task_type: "brand_purchase",
        offer: "offer-b",
        points: 25,
        enabled: true,
        wording: "Make an order on Klook Travel",
        wording_en: "Make an order on Klook Travel",
        wording_th: "",
        notes: "second",
      },
      {
        task_type: "friend_referral",
        completion_rule: "first_earning_conversion",
        points: 50,
        enabled: false,
        wording: "",
        wording_en: "",
        wording_th: "",
        notes: "",
      },
      {
        task_type: "spend_target",
        spend_scope: "any_shop_via_ggc",
        target_thb_minor: 150_000,
        points: 100,
        enabled: true,
        wording: "Spend THB 1,500",
        wording_en: "Spend THB 1,500",
        wording_th: "",
        notes: "",
      },
    ]);
  });

  it("validateQuestTasks validates each variant without requiring a brand globally", () => {
    const duplicate = [
      {
        clientId: "a",
        task_type: "brand_purchase" as const,
        offer: "offer-a",
        points: 50,
        sort_order: 0,
        enabled: true,
        wording: "Buy from offer A",
        notes: "",
      },
      {
        clientId: "b",
        task_type: "brand_purchase" as const,
        offer: "offer-a",
        points: 60,
        sort_order: 1,
        enabled: true,
        wording: "Buy from offer A again",
        notes: "",
      },
    ];
    expect(validateQuestTasks(duplicate)).toContain("only appear once");

    expect(
      validateQuestTasks([{ ...duplicate[0], offer: "offer-c", points: 1 }]),
    ).toContain("2–10,000");

    expect(
      validateQuestTasks([
        {
          clientId: "referral",
          task_type: "friend_referral",
          completion_rule: "account_created",
          points: 50,
          enabled: true,
          wording_en: "Invite",
          wording_th: "",
          notes: "",
        },
      ]),
    ).toBeNull();

    expect(
      validateQuestTasks([
        {
          clientId: "invisible",
          task_type: "friend_referral",
          completion_rule: "account_created",
          points: 50,
          enabled: true,
          wording: "",
          wording_en: " ",
          wording_th: "",
          notes: "",
        },
      ]),
    ).toContain("customer wording");

    expect(
      validateQuestTasks([
        {
          clientId: "spend",
          task_type: "spend_target",
          spend_scope: "any_shop_via_ggc",
          target_thb_minor: 0,
          points: 50,
          enabled: true,
          wording_en: "Spend",
          wording_th: "",
          notes: "",
        },
      ]),
    ).toContain("positive spend target");
  });

  it("switchQuestTaskType clears incompatible fields and keeps presentation copy", () => {
    const brand = {
      clientId: "draft",
      task_key: "task_old_identity",
      task_type: "brand_purchase" as const,
      offer: "offer-a",
      offer_id: 1,
      merchant_id: 10,
      points: 50,
      enabled: true,
      wording_en: "Keep this",
      wording_th: "",
      notes: "Keep notes",
    };

    const referral = switchQuestTaskType(brand, "friend_referral");
    expect(referral).toEqual(
      expect.objectContaining({
        task_type: "friend_referral",
        completion_rule: "account_created",
        points: 50,
        wording_en: "Keep this",
        notes: "Keep notes",
      }),
    );
    expect(referral).not.toHaveProperty("offer");
    expect(referral).not.toHaveProperty("offer_id");
    expect(referral).not.toHaveProperty("merchant_id");
    expect(referral).not.toHaveProperty("task_key");

    const spend = switchQuestTaskType(referral, "spend_target");
    expect(spend).toEqual(
      expect.objectContaining({
        task_type: "spend_target",
        spend_scope: "any_shop_via_ggc",
      }),
    );
    expect(spend).not.toHaveProperty("completion_rule");
  });

  it("defaultQuestTaskPoints > given catalog extra_point 1 > then uses fallback bonus", () => {
    expect(defaultQuestTaskPoints({ extra_point: 1 })).toBe(50);
    expect(defaultQuestTaskPoints({ extra_point: 25 })).toBe(25);
    expect(defaultQuestTaskPoints(null, 100)).toBe(100);
  });

  it("normalizeQuestTaskPoints > given invalid stored value > then repairs to valid default", () => {
    expect(normalizeQuestTaskPoints(1, { extra_point: 1 })).toBe(50);
    expect(normalizeQuestTaskPoints(50, { extra_point: 1 })).toBe(50);
  });

  it("buildQuestRewardPayloads sorts rewards by rank", () => {
    expect(
      buildQuestRewardPayloads([
        { clientId: "r2", rank: 2, reward: 800, currency: "THB" },
        { clientId: "r1", rank: 1, reward: 1200, currency: "THB" },
      ]),
    ).toEqual([
      { rank: 1, reward: 1200, currency: "THB" },
      { rank: 2, reward: 800, currency: "THB" },
    ]);
  });

  it("buildQuestRewardSavePayload includes payout distribution settings", () => {
    expect(
      buildQuestRewardSavePayload(
        [
          { clientId: "r2", rank: 2, reward: 800, currency: "THB" },
          { clientId: "r1", rank: 1, reward: 1200, currency: "THB" },
        ],
        { mode: "after_days", delayDays: 7 },
      ),
    ).toEqual({
      rewards: [
        { rank: 1, reward: 1200, currency: "THB" },
        { rank: 2, reward: 800, currency: "THB" },
      ],
      reward_distribution_mode: "after_days",
      reward_distribution_delay_days: 7,
    });
  });

  it("validateQuestRewards rejects duplicate ranks and negative rewards", () => {
    expect(
      validateQuestRewards([
        { clientId: "r1", rank: 1, reward: 1200, currency: "THB" },
        { clientId: "r2", rank: 1, reward: 800, currency: "THB" },
      ]),
    ).toContain("only appear once");

    expect(
      validateQuestRewards([
        { clientId: "r1", rank: 1, reward: -1, currency: "THB" },
      ]),
    ).toContain("zero or greater");
  });

  it("validateQuestRewardDistribution rejects invalid delayed payouts", () => {
    expect(
      validateQuestRewardDistribution({ mode: "after_days", delayDays: 0 }),
    ).toContain("between 1 and 365");

    expect(
      validateQuestRewardDistribution({
        mode: "campaign_end",
        delayDays: 0,
      }),
    ).toBeNull();
  });

  it("converts stored UTC quest dates into Bangkok datetime input values", () => {
    expect(toBangkokDateTimeInput("2026-06-01T00:00:00.000Z")).toBe(
      "2026-06-01T07:00",
    );
  });

  it("converts Bangkok datetime input values back to UTC ISO timestamps", () => {
    expect(bangkokDateTimeInputToISOString("2026-07-01T09:30")).toBe(
      "2026-07-01T02:30:00.000Z",
    );
  });
});
