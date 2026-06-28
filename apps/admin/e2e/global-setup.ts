import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

const AUTH_DIR = path.resolve(__dirname, "../../../.e2e");
const AUTH_FILE = path.join(AUTH_DIR, "admin-storage.json");

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.E2E_ADMIN_URL ??
    "http://localhost:3000";

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/signin`);
  await page.getByLabel(/email/i).fill("admin@gogocash.co");
  await page.locator("#admin-signin-password").fill("1234");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|brands)/, { timeout: 60_000 });
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}

export { AUTH_FILE };
