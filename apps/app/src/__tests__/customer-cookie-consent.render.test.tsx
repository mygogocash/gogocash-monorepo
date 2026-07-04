import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CustomerCookieConsentBanner } from "@mobile/components/CustomerCookieConsentBanner";
import { webCookieConsentBanner } from "@mobile/design/webDesignParity";
import { ThemeProvider } from "@mobile/theme/ThemeProvider";

function renderCookieBanner() {
  return render(
    createElement(
      ThemeProvider,
      {},
      createElement(CustomerCookieConsentBanner, { isDesktop: false })
    )
  );
}

describe("CustomerCookieConsentBanner", () => {
  const originalCustomEvent = globalThis.CustomEvent;

  afterEach(() => {
    window.localStorage.clear();
    Object.defineProperty(globalThis, "CustomEvent", {
      configurable: true,
      value: originalCustomEvent,
      writable: true,
    });
  });

  it("web accept > given banner visible > then persists dismissal to localStorage", () => {
    renderCookieBanner();

    fireEvent.click(screen.getByRole("button", { name: "Accept all cookies" }));

    expect(
      window.localStorage.getItem(webCookieConsentBanner.dismissedStorageKey),
    ).toBe("1");
    expect(screen.queryByText("We use cookies in the delivery of our services.")).toBeNull();
  });

  it("native runtime > given CustomEvent is unavailable > accepts cookies without crashing", () => {
    Object.defineProperty(globalThis, "CustomEvent", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    renderCookieBanner();

    expect(screen.getByText("We use cookies in the delivery of our services.")).toBeTruthy();
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "Accept all cookies" }));
    }).not.toThrow();
    expect(screen.queryByText("We use cookies in the delivery of our services.")).toBeNull();
  });
});
