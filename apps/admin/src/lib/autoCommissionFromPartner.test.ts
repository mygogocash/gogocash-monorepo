import { describe, expect, it } from "vitest";
import {
  bestPartnerRawFromCommissions,
  commissionFieldsFromPartnerRaw,
} from "./autoCommissionFromPartner";

describe("commissionFieldsFromPartnerRaw", () => {
  it("given positive raw percent > then returns raw string and net after 30% fee", () => {
    expect(commissionFieldsFromPartnerRaw(10)).toEqual({
      commissionRaw: "10",
      commission_store: 7,
    });
  });

  it("given zero or invalid raw > then returns null", () => {
    expect(commissionFieldsFromPartnerRaw(0)).toBeNull();
    expect(commissionFieldsFromPartnerRaw(NaN)).toBeNull();
  });
});

describe("bestPartnerRawFromCommissions", () => {
  it("given Involve commission rows > then returns highest percent", () => {
    expect(
      bestPartnerRawFromCommissions([
        { Commission: "2.80%" },
        { Commission: "6.50%" },
      ]),
    ).toBe(6.5);
  });
});
