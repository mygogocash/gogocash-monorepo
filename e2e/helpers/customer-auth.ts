import type { Page } from "@playwright/test";

export const MOBILE_SESSION_STORAGE_KEY = "gogocash.mobile.session.v1";

export type CustomerSessionSeed = {
  _id: string;
  access_token: string;
  email?: string;
  username?: string;
  provider?: string;
};

export async function seedCustomerSession(
  page: Page,
  session: CustomerSessionSeed,
): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: MOBILE_SESSION_STORAGE_KEY, value: session },
  );
}

export function buildCustomerSession(
  userId: string,
  customerToken: string,
  email = "e2e.customer@gogocash.co",
): CustomerSessionSeed {
  return {
    _id: userId,
    access_token: customerToken,
    email,
    username: "E2E Customer",
    provider: "e2e_seed",
  };
}

export async function loadCustomerSessionFromSeedFile(): Promise<CustomerSessionSeed | null> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const candidates = process.env.E2E_SEED_OUT
    ? [path.resolve(process.env.E2E_SEED_OUT)]
    : [
        path.resolve(process.cwd(), ".e2e/seed.json"),
        path.resolve(process.cwd(), "../../.e2e/seed.json"),
        path.resolve(__dirname, "../../.e2e/seed.json"),
      ];
  try {
    const seedPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!seedPath) {
      return null;
    }
    const raw = await fs.promises.readFile(seedPath, "utf8");
    const data = JSON.parse(raw) as { userId: string; customerToken: string };
    return buildCustomerSession(data.userId, data.customerToken);
  } catch {
    return null;
  }
}
