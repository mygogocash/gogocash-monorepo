import { describe, expect, it } from "vitest";

import type { Offer } from "./api";

describe("Offer admin contract", () => {
  it("includes the customer-facing brand fields managed by Brand Management", () => {
    const offer: Pick<
      Offer,
      | "_id"
      | "offer_name_display"
      | "offer_name"
      | "logo"
      | "commission_store"
      | "disabled"
      | "status"
      | "tracking_link"
      | "extra_store"
    > = {
      _id: "offer-1",
      offer_name_display: "Banana IT",
      offer_name: "Banana IT TH - CPS",
      logo: "/logo.png",
      commission_store: 12,
      disabled: false,
      status: "active",
      tracking_link: "https://partner.example/track",
      extra_store: true,
    };

    expect(offer).toMatchObject({
      _id: "offer-1",
      offer_name_display: "Banana IT",
      status: "active",
      tracking_link: "https://partner.example/track",
    });
  });
});
