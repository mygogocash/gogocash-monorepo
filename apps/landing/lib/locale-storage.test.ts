import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isLikelyAutomatedClient,
  readBrowserLocaleTags,
  readPrimaryBrowserLanguage,
} from "./locale-storage";

describe("locale-storage", () => {
  const initialHadNavigator = Reflect.has(globalThis, "navigator");
  const initialNavigator = initialHadNavigator
    ? globalThis.navigator
    : undefined;

  function restoreNavigator() {
    if (initialHadNavigator) {
      Object.defineProperty(globalThis, "navigator", {
        value: initialNavigator,
        configurable: true,
        writable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  }

  function setNavigator(shim: {
    languages?: string[];
    language?: string;
    userAgent?: string;
  }) {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        ...shim,
        languages: shim.languages ?? [],
        language: shim.language ?? "",
        userAgent: shim.userAgent ?? "",
      } as unknown as Navigator,
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    restoreNavigator();
  });

  it("readBrowserLocaleTags returns en when navigator is absent", () => {
    Reflect.deleteProperty(globalThis, "navigator");
    assert.deepEqual(readBrowserLocaleTags(), ["en"]);
  });

  it("readBrowserLocaleTags returns en when no usable tags", () => {
    setNavigator({ languages: [], language: "" });
    assert.deepEqual(readBrowserLocaleTags(), ["en"]);
  });

  it("readBrowserLocaleTags walks languages then language, deduping case-insensitively", () => {
    setNavigator({
      languages: ["th-TH", "en-US", "TH-th"],
      language: "en-US",
    });
    assert.deepEqual(readBrowserLocaleTags(), ["th-TH", "en-US"]);
  });

  it("readBrowserLocaleTags normalizes underscores to hyphens", () => {
    setNavigator({ languages: ["zh_TW"], language: "zh_TW" });
    assert.deepEqual(readBrowserLocaleTags(), ["zh-TW"]);
  });

  it("readBrowserLocaleTags appends navigator.language when not in languages", () => {
    setNavigator({ languages: ["fr-FR"], language: "th-TH" });
    assert.deepEqual(readBrowserLocaleTags(), ["fr-FR", "th-TH"]);
  });

  it("readPrimaryBrowserLanguage returns lowercase primary subtag", () => {
    setNavigator({ languages: ["ja-JP"], language: "ja-JP" });
    assert.equal(readPrimaryBrowserLanguage(), "ja");
  });

  it("isLikelyAutomatedClient is true when navigator is absent", () => {
    Reflect.deleteProperty(globalThis, "navigator");
    assert.equal(isLikelyAutomatedClient(), true);
  });

  it("isLikelyAutomatedClient is true for Googlebot user agent", () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      languages: ["en-US"],
      language: "en-US",
    });
    assert.equal(isLikelyAutomatedClient(), true);
  });

  it("isLikelyAutomatedClient is false for a typical browser user agent", () => {
    setNavigator({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      languages: ["en-US"],
      language: "en-US",
    });
    assert.equal(isLikelyAutomatedClient(), false);
  });
});
