import { describe, expect, it } from "vitest";

import {
  buildQuestWordingOptions,
  defaultQuestTaskWording,
  filterQuestWordingOptions,
  normalizeQuestTaskWordingDraft,
  questWordingHelperText,
  resolveQuestTaskWording,
} from "./questTaskWording";

describe("questTaskWording", () => {
  const offer = {
    _id: "offer-1",
    offer_name: "Poplook #85",
    offer_name_display: "Poplook (MY)",
  };

  it("defaultQuestTaskWording > given locale > then expands brand into template", () => {
    expect(defaultQuestTaskWording(offer, "en")).toBe(
      "Make an order on Poplook (MY)",
    );
    expect(defaultQuestTaskWording(offer, "th")).toBe(
      "สั่งซื้อที่ Poplook (MY)",
    );
  });

  it("buildQuestWordingOptions > given locale > then returns searchable presets", () => {
    const en = buildQuestWordingOptions("en", "Poplook (MY)");
    expect(en).toContain("Shop at Poplook (MY)");
    expect(filterQuestWordingOptions(en, "shop")).toEqual([
      "Shop at Poplook (MY)",
    ]);
  });

  it("resolveQuestTaskWording > given Thai locale > then prefers Thai copy", () => {
    expect(
      resolveQuestTaskWording(
        {
          wording_en: "Make an order on Poplook (MY)",
          wording_th: "ช้อปที่ Poplook (MY)",
        },
        offer,
        "th",
      ),
    ).toBe("ช้อปที่ Poplook (MY)");
  });

  it("normalizeQuestTaskWordingDraft > given legacy wording > then maps to English field", () => {
    expect(
      normalizeQuestTaskWordingDraft({
        wording: "Make an order on Klook Travel",
      }),
    ).toEqual({
      wording_en: "Make an order on Klook Travel",
      wording_th: "",
    });
  });

  it("questWordingHelperText > given a brand offer > then it says leaving blank uses the brand default", () => {
    const text = questWordingHelperText(offer);
    expect(text).toContain("Leave blank");
    expect(text).toContain("brand default");
  });

  it("questWordingHelperText > given no offer/brand > then it says wording is required (no false blank promise)", () => {
    const text = questWordingHelperText(null);
    expect(text).toContain("required");
    expect(text).not.toContain("Leave blank");
  });
});
