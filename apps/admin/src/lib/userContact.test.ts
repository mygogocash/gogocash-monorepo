import { describe, expect, it } from "vitest";
import { normalizeUserEmails, normalizeUserMobiles } from "@/lib/userContact";

describe("normalizeUserEmails", () => {
  it("returns empty for undefined", () => {
    expect(normalizeUserEmails(undefined)).toEqual([]);
  });

  it("prefers emails array", () => {
    expect(
      normalizeUserEmails({
        email: "legacy@x.com",
        emails: [" a@b.com ", "", "c@d.com"],
      }),
    ).toEqual(["a@b.com", "c@d.com"]);
  });

  it("falls back to single email", () => {
    expect(normalizeUserEmails({ email: " solo@x.com " })).toEqual([
      "solo@x.com",
    ]);
  });
});

describe("normalizeUserMobiles", () => {
  it("returns empty for undefined", () => {
    expect(normalizeUserMobiles(undefined)).toEqual([]);
  });

  it("prefers mobiles array", () => {
    expect(
      normalizeUserMobiles({
        mobile: "+111",
        mobiles: [" +66 ", "+77"],
      }),
    ).toEqual(["+66", "+77"]);
  });

  it("falls back to single mobile", () => {
    expect(normalizeUserMobiles({ mobile: " +999 " })).toEqual(["+999"]);
  });
});
