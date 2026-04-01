import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import { missingOrdersStaticT } from "./missingOrdersStaticT";

describe("missingOrdersStaticT", () => {
  it("returns en copy for en and jp locales", () => {
    const v = (en as unknown as Record<string, string>).missingOrdersSectionPurchaseHelp;
    expect(missingOrdersStaticT("en", "missingOrdersSectionPurchaseHelp")).toBe(v);
    expect(missingOrdersStaticT("jp", "missingOrdersSectionPurchaseHelp")).toBe(v);
  });

  it("returns th copy for th locale", () => {
    expect(missingOrdersStaticT("th", "missingOrdersSectionPurchaseTitle")).toBe(
      "รายละเอียดการซื้อ"
    );
  });

  it("returns jp copy for profileUserIdLabel then falls back to en for keys missing in jp", () => {
    expect(missingOrdersStaticT("jp", "profileUserIdLabel")).toBe("ユーザーID");
    expect(missingOrdersStaticT("jp", "missingOrdersAmountHelper")).toBe(
      (en as unknown as Record<string, string>).missingOrdersAmountHelper
    );
  });

  it("returns key when unknown", () => {
    expect(missingOrdersStaticT("en", "notARealMissingOrdersKey")).toBe("notARealMissingOrdersKey");
  });
});
