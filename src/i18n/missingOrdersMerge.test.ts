import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import { mergeMissingOrdersMessages } from "./missingOrdersMerge";

describe("mergeMissingOrdersMessages", () => {
  it("fills missing missingOrders* keys from en catalog", () => {
    const out = mergeMissingOrdersMessages({}, "en");
    expect(out.missingOrdersPageIntroSelfService).toBe(
      (en as Record<string, string>).missingOrdersPageIntroSelfService
    );
    expect(out.missingOrdersPageTitle).toBe("Missing Orders");
  });

  it("does not overwrite existing keys", () => {
    const out = mergeMissingOrdersMessages(
      { missingOrdersPageIntroSelfService: "Custom intro" },
      "en"
    );
    expect(out.missingOrdersPageIntroSelfService).toBe("Custom intro");
  });
});
