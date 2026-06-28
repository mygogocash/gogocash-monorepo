import path from "node:path";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { chromium } from "@playwright/test";

const ADMIN_AUTH_FILE = path.resolve(process.cwd(), ".e2e/admin-storage.json");

async function ensureAdminStorageState(adminUrl: string): Promise<void> {
  if (fs.existsSync(ADMIN_AUTH_FILE)) {
    return;
  }
  fs.mkdirSync(path.dirname(ADMIN_AUTH_FILE), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${adminUrl}/signin`);
  await page.getByLabel(/email/i).fill("admin@gogocash.co");
  await page.locator("#admin-signin-password").fill("1234");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|brands)/, { timeout: 60_000 });
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
  await browser.close();
}

export default async function globalSetup(): Promise<void> {
  const outPath = path.resolve(process.cwd(), ".e2e/seed.json");
  const mongoUri =
    process.env.MONGO_URI ?? "mongodb://localhost:27017/gogocash-e2e?replicaSet=rs0";
  const adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:3000";

  try {
    if (!fs.existsSync(outPath) || process.env.E2E_FORCE_SEED === "1") {
      execSync(
        `E2E_SEED_OUT="${outPath}" MONGO_URI="${mongoUri}" npm run seed:e2e -w gogocash-api`,
        { stdio: "inherit", cwd: process.cwd() },
      );
    }
  } catch {
    await fs.promises.access(outPath);
  }

  process.env.E2E_SEED_OUT = outPath;
  const seed = JSON.parse(fs.readFileSync(outPath, "utf8")) as {
    adminToken?: string;
    customerToken?: string;
  };
  if (seed.adminToken) {
    process.env.E2E_ADMIN_TOKEN = seed.adminToken;
  }
  if (seed.customerToken) {
    process.env.E2E_CUSTOMER_TOKEN = seed.customerToken;
  }

  await ensureAdminStorageState(adminUrl);
}
