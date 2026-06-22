import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CustomerCookieConsentBanner } from "@mobile/components/CustomerCookieConsentBanner";
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
