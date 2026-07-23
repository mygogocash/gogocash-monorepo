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

  it("saveTrackingPeriodEdit always appends flow_type and both subtitles (empty string = clear to default)", () => {
    const handler = formSource.slice(
      formSource.indexOf("const saveTrackingPeriodEdit"),
      formSource.indexOf("const saveTrackingPeriodEdit") + 3000,
    );
    expect(handler).toContain('fd.append("flow_type", form.flow_type)');
    expect(handler).toContain(
      'fd.append("tracking_subtitle", form.tracking_subtitle ?? "")',
    );
    expect(handler).toContain(
      'fd.append("confirm_subtitle", form.confirm_subtitle ?? "")',
    );
  });

  it("edit mode offers a two-step flow Switch above the day inputs", () => {
    expect(formSource).toContain(
      'label="Combined 2-step flow (Tracking and confirm)"',
    );
    expect(formSource).toContain('form.flow_type === "two_step"');
  });

  it("edit mode has subtitle inputs whose placeholders are the default captions", () => {
    expect(formSource).toContain('placeholder="from the following month"');
    expect(formSource).toContain('placeholder="after validation"');
  });

  it("read mode collapses to a combined Tracking and confirm cell when two_step", () => {
    expect(formSource).toContain("Tracking and confirm");
  });
});
