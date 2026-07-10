import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocaleProvider, useRegion } from "@mobile/i18n/LocaleProvider";

// The render setup mocks expo-localization globally (per-file vi.mock can't
// override its factory), exposing mutable device-locale state instead. The
// DEVICE REGION is exactly the behavior under test here — a Malaysian phone
// must open onto MY listings.
type MockDeviceLocale = { languageTag: string; languageCode: string; regionCode?: string };
const deviceLocale = (globalThis as { __mockDeviceLocale?: MockDeviceLocale }).__mockDeviceLocale;

const REGION_STORAGE_KEY = "gogocash.region";

type RegionSnapshot = { region: string; regionSource: string };

function makeRegionProbe(sink: RegionSnapshot[], actions: { setRegion?: (next: never) => void }) {
  return function RegionProbe() {
    const { region, regionSource, setRegion } = useRegion();
    actions.setRegion = setRegion as (next: never) => void;
    sink.push({ region, regionSource });
    return createElement("span", { "data-testid": "region" }, region);
  };
}

describe("LocaleProvider region hydration (web)", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    if (deviceLocale) {
      deviceLocale.regionCode = "MY";
    }
  });

  afterEach(() => {
    globalThis.localStorage?.clear();
    if (deviceLocale) {
      delete deviceLocale.regionCode;
    }
  });

  it("given nothing stored > then the first committed region is the DEVICE region, flagged as detected", () => {
    // Country selector groundwork (2026-07-10): fresh installs previously
    // hardcoded TH; the OS regionCode (already delivered by expo-localization)
    // was never read.
    const renders: RegionSnapshot[] = [];
    const RegionProbe = makeRegionProbe(renders, {});
    render(createElement(LocaleProvider, null, createElement(RegionProbe, null)));

    expect(renders[0]).toEqual({ region: "MY", regionSource: "detected" });
  });

  it("given a stored region > then it wins over the device region and is flagged as user-chosen", () => {
    globalThis.localStorage.setItem(REGION_STORAGE_KEY, "SG");

    const renders: RegionSnapshot[] = [];
    const RegionProbe = makeRegionProbe(renders, {});
    render(createElement(LocaleProvider, null, createElement(RegionProbe, null)));

    expect(renders[0]).toEqual({ region: "SG", regionSource: "user" });
  });

  it("given an explicit pick > then provenance flips to user and the choice persists", () => {
    const renders: RegionSnapshot[] = [];
    const actions: { setRegion?: (next: never) => void } = {};
    const RegionProbe = makeRegionProbe(renders, actions);
    render(createElement(LocaleProvider, null, createElement(RegionProbe, null)));

    act(() => {
      actions.setRegion?.("TH" as never);
    });

    expect(renders.at(-1)).toEqual({ region: "TH", regionSource: "user" });
    expect(globalThis.localStorage.getItem(REGION_STORAGE_KEY)).toBe("TH");
  });

  it("given a garbage stored value > then falls back to the detected device region", () => {
    globalThis.localStorage.setItem(REGION_STORAGE_KEY, "banana");

    const renders: RegionSnapshot[] = [];
    const RegionProbe = makeRegionProbe(renders, {});
    render(createElement(LocaleProvider, null, createElement(RegionProbe, null)));

    expect(renders[0]).toEqual({ region: "MY", regionSource: "detected" });
  });
});
