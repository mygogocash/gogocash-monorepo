import { describe, expect, it } from "vitest";

import { buildLocaleHref } from "./LocalePanel";

describe("buildLocaleHref", () => {
  it("locale switch href > given stale cookie and Thai route > then English URL replaces route locale once", () => {
    expect(buildLocaleHref("/th/privacy-policy", "th", "en")).toBe("/en/privacy-policy");
  });

  it("locale switch href > given unprefixed route > then target locale prefixes the path", () => {
    expect(buildLocaleHref("/privacy-policy", "th", "en")).toBe("/en/privacy-policy");
  });

  it("locale switch href > given similar path segment > then helper does not trim non-locale text", () => {
    expect(buildLocaleHref("/thailand", "th", "en")).toBe("/en/thailand");
  });
});
