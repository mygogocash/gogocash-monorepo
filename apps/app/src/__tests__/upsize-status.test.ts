import { describe, expect, it } from "vitest";
import { isUpsizeActiveNow } from "../api/upsizeStatus";

describe("isUpsizeActiveNow", () => {
  const base = {
    upsize_product_types: [{ name: "OPPO Find X9", commission_info: "3.5" }],
  };

  it("given no upsize fields > then inactive", () => {
    expect(isUpsizeActiveNow({}, Date.parse("2026-07-15T12:00:00"))).toBe(
      false,
    );
  });

  it("given open-ended upsize lines > then always active", () => {
    expect(
      isUpsizeActiveNow(base, Date.parse("2026-07-15T12:00:00")),
    ).toBe(true);
  });

  it("given future start date > then inactive", () => {
    expect(
      isUpsizeActiveNow(
        { ...base, upsize_start_date: "2026-08-01" },
        Date.parse("2026-07-15T12:00:00"),
      ),
    ).toBe(false);
  });

  it("given past end date > then inactive", () => {
    expect(
      isUpsizeActiveNow(
        { ...base, upsize_end_date: "2026-07-01" },
        Date.parse("2026-07-15T12:00:00"),
      ),
    ).toBe(false);
  });

  it("given now inside window > then active", () => {
    expect(
      isUpsizeActiveNow(
        {
          ...base,
          upsize_start_date: "2026-07-01",
          upsize_end_date: "2026-07-31",
        },
        Date.parse("2026-07-15T12:00:00"),
      ),
    ).toBe(true);
  });
});
