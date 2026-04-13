import { test, expect } from "@playwright/test";

import { attachPageErrorCollector } from "./attachPageErrorCollector";

/**
 * Profile routes (e.g. /membership) require auth. To run this test locally:
 * 1. Log in once with Playwright codegen or a small script.
 * 2. Save storage: `await page.context().storageState({ path: 'e2e/.auth/user.json' })`.
 * 3. Run: `PLAYWRIGHT_AUTH_FILE=e2e/.auth/user.json npx playwright test e2e/profile-subpage-scroll.spec.ts`
 *
 * In CI this file is skipped unless PLAYWRIGHT_AUTH_FILE is set.
 */
const authFile = process.env.PLAYWRIGHT_AUTH_FILE?.trim();

test.describe("profile subpage scroll (authenticated)", () => {
  test.skip(!authFile, "Set PLAYWRIGHT_AUTH_FILE to a saved storageState JSON (see file header).");

  test.use(authFile ? { storageState: authFile } : {});

  test("membership main column scrolls long content", async ({ page }) => {
    const { messages } = attachPageErrorCollector(page);
    await page.goto("/en/membership", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    const scroll = page.getByTestId("profile-subpage-main-scroll");
    await expect(scroll).toBeVisible();

    const { clientHeight, scrollHeight } = await scroll.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));

    expect(
      scrollHeight,
      "membership page should overflow the profile main column so the inner scrollport is used"
    ).toBeGreaterThan(clientHeight);

    expect(messages, messages.join("\n")).toEqual([]);
  });
});
