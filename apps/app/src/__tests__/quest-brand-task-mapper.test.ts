import { describe, expect, it } from "vitest";

import {
  HARDCODED_SHOP_300_TASK,
  extraPointEndpoint,
  mapPublicBrandTasks,
} from "@mobile/quest/questBrandTaskMapper";

// The public GoGoQuest earn-list ("Let's Got the Tasks Done!") comes from the PUBLIC
// GET /offer/extra-point endpoint (no auth) — verified live on api-beta 2026-07-22 returning
// 6 offers, each extra_point=50. Each offer is mapped onto the SAME QuestTaskRow shape the
// screen's QuestTaskListRow already renders (logo bubble + name + "+N Points" pill + /shop link).
const extraPointPayload = [
  {
    _id: "offer-klook",
    offer_name: "Klook",
    offer_name_display: "Klook Travel",
    extra_point: 50,
    logo_circle: "https://cdn.example/klook-circle.png",
    logo: "https://cdn.example/klook.png",
  },
  {
    // offer_name_display absent -> fall back to offer_name; logo_circle absent -> use logo.
    _id: "offer-traveloka",
    offer_name: "Traveloka TH",
    extra_point: 50,
    logo: "https://cdn.example/traveloka.png",
  },
  {
    // localized quest task wording present -> preferred over the offer name.
    _id: "offer-shopee",
    offer_name: "Shopee TH",
    extra_point: 50,
    quest_task_wording_en: "Shop Shopee flash deals",
    quest_task_wording_th: "ช้อป Shopee ดีลเด็ด",
  },
];

describe("mapPublicBrandTasks", () => {
  it("exposes the verified public extra-point endpoint", () => {
    expect(extraPointEndpoint).toBe("/offer/extra-point");
  });

  it("maps an offer to a QuestTaskRow with href, points pill, logo, and display name", () => {
    const [row] = mapPublicBrandTasks(extraPointPayload);

    expect(row).toEqual({
      current: 0,
      href: "/shop/offer-klook",
      icon: "go",
      key: "extra-point:offer-klook",
      logoUri: "https://cdn.example/klook-circle.png",
      points: "+50 Points",
      progressLabel: "",
      state: "not_started",
      stateLabel: "",
      target: 1,
      taskType: "brand_purchase",
      title: "Klook Travel",
      unit: "purchase",
    });
  });

  it("falls back offer_name_display -> offer_name and logo_circle -> logo", () => {
    const rows = mapPublicBrandTasks(extraPointPayload);

    expect(rows[1]).toMatchObject({
      title: "Traveloka TH",
      logoUri: "https://cdn.example/traveloka.png",
      href: "/shop/offer-traveloka",
    });
  });

  it("prefers localized quest task wording for the title when present", () => {
    expect(mapPublicBrandTasks(extraPointPayload)[2].title).toBe(
      "Shop Shopee flash deals",
    );
    expect(mapPublicBrandTasks(extraPointPayload, "th")[2].title).toBe(
      "ช้อป Shopee ดีลเด็ด",
    );
  });

  it("omits logoUri when no logo field resolves, keeping the glyph fallback", () => {
    const [row] = mapPublicBrandTasks([
      { _id: "offer-plain", offer_name: "Plain Brand", extra_point: 50 },
    ]);

    expect(row).not.toHaveProperty("logoUri");
    expect(row.title).toBe("Plain Brand");
    expect(row.points).toBe("+50 Points");
  });

  it("is null-safe: non-array payloads and malformed rows yield an empty list", () => {
    expect(mapPublicBrandTasks(null)).toEqual([]);
    expect(mapPublicBrandTasks({})).toEqual([]);
    expect(mapPublicBrandTasks([{ offer_name: "No id" }, {}, 3, null])).toEqual(
      [],
    );
  });

  it("accepts a { data: [...] } envelope", () => {
    expect(mapPublicBrandTasks({ data: extraPointPayload })).toHaveLength(3);
  });

  it("ships the hardcoded prod parity row (Shop 300 Baht+, +50, links to /shop)", () => {
    expect(HARDCODED_SHOP_300_TASK).toMatchObject({
      href: "/shop",
      key: "extra-point:shop-300",
      points: "+50 Points",
      taskType: "brand_purchase",
      title: "Shop 300 Baht+ on any shops",
    });
  });
});
