import { expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const MOBILE_SESSION_KEY = "gogocash.mobile.session.v1";

export type CustomerSeed = { userId: string; customerToken: string };

function resolveSeedPath(): string {
  if (process.env.E2E_SEED_OUT) {
    return path.resolve(process.env.E2E_SEED_OUT);
  }
  const candidates = [
    path.resolve(process.cwd(), ".e2e/seed.json"),
    path.resolve(process.cwd(), "../../.e2e/seed.json"),
    path.resolve(__dirname, "../../../.e2e/seed.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

export function loadCustomerSeed(): CustomerSeed | null {
  const seedPath = resolveSeedPath();
  try {
    const raw = fs.readFileSync(seedPath, "utf8");
    const data = JSON.parse(raw) as CustomerSeed;
    if (!data.userId || !data.customerToken) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function seedJwtSession(page: Page, seed: CustomerSeed): Promise<void> {
  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          _id: session.userId,
          access_token: session.customerToken,
          email: "e2e.customer@gogocash.co",
          username: "E2E Customer",
          provider: "e2e_seed",
        }),
      );
    },
    { key: MOBILE_SESSION_KEY, session: seed },
  );
}

export async function expectPublicRoute(
  page: Page,
  routePath: string,
  text: RegExp,
): Promise<void> {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBeTruthy();
  await page
    .getByText(text)
    .locator("visible=true")
    .first()
    .waitFor({ state: "visible", timeout: 45_000 });
}
