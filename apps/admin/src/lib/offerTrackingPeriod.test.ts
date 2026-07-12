import { describe, expect, it } from "vitest";

import {
  formatTrackingDays,
  resolveTrackingPeriodPreview,
} from "./offerTrackingPeriod";

describe("offer tracking period (admin preview)", () => {
  it("resolveTrackingPeriodPreview > given auto mode with validation_terms > then preview mirrors the API resolver (partner value + tracking 30)", () => {
    expect(
      resolveTrackingPeriodPreview({
        tracking_period_mode: "auto",
        validation_terms: 60,
      }),
    ).toEqual({ tracking_days: 30, confirm_days: 60, source: "partner" });
  });

  it("resolveTrackingPeriodPreview > given manual mode > then preview shows stored day counts", () => {
    expect(
      resolveTrackingPeriodPreview({
        tracking_period_mode: "manual",
        tracking_days: 7,
        confirm_days: 45,
        validation_terms: 60,
      }),
    ).toEqual({ tracking_days: 7, confirm_days: 45, source: "manual" });
  });

  it("resolveTrackingPeriodPreview > given no partner terms in auto mode (0/missing) > then 30/30 defaults match the API constants", () => {
    for (const validation_terms of [0, undefined]) {
      expect(resolveTrackingPeriodPreview({ validation_terms })).toEqual({
        tracking_days: 30,
        confirm_days: 30,
        source: "default",
      });
    }
  });

  it("formatTrackingDays > mirrors the customer copy exactly", () => {
    // "within 30 day" is the web-parity string the app renders — the admin
    // preview must read identically.
    expect(formatTrackingDays(30)).toBe("within 30 day");
    expect(formatTrackingDays(7)).toBe("within 7 day");
  });
});
