import { expect, test } from "@playwright/test";
import {
  actionableMessages,
  attachPageErrorCollector,
} from "../attachPageErrorCollector";
import { openAdminPage } from "../helpers/admin-auth";
import { loadE2eSeed } from "../helpers/seed-data";

test.describe("E2E-01 admin brands list", () => {
  test("admin login → brands → partner rates render without crash", async ({
    browser,
  }) => {
    const seed = loadE2eSeed();
    const page = await openAdminPage(browser, seed.adminUrl);
    const { messages } = attachPageErrorCollector(page, { consoleWarnings: true });

    await page.goto(`${seed.adminUrl}/brands`);
    await expect(page.getByRole("heading", { name: /brands/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const brandLink = page.getByRole("link", { name: /E2E Test Brand/i }).first();
    if (await brandLink.isVisible().catch(() => false)) {
      await brandLink.click();
    } else {
      await page.goto(`${seed.adminUrl}/brands/${seed.brandId}`);
    }

    await expect(page.getByText(/Partner rates|Commission/i).first()).toBeVisible({
      timeout: 20_000,
    });
    expect(actionableMessages(messages, ["CLIENT_FETCH_ERROR", "next-auth"])).toEqual([]);
  });
});
