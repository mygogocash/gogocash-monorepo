import { describe, it, expect } from "vitest";
import { formatTime24Input } from "@/lib/time24";

describe("formatTime24Input", () => {
  it("returns empty for empty / non-digit input", () => {
    expect(formatTime24Input("")).toBe("");
    expect(formatTime24Input("abc")).toBe("");
  });

  it("keeps hours-only while typing the first two digits", () => {
    expect(formatTime24Input("1")).toBe("1");
    expect(formatTime24Input("14")).toBe("14");
  });

  it("inserts the colon after two digits", () => {
    expect(formatTime24Input("143")).toBe("14:3");
    expect(formatTime24Input("1430")).toBe("14:30");
  });

  it("clamps hours to 23 and minutes to 59", () => {
    expect(formatTime24Input("25")).toBe("23");
    expect(formatTime24Input("1499")).toBe("14:59");
    expect(formatTime24Input("9999")).toBe("23:59");
  });

  it("strips non-digits and caps at four digits", () => {
    expect(formatTime24Input("ab12cd34")).toBe("12:34");
    expect(formatTime24Input("143099")).toBe("14:30");
  });

  it("is idempotent on an already-formatted value", () => {
    expect(formatTime24Input("14:30")).toBe("14:30");
    expect(formatTime24Input("00:00")).toBe("00:00");
  });
});
