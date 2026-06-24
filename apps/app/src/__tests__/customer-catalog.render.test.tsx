import { createElement } from "react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomerCheckoutResultScreen } from "@mobile/screens/CustomerCatalogScreens";
import { ThemeProvider } from "@mobile/theme/ThemeProvider";

const catalogSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerCatalogScreens.tsx"),
  "utf8",
);

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

  it("catalog empty states > given dark mode tokens > then StateText uses readable muted ink", () => {
    expect(catalogSource).toMatch(
      /function StateText[\s\S]*?color: colors\.muted/,
    );
    expect(catalogSource).not.toMatch(
      /function StateText[\s\S]*?color: colors\.textSoft/,
    );
  });
});
