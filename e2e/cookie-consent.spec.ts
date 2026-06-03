import { test, expect } from "@playwright/test";

/**
 * Issue #7 — PDPA/GDPR cookie consent. The banner must appear on first visit,
 * gate non-essential trackers until accepted, persist the choice, and be
 * re-openable from the footer. The LINE tag (`#line-tag-base`) is the observable
 * tracker; it must be absent before consent and present only after acceptance.
 *
 * Run against the static export (PLAYWRIGHT_SERVE_STATIC=1) so the production
 * build's LINE tag is active and gating is exercised.
 */
const CONSENT_KEY = "gogocash.cookie_consent";
const LINE_SCRIPT = "#line-tag-base";
const EN_BANNER = /Cookies & your privacy/;

test.describe("cookie consent (#7)", () => {
  test("first visit: gated before consent, accept persists + enables tracker", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });

    const banner = page.getByRole("dialog", { name: EN_BANNER });
    await expect(banner).toBeVisible();

    // Opt-in: no LINE tag before a decision.
    await expect(page.locator(LINE_SCRIPT)).toHaveCount(0);

    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(banner).toBeHidden();

    const stored = await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY);
    expect(stored).toContain('"accepted":true');

    // Tracker loads only after consent.
    await expect(page.locator(LINE_SCRIPT)).toHaveCount(1, { timeout: 10_000 });

    await page.reload();
    await expect(page.getByRole("dialog", { name: EN_BANNER })).toBeHidden();
  });

  test("reject persists and keeps trackers off", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await page.getByRole("button", { name: "Reject non-essential" }).click();

    const stored = await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY);
    expect(stored).toContain('"accepted":false');
    await expect(page.locator(LINE_SCRIPT)).toHaveCount(0);
  });

  test("footer Cookie Settings re-opens the banner after a decision", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(page.getByRole("dialog", { name: EN_BANNER })).toBeHidden();

    await page.getByRole("button", { name: "Cookie Settings" }).click();
    await expect(page.getByRole("dialog", { name: EN_BANNER })).toBeVisible();
  });

  test("shows Thai copy on the /th route", async ({ page }) => {
    await page.goto("/th", { waitUntil: "load", timeout: 90_000 });
    await expect(
      page.getByRole("dialog", { name: /คุกกี้และความเป็นส่วนตัว/ }),
    ).toBeVisible();
  });
});
