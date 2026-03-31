import { describe, expect, it } from "vitest";
import { countryCodeToFlagEmoji } from "./flagEmoji";

describe("countryCodeToFlagEmoji", () => {
  it("maps ISO alpha-2 to regional indicator pair", () => {
    expect(countryCodeToFlagEmoji("TH")).toBe("🇹🇭");
    expect(countryCodeToFlagEmoji("us")).toBe("🇺🇸");
  });

  it("returns empty for invalid input", () => {
    expect(countryCodeToFlagEmoji("")).toBe("");
    expect(countryCodeToFlagEmoji("T")).toBe("");
    expect(countryCodeToFlagEmoji("THA")).toBe("");
    expect(countryCodeToFlagEmoji("12")).toBe("");
  });
});
