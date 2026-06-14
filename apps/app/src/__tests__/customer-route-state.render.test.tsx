import { createElement } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import type { CustomerRouteStateVariant } from "@mobile/components/CustomerRouteState";

// Render coverage (audit #2): unlike the source-string *.test.ts suite, this
// actually mounts the component (react-native -> react-native-web, happy-dom) and
// asserts rendered output — catching runtime breaks the string suite cannot.
describe("CustomerRouteState (render)", () => {
  it("renders default copy for each variant without throwing", () => {
    const cases: { variant: CustomerRouteStateVariant; title: string }[] = [
      { variant: "empty", title: "No activity yet" },
      { variant: "error", title: "We could not load this page" },
      { variant: "loading", title: "Loading GoGoCash" },
      { variant: "offline", title: "You are offline" },
      { variant: "success", title: "Done" },
      { variant: "unauthenticated", title: "Sign in required" },
    ];

    for (const testCase of cases) {
      const { unmount } = render(
        createElement(CustomerRouteState, { variant: testCase.variant })
      );
      expect(screen.getByText(testCase.title)).toBeTruthy();
      unmount();
    }
  });

  it("uses accessibilityRole=alert for error and offline, not for the rest", () => {
    const { unmount: u1 } = render(createElement(CustomerRouteState, { variant: "error" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    u1();

    const { unmount: u2 } = render(createElement(CustomerRouteState, { variant: "offline" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    u2();

    const { unmount: u3 } = render(createElement(CustomerRouteState, { variant: "success" }));
    expect(screen.queryByRole("alert")).toBeNull();
    u3();
  });

  it("renders an explicit title and body over the variant defaults", () => {
    render(
      createElement(CustomerRouteState, {
        variant: "empty",
        title: "Custom heading",
        body: "Custom explanatory body.",
      })
    );

    expect(screen.getByText("Custom heading")).toBeTruthy();
    expect(screen.getByText("Custom explanatory body.")).toBeTruthy();
    // the default empty-state copy is replaced, not appended
    expect(screen.queryByText("No activity yet")).toBeNull();
  });

  it("renders primary and secondary action labels when actions are provided", () => {
    render(
      createElement(CustomerRouteState, {
        variant: "error",
        action: { label: "Try again" },
        secondaryAction: { label: "Go home", href: "/" },
      })
    );

    expect(screen.getByText("Try again")).toBeTruthy();
    expect(screen.getByText("Go home")).toBeTruthy();
  });

  it("renders no action region when no actions are passed", () => {
    render(createElement(CustomerRouteState, { variant: "empty", testID: "state" }));
    const root = screen.getByTestId("state");
    // the bare empty state shows only its title + body, no extra button labels
    expect(within(root).queryByText("Try again")).toBeNull();
  });
});
