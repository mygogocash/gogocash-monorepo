import { involveAsiaConfig } from "@/lib/app-config";
import { loadBundledPartnerBrands } from "@/lib/partner-logo-resolve";

/** Involve Asia Publisher API (server-only). */

export type PartnerBrand = {
  id: string;
  name: string;
  category: string;
  logoUrl: string | null;
};

function bundledFallbackPartners(): PartnerBrand[] {
  return loadBundledPartnerBrands().map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    logoUrl: b.logoUrl,
  }));
}

type InvolveOfferRow = {
  offer_id?: number;
  offer_name?: string;
  /** Comma-separated or single value from `/offers/all` (varies by API version). */
  categories?: string;
  category?: string;
  category_name?: string;
  vertical?: string;
  logo?: string;
};

type InvolveListResponse<T> = {
  status?: string;
  data?: {
    page?: number;
    nextPage?: number | null;
    data?: T[];
  };
};

const API_BASE = "https://api.involve.asia/api";

function slugAlnum(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** First Involve category label from whatever field the API returned. */
function primaryInvolveCategory(row: InvolveOfferRow): string {
  const raw =
    row.categories?.trim() ||
    row.category?.trim() ||
    row.category_name?.trim() ||
    row.vertical?.trim();
  if (!raw) return "Partners";
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : "Partners";
}

/**
 * Index keys for an offer name so bundled display names (e.g. "Lazada") can match
 * API rows like "Lazada Indonesia - CPS".
 */
function involveCategoryIndexKeysFromOfferName(offerName: string): string[] {
  const keys = new Set<string>();
  const t = offerName.trim();
  if (!t) return [];
  keys.add(slugAlnum(t));
  const paren = t.indexOf("(");
  const s = paren === -1 ? t : t.slice(0, paren).trim();
  const dashSep = /\s[-–—]\s/;
  const dashMatch = s.match(dashSep);
  if (dashMatch && dashMatch.index != null) {
    const before = s.slice(0, dashMatch.index).trim();
    if (before) keys.add(slugAlnum(before));
  }
  const firstUs = s.split("_")[0]?.trim();
  if (firstUs) keys.add(slugAlnum(firstUs));
  return [...keys].filter((k) => k.length >= 2);
}

async function fetchInvolveCategoryLookup(
  token: string,
  maxPages: number,
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  let page = 1;
  for (let i = 0; i < maxPages; i++) {
    const { rows, nextPage } = await fetchOffersPage(token, page);
    if (rows.length === 0) break;
    for (const row of rows) {
      const name = row.offer_name?.trim();
      if (!name) continue;
      const category = primaryInvolveCategory(row);
      for (const key of involveCategoryIndexKeysFromOfferName(name)) {
        if (!lookup.has(key)) lookup.set(key, category);
      }
    }
    if (!nextPage) break;
    page = nextPage;
  }
  return lookup;
}

function resolveInvolveCategoryForDisplayName(
  displayName: string,
  lookup: Map<string, string>,
): string | null {
  const trimmed = displayName.trim();
  if (!trimmed) return null;
  const full = slugAlnum(trimmed);
  if (full.length >= 2) {
    const exact = lookup.get(full);
    if (exact) return exact;
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const first = slugAlnum(parts[0]!);
    /** Avoid short tokens ("Air", "Go") stealing another brand’s category. */
    if (first.length >= 5) {
      const hit = lookup.get(first);
      if (hit) return hit;
    }
  }
  return null;
}

async function involveFormPost(
  path: string,
  token: string | null,
  fields: Record<string, string | number>,
): Promise<unknown> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    body.set(k, String(v));
  }
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return { status: "error", data: null };
  }
  try {
    return await res.json();
  } catch {
    return { status: "error", data: null };
  }
}

async function authenticate(
  key: string,
  secret: string,
): Promise<string | null> {
  const json = (await involveFormPost("/authenticate", null, {
    key,
    secret,
  })) as { status?: string; data?: { token?: string } };
  if (json.status !== "success" || !json.data?.token) return null;
  return json.data.token;
}

async function fetchOffersPage(
  token: string,
  page: number,
): Promise<{ rows: InvolveOfferRow[]; nextPage: number | null }> {
  const json = (await involveFormPost("/offers/all", token, {
    page,
    limit: 100,
    sort_by: "relevance",
    "filters[application_status]": "Approved",
    "filters[offer_status]": "Active",
  })) as InvolveListResponse<InvolveOfferRow>;

  if (json.status !== "success" || !json.data?.data) {
    return { rows: [], nextPage: null };
  }
  const next = json.data.nextPage;
  const nextPage =
    typeof next === "number" && next > page ? next : null;
  return { rows: json.data.data, nextPage };
}

/**
 * Full partner grid from bundled logos; when Involve credentials are set, categories
 * are taken from `/offers/all` (paginated) and matched by normalized offer name.
 */
export async function fetchPartnerBrands(): Promise<PartnerBrand[]> {
  const { key, secret, maxOfferPages } = involveAsiaConfig();
  const base = bundledFallbackPartners();

  if (!key || !secret) {
    return base;
  }

  try {
    const token = await authenticate(key, secret);
    if (!token) return base;

    const lookup = await fetchInvolveCategoryLookup(token, maxOfferPages);
    if (lookup.size === 0) return base;

    return base.map((b) => {
      const fromInvolve = resolveInvolveCategoryForDisplayName(b.name, lookup);
      return {
        ...b,
        category: fromInvolve ?? b.category,
      };
    });
  } catch {
    return base;
  }
}
