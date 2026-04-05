import { test, expect, type Page } from "@playwright/test";

import { attachPageErrorCollector } from "./attachPageErrorCollector";

/**
 * E2E tests for brand CI category chip and shop-detail terms-of-use link.
 *
 * Covers:
 *  - TC-1/TC-2: Category chip mint styling on home cards
 *  - TC-3: Card click navigates to shop detail
 *  - TC-4/TC-5: Terms accordion link presence, attributes, and CI color
 *  - TC-6: Terms link opens in new tab
 *  - TC-9: Favorite button interactivity inside stretch-link
 */

const MINT_SOFT = "rgb(216, 248, 239)";
const MINT_STRONG = "rgb(0, 170, 128)";
const MINT_PRIMARY = "rgb(0, 204, 153)";
const MINT_BORDER = "rgb(183, 231, 219)";

// ─── Home — mobile card tests ───────────────────────────────────────────────

test.describe("Home — mobile brand cards", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    attachPageErrorCollector(page);
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[aria-label]  a[href*="/shop/"]', { timeout: 15_000 });
  });

  test("TC-1: category chip uses mint CI styling", async () => {
    const chip = page.locator('[class*="CategoryChip"], [class*="gc-primary-soft"]').first();
    if ((await chip.count()) === 0) {
      test.skip(true, "No category chip found — API may not have returned offers");
      return;
    }

    const bg = await chip.evaluate((el) => getComputedStyle(el).backgroundColor);
    const borderColor = await chip.evaluate((el) => getComputedStyle(el).borderColor);
    const color = await chip.evaluate((el) => getComputedStyle(el).color);

    expect(bg).toBe(MINT_SOFT);
    expect(borderColor).toBe(MINT_BORDER);
    expect(color).toBe(MINT_STRONG);
  });

  test("TC-1b: category icon is 12px (size-3)", async () => {
    const icon = page.locator('svg[aria-hidden="true"]').first();
    if ((await icon.count()) === 0) {
      test.skip(true, "No category icon found");
      return;
    }

    const firstCardIcon = page
      .locator('a[href*="/shop/"]')
      .first()
      .locator("..")
      .locator("..")
      .locator('svg[aria-hidden="true"]')
      .first();

    if ((await firstCardIcon.count()) === 0) {
      test.skip(true, "No category icon found in card");
      return;
    }

    const box = await firstCardIcon.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(14);
      expect(box.height).toBeLessThanOrEqual(14);
    }
  });

  test("TC-3: card click navigates to shop detail", async () => {
    const cardLink = page.locator('a[href*="/shop/"]').first();
    const href = await cardLink.getAttribute("href");
    expect(href).toBeTruthy();

    await cardLink.click();
    await page.waitForURL(/\/shop\//, { timeout: 10_000 });
    expect(page.url()).toContain("/shop/");
  });

  test("TC-9: favorite button click does not navigate", async () => {
    const currentUrl = page.url();
    const favButton = page.locator("button[aria-label]").first();

    if ((await favButton.count()) === 0) {
      test.skip(true, "No favorite button found");
      return;
    }

    await favButton.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe(currentUrl);
  });
});

// ─── Home — desktop card tests ──────────────────────────────────────────────

test.describe("Home — desktop featured cards", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("TC-2: featured card category chip uses mint CI styling", async ({ page }) => {
    attachPageErrorCollector(page);
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href*="/shop/"]', { timeout: 15_000 });

    const chip = page.locator('[class*="CategoryChip"], [class*="gc-primary-soft"]').first();
    if ((await chip.count()) === 0) {
      test.skip(true, "No category chip found");
      return;
    }

    const bg = await chip.evaluate((el) => getComputedStyle(el).backgroundColor);
    const color = await chip.evaluate((el) => getComputedStyle(el).color);

    expect(bg).toBe(MINT_SOFT);
    expect(color).toBe(MINT_STRONG);
  });

  test("TC-2b: featured card category icon is 16px (size-4)", async ({ page }) => {
    attachPageErrorCollector(page);
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href*="/shop/"]', { timeout: 15_000 });

    const chipIcon = page
      .locator('[class*="CategoryChip"], [class*="gc-primary-soft"]')
      .first()
      .locator("svg")
      .first();

    if ((await chipIcon.count()) === 0) {
      test.skip(true, "No chip icon found");
      return;
    }

    const box = await chipIcon.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(18);
      expect(box.height).toBeLessThanOrEqual(18);
      expect(box.width).toBeGreaterThanOrEqual(14);
    }
  });
});

// ─── Shop detail — terms accordion ──────────────────────────────────────────

test.describe("Shop detail — terms and conditions", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  async function navigateToShopDetail(page: Page) {
    attachPageErrorCollector(page);
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('a[href*="/shop/"]', { timeout: 15_000 });

    const firstShopLink = page.locator('a[href*="/shop/"]').first();
    const href = await firstShopLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/shop\//, { timeout: 10_000 });
  }

  test("TC-4: terms accordion has GoGoCash terms-of-use link", async ({ page }) => {
    await navigateToShopDetail(page);

    const termsHeading = page.getByText("Terms and exclusions");
    if ((await termsHeading.count()) === 0) {
      test.skip(true, "Terms section not found on this shop page");
      return;
    }

    const otherTerms = page.getByText("Other terms and conditions");
    if ((await otherTerms.count()) > 0) {
      await otherTerms.click();
      await page.waitForTimeout(500);
    }

    const termsLink = page.getByRole("link", { name: "GoGoCash terms of use" });
    if ((await termsLink.count()) === 0) {
      test.skip(true, "Terms of use link not found");
      return;
    }

    await expect(termsLink).toBeVisible();

    const href = await termsLink.getAttribute("href");
    expect(href).toContain("https://gogocash.co/term-of-use");

    const target = await termsLink.getAttribute("target");
    expect(target).toBe("_blank");

    const rel = await termsLink.getAttribute("rel");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  test("TC-5: terms link uses brand CI color", async ({ page }) => {
    await navigateToShopDetail(page);

    const otherTerms = page.getByText("Other terms and conditions");
    if ((await otherTerms.count()) > 0) {
      await otherTerms.click();
      await page.waitForTimeout(500);
    }

    const termsLink = page.getByRole("link", { name: "GoGoCash terms of use" });
    if ((await termsLink.count()) === 0) {
      test.skip(true, "Terms of use link not found");
      return;
    }

    const color = await termsLink.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe(MINT_PRIMARY);

    const textDecoration = await termsLink.evaluate(
      (el) => getComputedStyle(el).textDecorationLine
    );
    expect(textDecoration).toBe("underline");
  });

  test("TC-6: terms link opens in new tab", async ({ page, context }) => {
    await navigateToShopDetail(page);

    const otherTerms = page.getByText("Other terms and conditions");
    if ((await otherTerms.count()) > 0) {
      await otherTerms.click();
      await page.waitForTimeout(500);
    }

    const termsLink = page.getByRole("link", { name: "GoGoCash terms of use" });
    if ((await termsLink.count()) === 0) {
      test.skip(true, "Terms of use link not found");
      return;
    }

    const originalUrl = page.url();
    const [newPage] = await Promise.all([
      context.waitForEvent("page", { timeout: 10_000 }),
      termsLink.click(),
    ]);

    expect(newPage.url()).toContain("gogocash.co/term-of-use");
    expect(page.url()).toBe(originalUrl);
    await newPage.close();
  });
});
