import { describe, expect, it } from "vitest";
import {
  extractBrandfetchDomain,
  pickBestFormatSrc,
  pickBrandfetchHeroAssets,
  validateBrandfetchDomainParam,
} from "./parse";

describe("extractBrandfetchDomain", () => {
  it("parses https URLs", () => {
    expect(extractBrandfetchDomain("https://www.nike.com/path")).toBe("nike.com");
  });

  it("prefixes bare hostnames", () => {
    expect(extractBrandfetchDomain("booking.com")).toBe("booking.com");
  });

  it("returns null for empty", () => {
    expect(extractBrandfetchDomain("")).toBeNull();
    expect(extractBrandfetchDomain(null)).toBeNull();
  });
});

describe("validateBrandfetchDomainParam", () => {
  it("accepts simple hosts", () => {
    expect(validateBrandfetchDomainParam("nike.com")).toBe("nike.com");
  });

  it("rejects empty and invalid", () => {
    expect(validateBrandfetchDomainParam("")).toBeNull();
    expect(validateBrandfetchDomainParam("a..b.com")).toBeNull();
  });
});

describe("pickBestFormatSrc", () => {
  it("prefers webp over png", () => {
    expect(
      pickBestFormatSrc([
        { src: "a.png", format: "png" },
        { src: "a.webp", format: "webp" },
      ])
    ).toBe("a.webp");
  });
});

describe("pickBrandfetchHeroAssets", () => {
  it("maps banner and logos", () => {
    const out = pickBrandfetchHeroAssets({
      name: "Demo",
      domain: "demo.com",
      logos: [
        { type: "icon", formats: [{ src: "i.png", format: "png" }] },
        { type: "logo", theme: "dark", formats: [{ src: "l.svg", format: "svg" }] },
      ],
      images: [{ type: "banner", formats: [{ src: "b.webp", format: "webp" }] }],
    });
    expect(out).toEqual({
      name: "Demo",
      domain: "demo.com",
      bannerUrl: "b.webp",
      logoUrl: "l.svg",
      iconUrl: "i.png",
    });
  });
});
