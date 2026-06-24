import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomerCheckoutResultScreen } from "@mobile/screens/CustomerCatalogScreens";
import { ThemeProvider } from "@mobile/theme/ThemeProvider";

vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  useLocalSearchParams: () => ({}),
}));

describe("CustomerCatalogScreens", () => {
  it("renders checkout success state without admin controls", () => {
    render(
      createElement(
        ThemeProvider,
        {},
        createElement(CustomerCheckoutResultScreen, { status: "success" }),
      ),
    );

    expect(screen.getByText("Payment received. Your order will update shortly.")).toBeTruthy();
    expect(screen.queryByText("Publish")).toBeNull();
    expect(screen.queryByText("Archive")).toBeNull();
  });
});
