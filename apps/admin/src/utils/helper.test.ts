import { describe, it, expect } from "vitest";
import { formatPrice, pathImage } from "@/utils/helper";

describe("formatPrice", () => {
  it("formats a positive amount with 2 decimals", () => {
    expect(formatPrice(1234.5)).toBe("1,234.50");
  });

  it("formats zero as 0.00 (a real value, not N/A)", () => {
    expect(formatPrice(0)).toBe("0.00");
  });

  it("returns N/A for undefined", () => {
    expect(formatPrice(undefined)).toBe("N/A");
  });

  it("returns N/A for NaN", () => {
    expect(formatPrice(Number("abc"))).toBe("N/A");
  });
});

describe("pathImage", () => {
  it("given a Google Drive file id > then returns a viewable URL", () => {
    expect(pathImage("1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh")).toBe(
      "https://drive.google.com/uc?export=view&id=1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh",
    );
  });

  it("given an https URL > then returns it unchanged", () => {
    expect(pathImage("https://cdn.example/banner.png")).toBe(
      "https://cdn.example/banner.png",
    );
  });
});
