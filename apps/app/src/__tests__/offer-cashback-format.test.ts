import { describe, expect, it } from "vitest";

import {
  formatCatalogCashback,
  formatMerchantCashback,
  highestProductTypeCashback,
} from "@mobile/api/offerCashbackFormat";

describe("offerCashbackFormat", () => {
  const rows = [
    { name: "Fashion", pay_in: "cashback", commission_info: "3.5" },
    { name: "Beauty", pay_in: "cashback", commission_info: "7" },
    { name: "Heading", is_tagline: true, commission_info: "99" },
  ];

  it("highestProductTypeCashback > skips taglines and cash rows", () => {
    expect(
      highestProductTypeCashback([
        ...rows,
        { name: "Gift", pay_in: "cash", commission_info: "50" },
      ]),
    ).toBe("7%");
  });

  it("formatCatalogCashback > given missing commission_store > then uses product rows", () => {
    expect(formatCatalogCashback({ product_type: rows })).toBe("7%");
  });

  // #428 review — admin defaults missing commission to 0 on update, so failed
  // saves often look like commission_store: 0 + product_type rows.
  it("formatCatalogCashback > given commission_store 0 with product rows > then uses product rows", () => {
    expect(
      formatCatalogCashback({ commission_store: 0, product_type: rows }),
    ).toBe("7%");
    expect(
      formatCatalogCashback({ commission_store: "0%", product_type: rows }),
    ).toBe("7%");
  });

  it("formatCatalogCashback > given genuine 0 with no rows > then returns 0%", () => {
    expect(formatCatalogCashback({ commission_store: 0 })).toBe("0%");
  });

  it("formatCatalogCashback > given a non-zero store > then prefers the store", () => {
    expect(
      formatCatalogCashback({ commission_store: 5.5, product_type: rows }),
    ).toBe("5.5%");
  });

  it("formatMerchantCashback > given store 0 + rows > then uses product rows", () => {
    expect(
      formatMerchantCashback({
        commission_store: 0,
        commissions: [],
        product_type: rows,
      }),
    ).toBe("7%");
  });

  it("formatMerchantCashback > given partner Commission string > then uses it when store is empty", () => {
    expect(
      formatMerchantCashback({
        commissions: [{ Commission: "4.2%" }],
      }),
    ).toBe("4.2%");
  });
});
