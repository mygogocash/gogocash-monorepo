import { createElement } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// expo-localization pulls in expo-modules-core, which reaches for the native
// `expo` global (EventEmitter) that does not exist under happy-dom. Device
// detection is not the behavior under test here (storage is pre-seeded for the
// hydration cases, and the fallback case asserts the device value), so mock the
// external module at the seam to a controllable default.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { LocaleProvider, useLocale } from "@mobile/i18n/LocaleProvider";
import { readStoredLocaleSync } from "@mobile/i18n/localeStorage";

const LOCALE_STORAGE_KEY = "gogocash.locale";

// Probe records every locale the context emits, in render order, so we can prove
// the FIRST committed value already matches storage (no en -> th flash).
function makeLocaleProbe(sink: string[]) {
  return function LocaleProbe() {
    const { locale } = useLocale();
    sink.push(locale);
    return createElement("span", { "data-testid": "locale" }, locale);
  };
}

describe("LocaleProvider locale hydration (web)", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("given stored 'th' > initial resolved locale is 'th' with no en intermediate", () => {
    globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, "th");

    const renders: string[] = [];
    const LocaleProbe = makeLocaleProbe(renders);
    render(createElement(LocaleProvider, null, createElement(LocaleProbe, null)));

    // The very first committed render must already be Thai — never English first.
    expect(renders[0]).toBe("th");
    expect(renders).not.toContain("en");
  });

  it("given nothing stored > falls back to the device locale (en here)", () => {
    const renders: string[] = [];
    const LocaleProbe = makeLocaleProbe(renders);
    render(createElement(LocaleProvider, null, createElement(LocaleProbe, null)));

    // Mocked device locale is en-US -> resolves to "en"; no crash, no blank gate.
    expect(renders[0]).toBe("en");
  });
});

describe("readStoredLocaleSync (web)", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("given a stored value > returns it synchronously", () => {
    globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, "th");
    expect(readStoredLocaleSync()).toBe("th");
  });

  it("given nothing stored > returns null synchronously", () => {
    expect(readStoredLocaleSync()).toBeNull();
  });
});
