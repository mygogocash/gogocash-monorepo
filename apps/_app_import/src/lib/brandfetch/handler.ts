import {
  pickBrandfetchHeroAssets,
  validateBrandfetchDomainParam,
  type BrandfetchHeroApiResponse,
} from "./parse";

export type BrandfetchGetResult = {
  status: number;
  body: BrandfetchHeroApiResponse;
};

type NextFetchInit = RequestInit & { next?: { revalidate?: number } };

/**
 * Brandfetch Brand API GET logic (testable without Next.js request wiring).
 */
export async function runBrandfetchGet(
  domainParam: string | null,
  apiKey: string | undefined,
  fetchFn: typeof fetch
): Promise<BrandfetchGetResult> {
  const domain = validateBrandfetchDomainParam(domainParam);
  if (!domain) {
    return { status: 400, body: { ok: false, reason: "bad_domain" } };
  }

  const key = apiKey?.trim();
  if (!key) {
    return { status: 200, body: { ok: false, reason: "no_key" } };
  }

  const upstream = `https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(domain)}`;

  try {
    const response = await fetchFn(upstream, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 86_400 },
    } satisfies NextFetchInit);

    if (response.status === 404) {
      return { status: 404, body: { ok: false, reason: "not_found" } };
    }

    if (!response.ok) {
      return { status: 502, body: { ok: false, reason: "upstream" } };
    }

    const raw: unknown = await response.json();
    const picked = pickBrandfetchHeroAssets(raw);
    if (!picked) {
      return { status: 502, body: { ok: false, reason: "upstream" } };
    }

    return { status: 200, body: { ok: true, ...picked } };
  } catch {
    return { status: 504, body: { ok: false, reason: "upstream" } };
  }
}
