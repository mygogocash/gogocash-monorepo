import { describe, expect, it } from "vitest";
import {
  brandSectionSaveBlockedMessage,
  isBrandSectionDirty,
  type BrandSectionEditValues,
} from "./brandSectionEdit";
import { DEFAULT_OFFER_DISPLAY_TAGS } from "@/types/api";

const baseSnapshot: BrandSectionEditValues = {
  offer_name_display: "Shopee",
  lookup_value: "shopee_th",
  disabled: false,
  extra_store: true,
  offer_display_tags: { ...DEFAULT_OFFER_DISPLAY_TAGS },
  syncLookup: false,
};

describe("isBrandSectionDirty", () => {
  it("isBrandSectionDirty > given null snapshot > then false", () => {
    expect(isBrandSectionDirty(baseSnapshot, null)).toBe(false);
  });

  it("isBrandSectionDirty > given unchanged values > then false", () => {
    expect(isBrandSectionDirty(baseSnapshot, { ...baseSnapshot })).toBe(false);
  });

  it("isBrandSectionDirty > given trimmed display name change > then true", () => {
    expect(
      isBrandSectionDirty(
        { ...baseSnapshot, offer_name_display: " Shopee TH " },
        baseSnapshot,
      ),
    ).toBe(true);
  });

  it("isBrandSectionDirty > given top brands toggle change > then true", () => {
    expect(
      isBrandSectionDirty({ ...baseSnapshot, extra_store: false }, baseSnapshot),
    ).toBe(true);
  });
});

describe("brandSectionSaveBlockedMessage", () => {
  it("brandSectionSaveBlockedMessage > given blank display name > then validation message", () => {
    expect(brandSectionSaveBlockedMessage("   ")).toBe(
      "Enter a display name for this offer before saving.",
    );
  });

  it("brandSectionSaveBlockedMessage > given display name > then null", () => {
    expect(brandSectionSaveBlockedMessage("Shopee")).toBeNull();
  });
});
