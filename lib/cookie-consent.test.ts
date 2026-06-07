import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_VERSION,
  hasDecidedConsent,
  isAnalyticsAllowed,
  isMarketingAllowed,
  parseConsent,
  persistConsent,
  readConsent,
} from "./cookie-consent";

/** Pure parsing/validation — no DOM needed. */
describe("cookie-consent parseConsent", () => {
  it("returns null when undecided (no stored value)", () => {
    assert.equal(parseConsent(null), null);
    assert.equal(parseConsent(""), null);
  });

  it("returns null for malformed JSON", () => {
    assert.equal(parseConsent("{not json"), null);
  });

  it("returns null for a stale schema version (re-ask on bump)", () => {
    assert.equal(
      parseConsent(JSON.stringify({ version: 0, accepted: true })),
      null,
    );
  });

  it("returns null when preferences are missing or malformed", () => {
    assert.equal(
      parseConsent(JSON.stringify({ version: COOKIE_CONSENT_VERSION })),
      null,
    );
    assert.equal(
      parseConsent(
        JSON.stringify({
          version: COOKIE_CONSENT_VERSION,
          preferences: { analytics: "yes", marketing: true },
        }),
      ),
      null,
    );
  });

  it("parses valid category preferences", () => {
    const parsed = parseConsent(
      JSON.stringify({
        version: COOKIE_CONSENT_VERSION,
        preferences: { analytics: true, marketing: false },
        decidedAt: "2026-06-03T00:00:00.000Z",
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed.preferences.analytics, true);
    assert.equal(parsed.preferences.marketing, false);
  });
});

/** Storage round-trip + opt-in default — shim window + localStorage like locale-storage.test. */
describe("cookie-consent storage", () => {
  const hadWindow = Reflect.has(globalThis, "window");
  const prevWindow = hadWindow ? globalThis.window : undefined;

  beforeEach(() => {
    const store = new Map<string, string>();
    const win = Object.assign(new EventTarget(), {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
    Object.defineProperty(globalThis, "window", {
      value: win,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (hadWindow) {
      Object.defineProperty(globalThis, "window", {
        value: prevWindow,
        configurable: true,
        writable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  it("defaults to opt-out before any decision (GDPR/PDPA safe)", () => {
    assert.equal(readConsent(), null);
    assert.equal(hasDecidedConsent(), false);
    assert.equal(isAnalyticsAllowed(), false);
    assert.equal(isMarketingAllowed(), false);
  });

  it("persists accept-all and allows analytics plus marketing", () => {
    persistConsent(true);
    assert.equal(hasDecidedConsent(), true);
    assert.equal(isAnalyticsAllowed(), true);
    assert.equal(isMarketingAllowed(), true);
    assert.equal(readConsent()?.preferences.analytics, true);
    assert.equal(readConsent()?.preferences.marketing, true);
  });

  it("persists rejection: decided but optional categories stay off", () => {
    persistConsent(false);
    assert.equal(hasDecidedConsent(), true);
    assert.equal(isAnalyticsAllowed(), false);
    assert.equal(isMarketingAllowed(), false);
  });

  it("persists custom preferences independently by category", () => {
    persistConsent({ analytics: true, marketing: false });
    assert.equal(hasDecidedConsent(), true);
    assert.equal(isAnalyticsAllowed(), true);
    assert.equal(isMarketingAllowed(), false);
    assert.deepEqual(readConsent()?.preferences, {
      analytics: true,
      marketing: false,
    });
  });

  it("notifies listeners on decision via a custom event", () => {
    let fired = false;
    (globalThis.window as unknown as EventTarget).addEventListener(
      COOKIE_CONSENT_EVENT,
      () => {
        fired = true;
      },
    );
    persistConsent(true);
    assert.equal(fired, true);
  });
});
