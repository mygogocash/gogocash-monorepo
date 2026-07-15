import { describe, expect, it } from "vitest";

import { isAdminApiConfigured, normalizeAdminApiUrl } from "./adminApiMode";

describe("admin API mode", () => {
  it("normalizes configured URLs and removes trailing slashes", () => {
    expect(normalizeAdminApiUrl("  https://api.example///  ")).toBe(
      "https://api.example",
    );
  });

  it("treats missing and whitespace-only values as unconfigured", () => {
    expect(normalizeAdminApiUrl(undefined)).toBeUndefined();
    expect(normalizeAdminApiUrl("   ")).toBeUndefined();
    expect(isAdminApiConfigured("   ")).toBe(false);
  });
});
