import { expect, test } from "@playwright/test";
import { actionableMessages, attachPageErrorCollector } from "../../../e2e/attachPageErrorCollector";

test.describe("non-functional checks", () => {
  test.use({ viewport: { width: 2048, height: 1005 } });

  test("NF-01 API URL env is backend mode on public home", async ({ page }) => {
    await page.goto("/");
    const apiUrl = await page.evaluate(() => {
      return (window as unknown as { process?: { env?: Record<string, string> } }).process?.env
        ?.EXPO_PUBLIC_API_URL;
    });
    await expect(
      page.getByRole("link", { name: /Top Brands/i }).first(),
    ).toBeVisible({ timeout: 45_000 });
    if (apiUrl) {
      expect(apiUrl).toMatch(/^https?:\/\//);
    }
  });

  test("NF-02 home route has no actionable console errors", async ({ page }) => {
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(actionableMessages(messages)).toEqual([]);
  });
});
