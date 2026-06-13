import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPartnerCountLine,
  fillTemplate,
  filterPartnerBrands,
} from "./partner-search";

const PARTNERS = [
  { id: "1", name: "Shopee", category: "Marketplace", logoUrl: null },
  { id: "2", name: "Agoda", category: "Travel", logoUrl: null },
  { id: "3", name: "Lazada", category: "Marketplace", logoUrl: null },
] as const;

describe("partner-search", () => {
  it("fills simple count templates", () => {
    assert.equal(fillTemplate("{count} brands", { count: 3 }), "3 brands");
  });

  it("filters by partner name and category case-insensitively", () => {
    assert.deepEqual(
      filterPartnerBrands([...PARTNERS], "travel").map((partner) => partner.id),
      ["2"],
    );
    assert.deepEqual(
      filterPartnerBrands([...PARTNERS], "shop").map((partner) => partner.id),
      ["1"],
    );
  });

  it("returns the original list when the query is blank", () => {
    assert.equal(filterPartnerBrands([...PARTNERS], "   ").length, 3);
  });

  it("builds the unfiltered count line", () => {
    assert.equal(
      buildPartnerCountLine({
        query: "",
        total: 70,
        filteredCount: 70,
        brandsCountAll: "{count} brands",
        brandsCountFiltered: "{filtered} of {total} brands",
      }),
      "70 brands",
    );
  });

  it("builds the filtered count line", () => {
    assert.equal(
      buildPartnerCountLine({
        query: "travel",
        total: 70,
        filteredCount: 4,
        brandsCountAll: "{count} brands",
        brandsCountFiltered: "{filtered} of {total} brands",
      }),
      "4 of 70 brands",
    );
  });

  it("treats whitespace-only query as unfiltered count line", () => {
    assert.equal(
      buildPartnerCountLine({
        query: " \t\n ",
        total: 12,
        filteredCount: 3,
        brandsCountAll: "{count} brands",
        brandsCountFiltered: "{filtered} of {total} brands",
      }),
      "12 brands",
    );
  });
});
