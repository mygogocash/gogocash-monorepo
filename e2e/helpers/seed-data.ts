import fs from "node:fs";
import path from "node:path";

export type E2eSeedData = {
  adminToken: string;
  viewerToken: string;
  editorToken: string;
  customerToken: string;
  userId: string;
  brandId: string;
  disabledBrandId: string;
  brandOfferId: number;
  couponCode: string;
  visibleCodeCouponId: string;
  linkOnlyCouponId: string;
  linkOnlyCouponName: string;
  couponDestinationUrl: string;
  questId: string;
  catalogSku: string;
  apiUrl: string;
  adminUrl: string;
  appUrl: string;
};

function resolveSeedPath(): string {
  if (process.env.E2E_SEED_OUT) {
    return path.resolve(process.env.E2E_SEED_OUT);
  }
  const candidates = [
    path.resolve(process.cwd(), ".e2e/seed.json"),
    path.resolve(process.cwd(), "../../.e2e/seed.json"),
    path.resolve(__dirname, "../../.e2e/seed.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

export function loadE2eSeed(): E2eSeedData {
  const seedPath = resolveSeedPath();
  const raw = fs.readFileSync(seedPath, "utf8");
  return JSON.parse(raw) as E2eSeedData;
}
