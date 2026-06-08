import { describe, it, expect } from "vitest";
import {
  EMPTY_PRODUCT_TYPE_DRAFT,
  productTypeDraftToEntry,
  productTypeEntryToDraft,
  type ProductTypeDraft,
} from "@/lib/productTypeDraft";
import type { OfferProductTypeEntry } from "@/types/api";

const draft = (over: Partial<ProductTypeDraft> = {}): ProductTypeDraft => ({
  ...EMPTY_PRODUCT_TYPE_DRAFT,
  ...over,
});

describe("productTypeDraftToEntry > cashback draft", () => {
  it("trims the name and stores net (after −30% fee) plus the raw", () => {
    const entry = productTypeDraftToEntry(
      draft({
        name: "  Electronics  ",
        pay_in: "cashback",
        commission_raw: "10",
      }),
    );
    expect(entry.name).toBe("Electronics");
    expect(entry.pay_in).toBe("cashback");
    expect(entry.commission_info).toBe("7");
    expect(entry.commission_raw).toBe("10");
  });
});

describe("productTypeDraftToEntry > cash draft", () => {
  it("stores a numeric amount and currency, no commission", () => {
    const entry = productTypeDraftToEntry(
      draft({
        name: "Gift card",
        pay_in: "cash",
        amount: "50",
        currency: "USD",
      }),
    );
    expect(entry.pay_in).toBe("cash");
    expect(entry.commission_info).toBe("");
    expect(entry.amount).toBe(50);
    expect(entry.currency).toBe("USD");
  });

  it("coerces a blank amount to null", () => {
    const entry = productTypeDraftToEntry(
      draft({ name: "X", pay_in: "cash", amount: "" }),
    );
    expect(entry.amount).toBeNull();
  });

  it("coerces a non-numeric amount to null", () => {
    const entry = productTypeDraftToEntry(
      draft({ name: "X", pay_in: "cash", amount: "abc" }),
    );
    expect(entry.amount).toBeNull();
  });
});

describe("productTypeEntryToDraft > cash entry", () => {
  it("stringifies amount and keeps currency", () => {
    const entry: OfferProductTypeEntry = {
      name: "Gift card",
      pay_in: "cash",
      commission_info: "",
      amount: 50,
      currency: "USD",
    };
    const d = productTypeEntryToDraft(entry);
    expect(d.pay_in).toBe("cash");
    expect(d.amount).toBe("50");
    expect(d.currency).toBe("USD");
  });

  it("renders a null amount as an empty string", () => {
    const d = productTypeEntryToDraft({
      name: "X",
      pay_in: "cash",
      commission_info: "",
      amount: null,
    });
    expect(d.amount).toBe("");
  });
});

describe("productTypeEntryToDraft > cashback entry", () => {
  it("keeps an explicit commission_raw", () => {
    const d = productTypeEntryToDraft({
      name: "X",
      pay_in: "cashback",
      commission_info: "7",
      commission_raw: "10",
    });
    expect(d.commission_raw).toBe("10");
  });

  it("derives the raw from the saved net when commission_raw is missing", () => {
    const d = productTypeEntryToDraft({
      name: "X",
      pay_in: "cashback",
      commission_info: "7",
    });
    expect(d.commission_raw).toBe("10");
  });
});

describe("productTypeEntryToDraft > defaults", () => {
  it("defaults pay_in to cashback and currency to THB", () => {
    const d = productTypeEntryToDraft({ name: "X", commission_info: "" });
    expect(d.pay_in).toBe("cashback");
    expect(d.currency).toBe("THB");
  });
});

describe("Edit→Add round-trip preserves the per-row tracking link", () => {
  it("carries deeplink through entry → draft → entry (cashback)", () => {
    const entry: OfferProductTypeEntry = {
      name: "X",
      pay_in: "cashback",
      commission_info: "7",
      commission_raw: "10",
      deeplink: "https://go.example/x",
    };
    const back = productTypeDraftToEntry(productTypeEntryToDraft(entry));
    expect(back.deeplink).toBe("https://go.example/x");
  });

  it("carries deeplink through entry → draft → entry (cash)", () => {
    const entry: OfferProductTypeEntry = {
      name: "Gift card",
      pay_in: "cash",
      commission_info: "",
      amount: 50,
      currency: "USD",
      deeplink: "https://go.example/gc",
    };
    const back = productTypeDraftToEntry(productTypeEntryToDraft(entry));
    expect(back.deeplink).toBe("https://go.example/gc");
  });
});

describe("productTypeDraftToEntry > cash amount guards", () => {
  it("rejects a negative amount", () => {
    expect(
      productTypeDraftToEntry(draft({ name: "X", pay_in: "cash", amount: "-50" }))
        .amount,
    ).toBeNull();
  });

  it("rejects a non-finite amount", () => {
    expect(
      productTypeDraftToEntry(
        draft({ name: "X", pay_in: "cash", amount: "Infinity" }),
      ).amount,
    ).toBeNull();
  });
});
