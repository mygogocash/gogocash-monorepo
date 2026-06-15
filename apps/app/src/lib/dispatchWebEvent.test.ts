import { afterEach, describe, expect, it, vi } from "vitest";

import { dispatchWebEvent } from "@mobile/lib/dispatchWebEvent";

// These globals differ by runtime: web (react-native-web) has both `window` and
// `CustomEvent`; native Hermes has `window` (a partial polyfill) but NOT `CustomEvent`
// nor `window.dispatchEvent`. Save/restore so each case controls them explicitly.
type GlobalBag = Record<string, unknown>;
const bag = globalThis as GlobalBag;
const originalWindow = bag.window;
const originalCustomEvent = bag.CustomEvent;

afterEach(() => {
  bag.window = originalWindow;
  bag.CustomEvent = originalCustomEvent;
});

describe("dispatchWebEvent", () => {
  it("given native runtime where CustomEvent is undefined > does not throw and does not dispatch", () => {
    const dispatchEvent = vi.fn();
    bag.window = { dispatchEvent };
    delete bag.CustomEvent;

    expect(() => dispatchWebEvent("gc:consent-banner-dismissed")).not.toThrow();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it("given web runtime with window + CustomEvent > dispatches a CustomEvent carrying the name", () => {
    const dispatchEvent = vi.fn();
    bag.window = { dispatchEvent };
    class FakeCustomEvent {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    }
    bag.CustomEvent = FakeCustomEvent;

    dispatchWebEvent("gc:consent-banner-dismissed");

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0][0] as FakeCustomEvent;
    expect(event).toBeInstanceOf(FakeCustomEvent);
    expect(event.type).toBe("gc:consent-banner-dismissed");
  });
});
