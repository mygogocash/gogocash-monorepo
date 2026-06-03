import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOOTER_LINKS } from "./footer-links";

/**
 * Issue #9 — Careers and Business Inquiries both routed to the same LINE chat,
 * and the column was mislabelled "Products". The two links must reach distinct,
 * non-LINE destinations, and the column must be renamed to "Company".
 */
describe("footer links (#9)", () => {
  it("renames the Products column to Company", () => {
    assert.ok("Company" in FOOTER_LINKS, "expected a 'Company' column");
    assert.ok(!("Products" in FOOTER_LINKS), "'Products' column should be gone");
  });

  it("routes Careers and Business Inquiries to distinct destinations", () => {
    const company = FOOTER_LINKS.Company ?? [];
    const careers = company.find((l) => l.label === "Careers");
    const biz = company.find((l) => l.label === "Business Inquiries");
    assert.ok(careers, "Careers link missing");
    assert.ok(biz, "Business Inquiries link missing");
    assert.notEqual(
      careers.href,
      biz.href,
      "Careers and Business Inquiries must not share one URL",
    );
  });

  it("offers a non-LINE path for both Careers and Business Inquiries", () => {
    const company = FOOTER_LINKS.Company ?? [];
    for (const label of ["Careers", "Business Inquiries"]) {
      const link = company.find((l) => l.label === label);
      assert.ok(link, `${label} link missing`);
      assert.ok(
        !link.href.includes("lin.ee"),
        `${label} should not depend on LINE (${link.href})`,
      );
    }
  });
});
