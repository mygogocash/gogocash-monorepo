import { describe, expect, it } from "vitest";

import {
  formatTrackingDays,
  resolveTrackingPeriodPreview,
} from "./offerTrackingPeriod";

// Default flow/subtitle shape every legacy resolution must now carry.
const DEFAULT_FLOW_FIELDS = {
  flow_type: "three_step",
  tracking_subtitle: "from the following month",
  confirm_subtitle: "after validation",
} as const;

describe("offer tracking period (admin preview)", () => {
  it("resolveTrackingPeriodPreview > given auto mode with validation_terms > then preview mirrors the API resolver (partner value + tracking 30)", () => {
    expect(
      resolveTrackingPeriodPreview({
        tracking_period_mode: "auto",
        validation_terms: 60,
      }),
    ).toEqual({
      tracking_days: 30,
      confirm_days: 60,
      source: "partner",
      ...DEFAULT_FLOW_FIELDS,
    });
  });

  it("resolveTrackingPeriodPreview > given manual mode > then preview shows stored day counts", () => {
    expect(
      resolveTrackingPeriodPreview({
        tracking_period_mode: "manual",
        tracking_days: 7,
        confirm_days: 45,
        validation_terms: 60,
      }),
    ).toEqual({
      tracking_days: 7,
      confirm_days: 45,
      source: "manual",
      ...DEFAULT_FLOW_FIELDS,
    });
  });

  it("resolveTrackingPeriodPreview > given no partner terms in auto mode (0/missing) > then 30/30 defaults match the API constants", () => {
    for (const validation_terms of [0, undefined]) {
      expect(resolveTrackingPeriodPreview({ validation_terms })).toEqual({
        tracking_days: 30,
        confirm_days: 30,
        source: "default",
        ...DEFAULT_FLOW_FIELDS,
      });
    }
  });

  it("resolveTrackingPeriodPreview > given stripped validation_terms but a derived partner fallback > then the auto preview shows the partner window", () => {
    // The /brands/[id] route only has the public detail payload: raw
    // validation_terms is stripped, but the derived tracking_period survives.
    expect(
      resolveTrackingPeriodPreview(
        { tracking_period_mode: "auto", validation_terms: null },
        { tracking_days: 30, confirm_days: 60, source: "partner" },
      ),
    ).toEqual({
      tracking_days: 30,
      confirm_days: 60,
      source: "partner",
      ...DEFAULT_FLOW_FIELDS,
    });
    // A default-source fallback must NOT masquerade as partner data.
    expect(
      resolveTrackingPeriodPreview(
        { tracking_period_mode: "auto", validation_terms: null },
        { tracking_days: 30, confirm_days: 30, source: "default" },
      ),
    ).toEqual({
      tracking_days: 30,
      confirm_days: 30,
      source: "default",
      ...DEFAULT_FLOW_FIELDS,
    });
  });

  it("formatTrackingDays > mirrors the customer copy exactly", () => {
    // "within 30 day" is the web-parity string the app renders — the admin
    // preview must read identically.
    expect(formatTrackingDays(30)).toBe("within 30 day");
    expect(formatTrackingDays(7)).toBe("within 7 day");
  });

  it("resolveTrackingPeriodPreview > given no flow/subtitle fields > then defaults mirror the API resolver", () => {
    const preview = resolveTrackingPeriodPreview({ validation_terms: 60 });
    expect(preview.flow_type).toBe("three_step");
    expect(preview.tracking_subtitle).toBe("from the following month");
    expect(preview.confirm_subtitle).toBe("after validation");
  });

  it("resolveTrackingPeriodPreview > given a stored two_step flow with custom subtitles > then the preview carries them trimmed", () => {
    const preview = resolveTrackingPeriodPreview({
      tracking_period_mode: "manual",
      tracking_days: 7,
      confirm_days: 45,
      flow_type: "two_step",
      tracking_subtitle: " after the return window closes ",
      confirm_subtitle: "once the store approves",
    });
    expect(preview.flow_type).toBe("two_step");
    expect(preview.tracking_subtitle).toBe("after the return window closes");
    expect(preview.confirm_subtitle).toBe("once the store approves");
  });

  it("resolveTrackingPeriodPreview > given blank subtitles or an invalid flow_type > then defaults apply", () => {
    const preview = resolveTrackingPeriodPreview({
      flow_type: "weekly",
      tracking_subtitle: "   ",
      confirm_subtitle: "",
    });
    expect(preview.flow_type).toBe("three_step");
    expect(preview.tracking_subtitle).toBe("from the following month");
    expect(preview.confirm_subtitle).toBe("after validation");
  });
});
