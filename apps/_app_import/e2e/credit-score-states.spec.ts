import { expect, test } from "@playwright/test";
import { attachPageErrorCollector } from "./attachPageErrorCollector";

const authFile = process.env.PLAYWRIGHT_AUTH_FILE?.trim();

test.describe("credit-score states (authenticated)", () => {
  test.skip(!authFile, "Set PLAYWRIGHT_AUTH_FILE to a saved storageState JSON.");
  test.use(authFile ? { storageState: authFile } : {});

  test("en mobile: starter state core sections render without overflow", async ({ page }) => {
    const { messages } = attachPageErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/credit-score", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);

    await expect(page.getByText("Your GoGoPass Score")).toBeVisible();
    await expect(page.getByText("Earn more points")).toBeVisible();
    await expect(page.getByText("What you get")).toBeVisible();
    await expect(page.getByText("Free GoGoPass — 12 Months")).toBeVisible();

    const mainScroll = page.getByTestId("profile-subpage-main-scroll");
    await expect(mainScroll).toBeVisible();
    const hasNoHorizontalOverflow = await mainScroll.evaluate(
      (el) => el.scrollWidth <= el.clientWidth + 1
    );
    expect(hasNoHorizontalOverflow).toBe(true);

    expect(messages, messages.join("\n")).toEqual([]);
  });

  test("th mobile: page sections render and locale path works", async ({ page }) => {
    const { messages } = attachPageErrorCollector(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/th/credit-score", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/th\/credit-score/);

    await expect(page.getByText("คะแนน GoGoPass ของคุณ")).toBeVisible();
    await expect(page.getByText("รับคะแนนเพิ่ม")).toBeVisible();
    await expect(page.getByText("สิ่งที่คุณได้รับ")).toBeVisible();
    await expect(page.getByText("GoGoPass ฟรี — 12 เดือน")).toBeVisible();

    expect(messages, messages.join("\n")).toEqual([]);
  });
});
