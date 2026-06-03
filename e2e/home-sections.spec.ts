import { test, expect } from "@playwright/test";

/**
 * Wave 5 — #14 (consolidate the two "Why" sections), #15 (Quests section),
 * #16 (differentiation table). The EN home must show one Why section plus the
 * new Quests + "why switch" sections, with the redundant "Why it adds up" gone.
 */
test.describe("home sections (#14/#15/#16)", () => {
  test("EN home has Quests + differentiation and no duplicate Why section", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });

    // #15 Quests + #16 differentiation present
    await expect(page.locator("#quests")).toHaveCount(1);
    await expect(page.locator("#why-switch")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "GoGoCash vs other cashback apps" }),
    ).toBeVisible();

    // #14 the redundant "Why it adds up" section is removed
    await expect(page.getByText("Why it adds up")).toHaveCount(0);
    // the consolidated "Why GoGoCash" section remains
    await expect(page.getByText("Why GoGoCash", { exact: true })).toBeVisible();
  });
});
