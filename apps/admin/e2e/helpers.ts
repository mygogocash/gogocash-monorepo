import type { Page } from "@playwright/test";

export async function adminSignIn(
  page: Page,
  email = "admin@gogocash.co",
  password = "1234",
): Promise<void> {
  await page.goto("/signin");
  await page.getByLabel(/email/i).fill(email);
  await page.locator('#admin-signin-password').fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|brands)/, { timeout: 45_000 });
}

export async function expectRouteLoads(page: Page, path: string, hint: RegExp): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.getByText(hint).first().waitFor({ state: "visible", timeout: 45_000 });
}
