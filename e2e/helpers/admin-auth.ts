import type { APIRequestContext, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";

export type AdminLoginResult = {
  token: string;
  email: string;
  role: string;
};

function loadSeedAdminToken(): string | null {
  const candidates = process.env.E2E_SEED_OUT
    ? [path.resolve(process.env.E2E_SEED_OUT)]
    : [
        path.resolve(process.cwd(), ".e2e/seed.json"),
        path.resolve(process.cwd(), "../../.e2e/seed.json"),
        path.resolve(__dirname, "../../../.e2e/seed.json"),
      ];
  for (const seedPath of candidates) {
    try {
      const raw = fs.readFileSync(seedPath, "utf8");
      const token = (JSON.parse(raw) as { adminToken?: string }).adminToken;
      if (token) {
        return token;
      }
    } catch {
      // try next candidate
    }
  }
  return process.env.E2E_ADMIN_TOKEN ?? null;
}

export async function loginAdminViaApi(
  request: APIRequestContext,
  email = "admin@gogocash.co",
  password = "1234",
  apiUrl = DEFAULT_API_URL,
): Promise<AdminLoginResult> {
  const response = await request.post(`${apiUrl}/admin/login`, {
    data: { email, password },
  });
  if (response.status() === 429) {
    const seededToken = loadSeedAdminToken();
    if (seededToken) {
      return { token: seededToken, email, role: "superadmin" };
    }
  }
  if (!response.ok()) {
    throw new Error(`Admin login failed (${response.status()}): ${await response.text()}`);
  }
  const body = (await response.json()) as { token: string; email: string; role: string };
  return { token: body.token, email: body.email, role: body.role };
}

/** Open an admin UI page using shared E2E storage state (avoids repeated credential logins). */
export async function openAdminPage(
  browser: import("@playwright/test").Browser,
  adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:3000",
): Promise<import("@playwright/test").Page> {
  const authFile = path.resolve(process.cwd(), ".e2e/admin-storage.json");
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  await page.goto(adminUrl);
  return page;
}

/** Sign in through the admin UI (NextAuth credentials flow). */
export async function loginAdminViaUi(
  page: Page,
  email = "admin@gogocash.co",
  password = "1234",
  adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:3000",
): Promise<void> {
  await page.goto(`${adminUrl}/signin`);
  await page.getByLabel(/email/i).fill(email);
  await page.locator("#admin-signin-password").fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|brands)/, { timeout: 45_000 });
}

export async function adminApiHeaders(token: string): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
