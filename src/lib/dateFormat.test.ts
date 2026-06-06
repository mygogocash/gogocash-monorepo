import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatTime,
} from "@/lib/dateFormat";

describe("formatDate", () => {
  it("given a yyyy-mm-dd string > then returns dd/mm/yyyy", () => {
    expect(formatDate("2026-06-04")).toBe("04/06/2026");
  });

  it("given a date-only string > then does not shift across timezones", () => {
    // A naive `new Date('2026-06-04')` is UTC midnight and can roll back a day
    // in negative-offset zones. The calendar date must be preserved verbatim.
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
    expect(formatDate("2026-12-31")).toBe("31/12/2026");
  });

  it("given a Date object > then formats its local calendar date", () => {
    expect(formatDate(new Date(2026, 5, 4))).toBe("04/06/2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDate("2026-03-09")).toBe("09/03/2026");
  });

  it("given null/undefined/empty > then returns the fallback", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
  });

  it("given an unparseable value > then returns the fallback", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("honours a custom fallback", () => {
    expect(formatDate(null, "")).toBe("");
  });
});

describe("formatMonthYear", () => {
  it("given a yyyy-mm-dd string > then returns mm/yyyy", () => {
    expect(formatMonthYear("2025-07-05")).toBe("07/2025");
  });

  it("pads a single-digit month", () => {
    expect(formatMonthYear("2026-03-09")).toBe("03/2026");
  });

  it("given a Date object > then formats its local month/year", () => {
    expect(formatMonthYear(new Date(2026, 5, 15))).toBe("06/2026");
  });

  it("given null/undefined/empty > then returns the fallback", () => {
    expect(formatMonthYear(null)).toBe("—");
    expect(formatMonthYear(undefined)).toBe("—");
    expect(formatMonthYear("")).toBe("—");
  });

  it("honours a custom fallback for unparseable input", () => {
    expect(formatMonthYear("not-a-date", "")).toBe("");
  });
});

describe("formatTime", () => {
  it("given a Date > then returns 24-hour HH:mm:ss", () => {
    expect(formatTime(new Date(2026, 5, 4, 9, 5, 7))).toBe("09:05:07");
  });

  it("given seconds:false > then returns HH:mm", () => {
    expect(formatTime(new Date(2026, 5, 4, 23, 0, 0), { seconds: false })).toBe(
      "23:00",
    );
  });

  it("given a date-only string (no time) > then returns the fallback", () => {
    expect(formatTime("2026-06-04")).toBe("");
  });
});

describe("formatDateTime", () => {
  it("given a Date > then returns dd/mm/yyyy HH:mm:ss (24h)", () => {
    expect(formatDateTime(new Date(2026, 5, 4, 9, 5, 7))).toBe(
      "04/06/2026 09:05:07",
    );
  });

  it("given seconds:false > then drops the seconds", () => {
    expect(
      formatDateTime(new Date(2026, 5, 4, 9, 5, 7), { seconds: false }),
    ).toBe("04/06/2026 09:05");
  });

  it("given a date-only string > then returns just the date (no time)", () => {
    expect(formatDateTime("2026-06-04")).toBe("04/06/2026");
  });

  it("given an invalid value > then returns the fallback", () => {
    expect(formatDateTime("nope")).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });
});
