import { describe, expect, it } from "vitest";
import type { ResponseFee } from "@/types/api";
import {
  deriveLegacyWithdrawFields,
  ensureRegionIds,
  legacyRegionsFromResponse,
  normalizeRegionsForSave,
  validateWithdrawRegions,
} from "@/lib/feeWithdrawRegions";

function mockResponseFee(overrides: Partial<ResponseFee> = {}): ResponseFee {
  return {
    _id: "f1",
    system: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
    minimum_withdraw_thb: 100,
    minimum_withdraw_usd: 5,
    fee_withdraw_usd: 1,
    fee_withdraw_thb: 30,
    ...overrides,
  };
}

describe("legacyRegionsFromResponse", () => {
  it("builds TH and US rows from flat fee fields", () => {
    const regions = legacyRegionsFromResponse(mockResponseFee());
    expect(regions).toHaveLength(2);
    expect(regions[0]).toMatchObject({
      countryCode: "TH",
      currency: "THB",
      feeWithdraw: 30,
      minimumWithdraw: 100,
    });
    expect(regions[1]).toMatchObject({
      countryCode: "US",
      currency: "USD",
      feeWithdraw: 1,
      minimumWithdraw: 5,
    });
  });
});

describe("ensureRegionIds", () => {
  it("uses fallback when withdraw_regions empty", () => {
    const fallback = legacyRegionsFromResponse(mockResponseFee());
    const out = ensureRegionIds(undefined, fallback);
    expect(out[0].id).toMatch(/^legacy-/);
  });

  it("fills missing ids", () => {
    const out = ensureRegionIds(
      [
        {
          id: "",
          countryCode: "SG",
          currency: "SGD",
          feeWithdraw: 2,
          minimumWithdraw: 50,
        },
      ],
      [],
    );
    expect(out[0].id.length).toBeGreaterThan(0);
  });
});

describe("deriveLegacyWithdrawFields", () => {
  it("maps first THB and first USD rows", () => {
    const legacy = deriveLegacyWithdrawFields([
      {
        id: "a",
        countryCode: "SG",
        currency: "SGD",
        feeWithdraw: 9,
        minimumWithdraw: 99,
      },
      {
        id: "b",
        countryCode: "TH",
        currency: "THB",
        feeWithdraw: 30,
        minimumWithdraw: 100,
      },
      {
        id: "c",
        countryCode: "US",
        currency: "USD",
        feeWithdraw: 1,
        minimumWithdraw: 5,
      },
    ]);
    expect(legacy).toEqual({
      fee_withdraw_thb: 30,
      minimum_withdraw_thb: 100,
      fee_withdraw_usd: 1,
      minimum_withdraw_usd: 5,
    });
  });
});

describe("normalizeRegionsForSave", () => {
  it("uppercases country and currency", () => {
    const out = normalizeRegionsForSave([
      {
        id: "x",
        countryCode: " th ",
        currency: "thb",
        feeWithdraw: 1,
        minimumWithdraw: 2,
      },
    ]);
    expect(out[0].countryCode).toBe("TH");
    expect(out[0].currency).toBe("THB");
  });
});

describe("validateWithdrawRegions", () => {
  it("returns null for valid rows", () => {
    expect(
      validateWithdrawRegions([
        {
          id: "1",
          countryCode: "TH",
          currency: "THB",
          feeWithdraw: 1,
          minimumWithdraw: 2,
        },
      ]),
    ).toBeNull();
  });

  it("rejects bad country code", () => {
    expect(
      validateWithdrawRegions([
        {
          id: "1",
          countryCode: "T",
          currency: "THB",
          feeWithdraw: 1,
          minimumWithdraw: 2,
        },
      ]),
    ).toMatch(/2-letter/);
  });

  it("rejects duplicate country+currency", () => {
    const row = {
      id: "1",
      countryCode: "TH",
      currency: "THB",
      feeWithdraw: 1,
      minimumWithdraw: 2,
    };
    expect(
      validateWithdrawRegions([
        { ...row, id: "a" },
        { ...row, id: "b" },
      ]),
    ).toMatch(/Duplicate/);
  });
});
