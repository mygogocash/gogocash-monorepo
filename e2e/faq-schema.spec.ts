import { test, expect, type Page } from "@playwright/test";

/**
 * Issue #18 — per-locale FAQPage JSON-LD. Each home route must emit a FAQPage in
 * its own language; pages without an FAQ section must not emit one.
 */
async function faqSchemas(page: Page): Promise<string[]> {
  const all = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return all.filter((s) => s.includes('"@type":"FAQPage"'));
}

test.describe("faq schema (#18)", () => {
  test("EN home emits one English FAQPage", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    const faqs = await faqSchemas(page);
    expect(faqs.length).toBe(1);
    expect(faqs[0]).toContain("How does GoGoCash cashback work?");
  });

  test("/th emits a localized (Thai) FAQPage", async ({ page }) => {
    await page.goto("/th", { waitUntil: "load", timeout: 90_000 });
    const faqs = await faqSchemas(page);
    expect(faqs.length).toBe(1);
    expect(faqs[0]).toContain("GoGoCash คืนเงินยังไง?");
  });

  test("a non-FAQ page emits no FAQPage", async ({ page }) => {
    await page.goto("/about", { waitUntil: "load", timeout: 90_000 });
    expect((await faqSchemas(page)).length).toBe(0);
  });
});
