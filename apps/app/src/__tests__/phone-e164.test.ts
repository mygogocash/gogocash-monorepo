import { describe, expect, it } from "vitest";
import { toPhoneE164 } from "../auth/phoneE164";

describe("toPhoneE164", () => {
  it("given Thai local number with leading 0 > strips it", () => {
    expect(toPhoneE164("+66", "0812346789")).toBe("+66812346789");
  });

  it("given local digits without leading 0 > passes through", () => {
    expect(toPhoneE164("+66", "812346789")).toBe("+66812346789");
  });

  it("normalizes the reported 063 and 63 forms to the same Thai E.164 number", () => {
    expect(toPhoneE164("+66", "0631234567")).toBe("+66631234567");
    expect(toPhoneE164("+66", "631234567")).toBe("+66631234567");
  });

  it("given multiple leading zeros > strips only one", () => {
    expect(toPhoneE164("+66", "00812346789")).toBe("+660812346789");
  });
});
