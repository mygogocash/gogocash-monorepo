import en from "@/messages/en.json";
import { describe, expect, it } from "vitest";
import { getMissingOrdersSectionHeadings } from "./missingOrdersSectionHeadings";

describe("getMissingOrdersSectionHeadings", () => {
  it("resolves extra section from en.json for locale en", () => {
    const h = getMissingOrdersSectionHeadings("en");
    expect(h.extraTitle).toBe((en as Record<string, string>).missingOrdersSectionExtraTitle);
    expect(h.extraHelp).toBe((en as Record<string, string>).missingOrdersSectionExtraHelp);
  });
});
