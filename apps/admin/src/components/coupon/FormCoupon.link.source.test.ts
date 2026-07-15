import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./FormCoupon.tsx", import.meta.url), "utf8");

describe("FormCoupon legacy URL removal", () => {
  it("does not render a link form field", () => {
    expect(source).not.toContain('filedName: "link"');
    expect(source).not.toContain('formItem.filedName === "link"');
  });

  it("keeps dates, discount, and coupon constraints in the form", () => {
    expect(source).toContain('{formItem.filedName === "name" ? (');
    expect(source).toContain("{validPeriodFields}");
    expect(source).toContain("{discountFields}");
    expect(source).toContain("{minSpendFields}");
    expect(source).toContain("{unlimitedAmountFields}");
  });
});
