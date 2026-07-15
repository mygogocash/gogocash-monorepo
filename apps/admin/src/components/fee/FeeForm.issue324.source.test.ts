import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "FeeForm.tsx"),
  "utf8",
);

describe("FeeForm issue #324 structure", () => {
  it("separates cashback and withdrawal management into the requested hierarchy", () => {
    const cashback = source.indexOf("Cashback transaction fee management");
    const cashbackDefault = source.indexOf("Default setup for all brands");
    const cashbackCountries = source.indexOf("Cashback setup for each country");
    const countryCap = source.indexOf(
      "<CashbackMaxCapFields",
      cashbackCountries,
    );
    const withdrawal = source.indexOf("Withdrawal fee management");
    const withdrawalDefault = source.indexOf("Default setup for global");
    const withdrawalCountries = source.indexOf(
      "Withdrawal setup for each country",
    );

    expect(cashback).toBeGreaterThan(-1);
    expect(cashbackDefault).toBeGreaterThan(cashback);
    expect(cashbackCountries).toBeGreaterThan(cashbackDefault);
    expect(countryCap).toBeGreaterThan(cashbackCountries);
    expect(withdrawal).toBeGreaterThan(countryCap);
    expect(withdrawalDefault).toBeGreaterThan(withdrawal);
    expect(withdrawalCountries).toBeGreaterThan(withdrawalDefault);
  });

  it("does not render cashback max-cap controls inside withdrawal management", () => {
    const withdrawalSection = source.slice(
      source.indexOf("Withdrawal fee management"),
    );
    expect(withdrawalSection).not.toContain("Max cap (offers / brands)");
    expect(withdrawalSection).not.toContain(
      "Cashback max cap for this country",
    );
  });

  it("persists explicit global withdrawal defaults", () => {
    expect(source).toContain("global_withdraw_fee");
    expect(source).toContain("global_minimum_withdraw");
    expect(source).toContain("global_withdraw_currency");
  });

  it("surfaces real load and save API messages", () => {
    expect(source).toContain(
      'getApiErrorMessage(err, "Failed to load fee settings")',
    );
    expect(source).toContain(
      'getApiErrorMessage(saveErr, "Failed to save fee settings")',
    );
  });
});
