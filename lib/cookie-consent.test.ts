import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_VERSION,
  hasDecidedConsent,
  isAnalyticsAllowed,
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

  it("returns null when 'accepted' is missing or not a boolean", () => {
    assert.equal(
      parseConsent(JSON.stringify({ version: COOKIE_CONSENT_VERSION })),
      null,
    );
    assert.equal(
      parseConsent(
        JSON.stringify({ version: COOKIE_CONSENT_VERSION, accepted: "yes" }),
      ),
      null,
    );
  });

  it("parses a valid accepted consent", () => {
    const parsed = parseConsent(
      JSON.stringify({
        version: COOKIE_CONSENT_VERSION,
        accepted: true,
        decidedAt: "2026-06-03T00:00:00.000Z",
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed.accepted, true);
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
  });

  it("persists acceptance and allows analytics", () => {
    persistConsent(true);
    assert.equal(hasDecidedConsent(), true);
    assert.equal(isAnalyticsAllowed(), true);
    assert.equal(readConsent()?.accepted, true);
  });

  it("persists rejection: decided but analytics stays off", () => {
    persistConsent(false);
    assert.equal(hasDecidedConsent(), true);
    assert.equal(isAnalyticsAllowed(), false);
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
