import { describe, expect, it } from "vitest";
import { formatOtpCountdown, maskEmailForDisplay, phoneLocalDigitsFromInput } from "./utils";

describe("phoneLocalDigitsFromInput", () => {
  it("strips non-digits and caps length", () => {
    expect(phoneLocalDigitsFromInput("08-123-45678")).toBe("0812345678");
    expect(phoneLocalDigitsFromInput("01234567890")).toBe("0123456789");
  });
});

describe("formatOtpCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatOtpCountdown(0)).toBe("(00:00)");
    expect(formatOtpCountdown(60)).toBe("(01:00)");
    expect(formatOtpCountdown(65)).toBe("(01:05)");
  });
});

describe("maskEmailForDisplay", () => {
  it("masks local part", () => {
    expect(maskEmailForDisplay("user@example.com")).toBe("u***@example.com");
  });

  it("returns placeholder for invalid email", () => {
    expect(maskEmailForDisplay("not-an-email")).toBe("****");
    expect(maskEmailForDisplay("@nodomain")).toBe("****");
  });
});
