import { test, expect } from "@playwright/test";

/**
 * Regression for issue #4 — "How it works" tabs 2 & 3 rendered no content.
 * The tabpanel must swap its step heading when each tab is activated.
 */
test.describe("how it works tabs", () => {
  const STEP_TITLES = [
    "Open the brand from GoGoCash",
    "Shop and pay like you already do",
    "Cashback lands after the brand confirms",
  ] as const;

  test("each tab swaps the panel content (en home)", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });

    const tablist = page.getByRole("tablist", { name: "How it works steps" });
    await tablist.scrollIntoViewIfNeeded();
    await expect(tablist).toBeVisible();

    const panel = page.getByRole("tabpanel");

    // Tab 1 active by default.
    await expect(panel.getByRole("heading", { level: 3 })).toHaveText(
      STEP_TITLES[0],
    );

    // Tab 2 — "Checkout as usual".
    await page.getByRole("tab", { name: "Checkout as usual" }).click();
    await expect(panel.getByRole("heading", { level: 3 })).toHaveText(
      STEP_TITLES[1],
    );

    // Tab 3 — "Wallet grows".
    await page.getByRole("tab", { name: "Wallet grows" }).click();
    await expect(panel.getByRole("heading", { level: 3 })).toHaveText(
      STEP_TITLES[2],
    );

    // Active tab reflects selection (a11y).
    await expect(
      page.getByRole("tab", { name: "Wallet grows" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});
