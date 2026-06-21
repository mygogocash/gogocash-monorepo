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
import { buildQuestTaskPayloads, validateQuestTasks } from "./questTaskEditor";

describe("QuestTable task helpers", () => {
  it("buildQuestTaskPayloads preserves UI order as sort_order", () => {
    const payload = buildQuestTaskPayloads([
      {
        clientId: "b",
        offer: "offer-b",
        offer_id: 2,
        merchant_id: 20,
        extra_point: 25,
        sort_order: 10,
        enabled: true,
        wording: " Make an order on Klook Travel ",
        notes: " second ",
      },
      {
        clientId: "a",
        offer: "offer-a",
        offer_id: 1,
        merchant_id: 10,
        extra_point: 50,
        sort_order: 2,
        enabled: false,
        wording: " ",
        notes: "",
      },
    ]);

    expect(payload).toEqual([
      expect.objectContaining({
        offer: "offer-b",
        sort_order: 0,
        wording: "Make an order on Klook Travel",
      }),
      expect.objectContaining({ offer: "offer-a", sort_order: 1, wording: "" }),
    ]);
  });

  it("validateQuestTasks rejects duplicate brands and invalid points", () => {
    const duplicate = [
      {
        clientId: "a",
        offer: "offer-a",
        offer_id: 1,
        merchant_id: 10,
        extra_point: 50,
        sort_order: 0,
        enabled: true,
        wording: "",
        notes: "",
      },
      {
        clientId: "b",
        offer: "offer-a",
        offer_id: 1,
        merchant_id: 10,
        extra_point: 60,
        sort_order: 1,
        enabled: true,
        wording: "",
        notes: "",
      },
    ];
    expect(validateQuestTasks(duplicate)).toContain("only appear once");

    expect(
      validateQuestTasks([
        { ...duplicate[0], offer: "offer-c", extra_point: 1 },
      ]),
    ).toContain("between 2 and 10,000");
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
