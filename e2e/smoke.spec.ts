import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home responds", async ({ page }) => {
    const res = await page.goto("/en", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
  });

  test("th locale home responds", async ({ page }) => {
    const res = await page.goto("/th", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
  });

  test("hello API", async ({ request }) => {
    const res = await request.get("/api/hello");
    expect(res.ok()).toBeTruthy();
    await expect(res).toBeOK();
    expect(await res.text()).toContain("Hello");
  });

  test("link-mycashback sends unauthenticated users to login", async ({ page }) => {
    await page.goto("/en/link-mycashback", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/en\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/en\/login/);
  });
});
