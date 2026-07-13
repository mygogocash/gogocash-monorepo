import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "FormOffer.tsx"),
  "utf8",
);

describe("FormOffer — Cashback tracking period section", () => {
  it("renders an offer-section-tracking-period section with its own edit/save handlers", () => {
    expect(formSource).toContain('id="offer-section-tracking-period"');
    expect(formSource).toContain("beginEditTrackingPeriod");
    expect(formSource).toContain("cancelEditTrackingPeriod");
    expect(formSource).toContain("saveTrackingPeriodEdit");
  });

  it("saveTrackingPeriodEdit appends the mode always and day counts only in manual mode", () => {
    const handler = formSource.slice(
      formSource.indexOf("const saveTrackingPeriodEdit"),
      formSource.indexOf("const saveTrackingPeriodEdit") + 2200,
    );
    expect(handler).toContain('fd.append("tracking_period_mode"');
    // Day counts are guarded behind the manual branch so auto saves leave the
    // stored manual values untouched server-side.
    expect(handler).toMatch(
      /=== "manual"[\s\S]*?fd\.append\("tracking_days"[\s\S]*?fd\.append\("confirm_days"/,
    );
  });

  it("the section nav has a Cashback tracking period jump link", () => {
    expect(formSource).toContain(
      '{ id: "offer-section-tracking-period", label: "Cashback tracking period" }',
    );
  });

  it("read mode previews the resolved steps via the shared preview resolver", () => {
    expect(formSource).toContain("resolveTrackingPeriodPreview");
    expect(formSource).toContain("formatTrackingDays");
  });
});
