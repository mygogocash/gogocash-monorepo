import type { APIRequestContext } from "@playwright/test";

const DEFAULT_API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";

export async function waitForApiHealthy(
  request: APIRequestContext,
  apiUrl = DEFAULT_API_URL,
  attempts = 45,
): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    const health = await request.get(`${apiUrl}/health`);
    const root = await request.get(`${apiUrl}/`);
    if (health.ok() && root.ok()) {
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`API not healthy at ${apiUrl}`);
}

export async function getTopBrands(
  request: APIRequestContext,
  apiUrl = DEFAULT_API_URL,
): Promise<unknown[]> {
  const response = await request.get(`${apiUrl}/offer/top-brands`);
  if (!response.ok()) {
    throw new Error(`GET /offer/top-brands failed: ${response.status()}`);
  }
  const body = await response.json();
  return Array.isArray(body) ? body : (body as { data?: unknown[] }).data ?? [];
}

export async function getOfferById(
  request: APIRequestContext,
  offerId: string,
  apiUrl = DEFAULT_API_URL,
): Promise<Record<string, unknown>> {
  const response = await request.get(`${apiUrl}/offer/${offerId}`);
  if (!response.ok()) {
    throw new Error(`GET /offer/${offerId} failed: ${response.status()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

export async function pollTopBrandsIncludes(
  request: APIRequestContext,
  predicate: (brand: Record<string, unknown>) => boolean,
  apiUrl = DEFAULT_API_URL,
  timeoutMs = 30_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const brands = (await getTopBrands(request, apiUrl)) as Record<string, unknown>[];
    const hit = brands.find(predicate);
    if (hit) {
      return hit;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for top-brands predicate");
}

export async function getWithdrawCheck(
  request: APIRequestContext,
  customerToken: string,
  apiUrl = DEFAULT_API_URL,
): Promise<Record<string, unknown>> {
  const response = await request.post(`${apiUrl}/withdraw/check`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  if (!response.ok()) {
    throw new Error(`POST /withdraw/check failed: ${response.status()}`);
  }
  return (await response.json()) as Record<string, unknown>;
}
