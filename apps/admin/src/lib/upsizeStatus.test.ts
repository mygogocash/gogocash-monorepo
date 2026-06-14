import { describe, it, expect } from "vitest";
import { isUpsizeActiveNow } from "@/lib/upsizeStatus";

// Fixed "now": 2026-06-09 12:00 local.
const NOW = Date.parse("2026-06-09T12:00:00");

describe("isUpsizeActiveNow", () => {
  it("given no upsize configured > returns false", () => {
    expect(isUpsizeActiveNow({}, NOW)).toBe(false);
  });

  it("given upsize configured without a window > returns true (open-ended)", () => {
    expect(isUpsizeActiveNow({ upsize_special_commission: 12 }, NOW)).toBe(
      true,
    );
    expect(
      isUpsizeActiveNow({ upsize_product_types: [{ name: "x" }] }, NOW),
    ).toBe(true);
  });

  it("given now within the start/end window > returns true", () => {
    expect(
      isUpsizeActiveNow(
        { upsize_start_date: "2026-06-01", upsize_end_date: "2026-06-30" },
        NOW,
      ),
    ).toBe(true);
  });

  it("given now before the start date > returns false", () => {
    expect(
      isUpsizeActiveNow(
        { upsize_start_date: "2026-07-01", upsize_end_date: "2026-07-31" },
        NOW,
      ),
    ).toBe(false);
  });

  it("given now after the end date > returns false", () => {
    expect(
      isUpsizeActiveNow(
        { upsize_start_date: "2026-05-01", upsize_end_date: "2026-05-31" },
        NOW,
      ),
    ).toBe(false);
  });

  it("given only a past start date (no end) > returns true", () => {
    expect(isUpsizeActiveNow({ upsize_start_date: "2026-06-01" }, NOW)).toBe(
      true,
    );
  });

  it("given an end date of today with no end time > stays active through end of day", () => {
    expect(
      isUpsizeActiveNow(
        { upsize_start_date: "2026-06-01", upsize_end_date: "2026-06-09" },
        NOW,
      ),
    ).toBe(true);
  });

  it("respects the start time on the start day (starts at 14:00, now is 12:00)", () => {
    expect(
      isUpsizeActiveNow(
        {
          upsize_start_date: "2026-06-09",
          upsize_start_time: "14:00",
          upsize_end_date: "2026-06-30",
        },
        NOW,
      ),
    ).toBe(false);
  });
});
