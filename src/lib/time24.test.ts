import { describe, it, expect } from "vitest";
import {
  formatTime24Input,
  clampHour,
  clampMinute,
  splitHHMM,
  joinHHMM,
  padTimePart,
} from "@/lib/time24";

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

describe("clampHour", () => {
  it("keeps valid hours and strips non-digits", () => {
    expect(clampHour("9")).toBe("9");
    expect(clampHour("14")).toBe("14");
    expect(clampHour("a1b")).toBe("1");
    expect(clampHour("")).toBe("");
  });

  it("caps at two digits and clamps to 23", () => {
    expect(clampHour("130")).toBe("13");
    expect(clampHour("25")).toBe("23");
    expect(clampHour("99")).toBe("23");
  });
});

describe("clampMinute", () => {
  it("keeps valid minutes and strips non-digits", () => {
    expect(clampMinute("5")).toBe("5");
    expect(clampMinute("30")).toBe("30");
    expect(clampMinute("")).toBe("");
  });

  it("caps at two digits and clamps to 59", () => {
    expect(clampMinute("305")).toBe("30");
    expect(clampMinute("60")).toBe("59");
    expect(clampMinute("99")).toBe("59");
  });
});

describe("splitHHMM", () => {
  it("splits HH:MM into parts", () => {
    expect(splitHHMM("09:30")).toEqual({ hh: "09", mm: "30" });
    expect(splitHHMM("9")).toEqual({ hh: "9", mm: "" });
    expect(splitHHMM("09:")).toEqual({ hh: "09", mm: "" });
    expect(splitHHMM(":30")).toEqual({ hh: "", mm: "30" });
    expect(splitHHMM("")).toEqual({ hh: "", mm: "" });
  });
});

describe("joinHHMM", () => {
  it("joins parts, empty when both blank", () => {
    expect(joinHHMM("09", "30")).toBe("09:30");
    expect(joinHHMM("9", "")).toBe("9:");
    expect(joinHHMM("", "30")).toBe(":30");
    expect(joinHHMM("", "")).toBe("");
  });
});

describe("padTimePart", () => {
  it("left-pads a non-empty part to two digits", () => {
    expect(padTimePart("9")).toBe("09");
    expect(padTimePart("09")).toBe("09");
    expect(padTimePart("")).toBe("");
  });
});
