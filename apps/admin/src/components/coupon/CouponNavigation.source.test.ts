import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const couponTable = readFileSync(
  new URL("./CouponTable.tsx", import.meta.url),
  "utf8",
);
const couponPage = readFileSync(
  new URL("../../app/(admin)/(others-pages)/coupon/page.tsx", import.meta.url),
  "utf8",
);
const historyPage = readFileSync(
  new URL(
    "../../app/(admin)/(others-pages)/coupon/history/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const sidebar = readFileSync(
  new URL("../../layout/AppSidebarContent.tsx", import.meta.url),
  "utf8",
);

describe("coupon history and per-coupon insight navigation", () => {
  it("makes the real coupon list the Coupon History landing page", () => {
    expect(couponPage).toContain('pageTitle="Coupon History"');
    expect(couponPage).toContain("<CouponTable />");
    expect(couponPage).not.toContain("CouponSubNav");
    expect(sidebar).toMatch(
      /name:\s*"Coupon History",\s*path:\s*"\/coupon"/,
    );
    expect(sidebar).not.toContain('path: "/coupon/history"');
  });

  it("offers per-row insight navigation and retires the global history page", () => {
    expect(couponTable).toContain("View insight");
    expect(couponTable).toContain("`/coupon/${list._id}/insight`");
    expect(couponTable).toMatch(
      /href={`\/coupon\/\$\{list\._id\}\/insight`}[\s\S]*?event\.stopPropagation\(\)/,
    );
    expect(historyPage).toContain('redirect("/coupon")');
  });
});
