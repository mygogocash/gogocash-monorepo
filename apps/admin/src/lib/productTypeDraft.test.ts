import { describe, it, expect } from "vitest";
import {
  EMPTY_PRODUCT_TYPE_DRAFT,
  highestCashbackPercent,
  productTypeDraftToEntry,
  productTypeEntryToDraft,
  serializeOfferProductTypes,
  type ProductTypeDraft,
} from "@/lib/productTypeDraft";
import {
  normalizeOfferProductTypes,
  type OfferProductTypeEntry,
} from "@/types/api";

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

describe("productTypeDraftToEntry / productTypeEntryToDraft > explicit fee percent", () => {
  it("nets the cashback draft with the given Fee Structure rate instead of 30", () => {
    const entry = productTypeDraftToEntry(
      draft({ name: "Electronics", pay_in: "cashback", commission_raw: "10" }),
      20,
    );
    expect(entry.commission_info).toBe("8");
    expect(entry.commission_raw).toBe("10");
  });

  it("derives the raw from the saved net at the given fee when commission_raw is missing", () => {
    const d = productTypeEntryToDraft(
      { name: "X", pay_in: "cashback", commission_info: "8" },
      20,
    );
    expect(d.commission_raw).toBe("10");
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
      productTypeDraftToEntry(
        draft({ name: "X", pay_in: "cash", amount: "-50" }),
      ).amount,
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

describe("product description carries through the draft lifecycle", () => {
  it("productTypeDraftToEntry trims and stores the description (cashback)", () => {
    const entry = productTypeDraftToEntry(
      draft({
        name: "Electronics",
        pay_in: "cashback",
        commission_raw: "10",
        description: "  Phones & laptops  ",
      }),
    );
    expect(entry.description).toBe("Phones & laptops");
  });

  it("productTypeDraftToEntry trims and stores the description (cash)", () => {
    const entry = productTypeDraftToEntry(
      draft({
        name: "Gift card",
        pay_in: "cash",
        amount: "50",
        currency: "USD",
        description: "  One-time payout  ",
      }),
    );
    expect(entry.description).toBe("One-time payout");
  });

  it("productTypeEntryToDraft populates the description from the entry", () => {
    const d = productTypeEntryToDraft({
      name: "X",
      pay_in: "cashback",
      commission_info: "7",
      description: "Fast charging",
    });
    expect(d.description).toBe("Fast charging");
  });

  it("productTypeEntryToDraft defaults a missing description to an empty string", () => {
    const d = productTypeEntryToDraft({ name: "X", commission_info: "" });
    expect(d.description).toBe("");
  });

  it("carries the description through entry → draft → entry", () => {
    const entry: OfferProductTypeEntry = {
      name: "X",
      pay_in: "cashback",
      commission_info: "7",
      commission_raw: "10",
      description: "Detail line",
    };
    const back = productTypeDraftToEntry(productTypeEntryToDraft(entry));
    expect(back.description).toBe("Detail line");
  });

  it("carries the description through the full reload pipeline (normalize → entry → draft → entry)", () => {
    const [entry] = normalizeOfferProductTypes([
      { name: "X", commission_info: "7", description: "  Detail line  " },
    ]);
    const back = productTypeDraftToEntry(productTypeEntryToDraft(entry));
    expect(back.description).toBe("Detail line");
  });
});

describe("serializeOfferProductTypes", () => {
  it("trims string fields and keeps every save field (incl. description + deeplink)", () => {
    const [row] = serializeOfferProductTypes([
      {
        name: "  Electronics  ",
        pay_in: "cashback",
        commission_info: " 7 ",
        amount: null,
        currency: " THB ",
        deeplink: "  https://go/x  ",
        description: "  Phones  ",
      },
    ]);
    expect(row).toEqual({
      name: "Electronics",
      pay_in: "cashback",
      commission_info: "7",
      amount: null,
      currency: "THB",
      deeplink: "https://go/x",
      description: "Phones",
    });
  });

  it("drops rows whose name is blank after trimming", () => {
    const rows = serializeOfferProductTypes([
      { name: "Keep", commission_info: "7" },
      { name: "   ", commission_info: "5" },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Keep"]);
  });

  it("defaults pay_in to cashback, amount to null, and missing strings to empty", () => {
    const [row] = serializeOfferProductTypes([
      { name: "X", commission_info: "" },
    ]);
    expect(row.pay_in).toBe("cashback");
    expect(row.amount).toBeNull();
    expect(row.currency).toBe("");
    expect(row.deeplink).toBe("");
    expect(row.description).toBe("");
  });

  it("preserves is_tagline:true for heading rows and trims their name", () => {
    const [row] = serializeOfferProductTypes([
      { name: "  Group A  ", is_tagline: true, commission_info: "" },
    ]);
    expect(row.is_tagline).toBe(true);
    expect(row.name).toBe("Group A");
  });

  it("does not add is_tagline to normal product rows", () => {
    const [row] = serializeOfferProductTypes([
      { name: "Electronics", commission_info: "7" },
    ]);
    expect(row.is_tagline).toBeUndefined();
  });
});

describe("highestCashbackPercent", () => {
  it("returns the max commission_info among cashback rows", () => {
    expect(
      highestCashbackPercent([
        { name: "A", commission_info: "0.7" },
        { name: "B", commission_info: "1.4" },
        { name: "C", commission_info: "2.1" },
      ]),
    ).toBe(2.1);
  });

  it("ignores tagline (heading) rows even if they carry a number", () => {
    expect(
      highestCashbackPercent([
        { name: "Group", commission_info: "99", is_tagline: true },
        { name: "A", commission_info: "0.7" },
      ]),
    ).toBe(0.7);
  });

  it("ignores cash pay-in rows (they have no %)", () => {
    expect(
      highestCashbackPercent([
        { name: "A", pay_in: "cash", amount: 50, commission_info: "" },
        { name: "B", commission_info: "1.4" },
      ]),
    ).toBe(1.4);
  });

  it("ignores blank / non-numeric commission_info", () => {
    expect(
      highestCashbackPercent([
        { name: "A", commission_info: "" },
        { name: "B", commission_info: "abc" },
        { name: "C", commission_info: "3" },
      ]),
    ).toBe(3);
  });

  it("returns null when there are no cashback rows", () => {
    expect(highestCashbackPercent([])).toBeNull();
    expect(
      highestCashbackPercent([
        { name: "Group", commission_info: "", is_tagline: true },
      ]),
    ).toBeNull();
  });
});
