import { describe, expect, it } from "vitest";
import { mapOffersToSearchPanelItems } from "../account/searchResource";

describe("mapOffersToSearchPanelItems", () => {
  it("given offer list payload > then maps catalog brands into search panel rows", () => {
    const items = mapOffersToSearchPanelItems({
      data: [
        {
          _id: "offer-1",
          offer_name: "Lazada TH",
          offer_name_display: "Lazada",
          commission_store: "5.5",
          categories: "Shopping",
        },
      ],
      limit: 20,
      page: 1,
      total: 1,
      totalPages: 1,
    });

    expect(items).toEqual([
      expect.objectContaining({
        brand: "Lazada",
        cashback: "5.5%",
        href: "/shop/offer-1",
      }),
    ]);
  });
});
