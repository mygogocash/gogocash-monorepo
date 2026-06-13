import { describe, expect, it } from "vitest";
import { isMyOfferList } from "../api/offersTypes";
import { mapMyOffersToRows } from "../api/offersMapper";

// POST /offer/my-offers returns bare lean Deeplink docs joined with offer_name.
const liveDeeplink = {
  _id: "684a40ffddc06da72b9852bb",
  createdAt: "2026-03-28T07:00:00.000Z",
  deeplink: "https://invol.co/aff_m?offer_id=1024&url=...",
  merchant_id: 2048,
  offer_id: 1024,
  offer_name: "Agoda Summer Cashback",
  user_id: "owner-id",
};

describe("isMyOfferList", () => {
  it("given a bare array (or empty) > then narrows", () => {
    expect(isMyOfferList([liveDeeplink])).toBe(true);
    expect(isMyOfferList([])).toBe(true);
  });

  it("given an envelope or null > then rejects", () => {
    expect(isMyOfferList({ data: [] })).toBe(false);
    expect(isMyOfferList(null)).toBe(false);
  });
});

describe("mapMyOffersToRows", () => {
  it("given lean deeplink docs > then maps to the screen row shape", () => {
    expect(mapMyOffersToRows([liveDeeplink])).toEqual([
      {
        createdAt: "28 Mar 2026",
        deeplink: "https://invol.co/aff_m?offer_id=1024&url=...",
        id: "684a40ffddc06da72b9852bb",
        offer_id: "1024",
        offer_name: "Agoda Summer Cashback",
      },
    ]);
  });

  it("given missing optional fields > then renders safe blanks rather than dropping the row", () => {
    const rows = mapMyOffersToRows([{ _id: "x1", deeplink: "https://gogoca.sh/d" }]);

    expect(rows[0]).toEqual({
      createdAt: "",
      deeplink: "https://gogoca.sh/d",
      id: "x1",
      offer_id: "",
      offer_name: "",
    });
  });
});
