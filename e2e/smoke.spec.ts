import { test, expect } from "@playwright/test";

import { attachPageErrorCollector } from "./attachPageErrorCollector";

test.describe("smoke", () => {
  test("home responds", async ({ page }) => {
    const { messages } = attachPageErrorCollector(page);
    const res = await page.goto("/en", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    expect(messages, messages.join("\n")).toEqual([]);
  });

  test("th locale home responds", async ({ page }) => {
    const { messages } = attachPageErrorCollector(page);
    const res = await page.goto("/th", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    expect(messages, messages.join("\n")).toEqual([]);
  });

  test("hello API", async ({ request }) => {
    const res = await request.get("/api/hello");
    expect(res.ok()).toBeTruthy();
    await expect(res).toBeOK();
    expect(await res.text()).toContain("Hello");
  });
});
