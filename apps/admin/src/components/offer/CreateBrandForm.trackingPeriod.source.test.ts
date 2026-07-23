import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const formSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "CreateBrandForm.tsx"),
  "utf8",
);

describe("CreateBrandForm — Cashback tracking period section", () => {
  it("renders a create-brand-section-tracking-period section", () => {
    expect(formSource).toContain('id="create-brand-section-tracking-period"');
  });

  it("the section nav has a Cashback tracking period jump link after Policy", () => {
    expect(formSource).toContain(
      '{ id: "create-brand-section-tracking-period", label: "Cashback tracking period" }',
    );
    const policyIdx = formSource.indexOf(
      '{ id: "create-brand-section-policy", label: "Policy" }',
    );
    const trackingIdx = formSource.indexOf(
      '{ id: "create-brand-section-tracking-period", label: "Cashback tracking period" }',
    );
    const mediaIdx = formSource.indexOf(
      '{ id: "create-brand-section-media", label: "Media" }',
    );
    expect(policyIdx).toBeGreaterThanOrEqual(0);
    expect(trackingIdx).toBeGreaterThan(policyIdx);
    expect(mediaIdx).toBeGreaterThan(trackingIdx);
  });

  it("submit FormData appends tracking_period_mode always and day counts only in manual mode", () => {
    const handler = formSource.slice(
      formSource.indexOf("const handleSubmit"),
      formSource.indexOf("const handleSubmit") + 5500,
    );
    expect(handler).toContain('formData.append("tracking_period_mode"');
    expect(handler).toMatch(
      /=== "manual"[\s\S]*?formData\.append\("tracking_days"[\s\S]*?formData\.append\("confirm_days"/,
    );
  });

  it("submit FormData always appends flow_type and both subtitles", () => {
    const handler = formSource.slice(
      formSource.indexOf("const handleSubmit"),
      formSource.indexOf("const handleSubmit") + 5500,
    );
    expect(handler).toContain('formData.append("flow_type"');
    expect(handler).toContain(
      'formData.append("tracking_subtitle", trackingSubtitle ?? "")',
    );
    expect(handler).toContain(
      'formData.append("confirm_subtitle", confirmSubtitle ?? "")',
    );
  });

  it("offers a two-step flow Switch above the day inputs", () => {
    expect(formSource).toContain(
      'label="Combined 2-step flow (Tracking and confirm)"',
    );
    expect(formSource).toContain('flowType === "two_step"');
  });

  it("has subtitle inputs whose placeholders are the default captions", () => {
    expect(formSource).toContain('placeholder="from the following month"');
    expect(formSource).toContain('placeholder="after validation"');
  });

  it("previews the resolved steps via the shared preview resolver", () => {
    expect(formSource).toContain("resolveTrackingPeriodPreview");
    expect(formSource).toContain("formatTrackingDays");
  });
});
