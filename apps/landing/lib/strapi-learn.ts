/**
 * Build-time fetch from [Strapi](https://github.com/strapi/strapi) for Learn articles.
 *
 * ## Strapi setup (Collection type)
 * - **API ID (plural):** `learn-articles` → REST path `/api/learn-articles`
 * - **Fields (camelCase):**
 *   - `slug` (UID, required)
 *   - `title` (Text)
 *   - `metaTitle` (Text)
 *   - `metaDescription` (Long text)
 *   - `hubDesc` (Long text) — short blurb for /learn hub cards
 *   - `content` (Long text) — **Markdown** body (same style as `content/learn/*.md`)
 * - **Permissions:** Public `find` + `findOne` for this type, *or* use `STRAPI_API_TOKEN` (build-only).
 * - Publish entries (`publishedAt` set); drafts are ignored.
 *
 * Env: `STRAPI_URL` (no trailing slash), optional `STRAPI_API_TOKEN`.
 */

import type { LearnArticleMeta } from "@/lib/learn-articles";
import {
  strapiBaseUrl as resolveStrapiBaseUrl,
  strapiHeaders as resolveStrapiHeaders,
} from "@/lib/app-config";

export type StrapiLearnArticlePayload = {
  meta: LearnArticleMeta;
  markdown: string;
};

function unwrapStrapiRow(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (
    "attributes" in r &&
    r.attributes &&
    typeof r.attributes === "object"
  ) {
    return { ...r, ...(r.attributes as Record<string, unknown>) };
  }
  return r;
}

function formatUpdated(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function rowToMetaOnly(row: unknown): LearnArticleMeta | null {
  const src = unwrapStrapiRow(row);
  if (!src) return null;
  const slug = String(src.slug ?? "").trim();
  const title = String(src.title ?? "").trim();
  if (!slug || !title) return null;
  const metaTitle = String(src.metaTitle ?? title).trim();
  const metaDescription = String(src.metaDescription ?? "").trim();
  const hubDesc = String(src.hubDesc ?? "").trim();
  const updated =
    formatUpdated(String(src.updatedAt ?? src.publishedAt ?? "")) ||
    "Recently updated";
  return {
    slug,
    title,
    metaTitle,
    metaDescription,
    hubDesc,
    updated,
  };
}

function rowToPayload(row: unknown): StrapiLearnArticlePayload | null {
  const meta = rowToMetaOnly(row);
  if (!meta) return null;
  const src = unwrapStrapiRow(row);
  if (!src) return null;
  const markdown = String(
    src.content ?? src.body ?? src.markdown ?? "",
  ).trim();
  if (!markdown) return null;
  return { meta, markdown };
}

/** List published learn articles (metadata only). */
export async function fetchStrapiLearnIndex(): Promise<LearnArticleMeta[]> {
  const base = resolveStrapiBaseUrl();
  if (!base) return [];

  const params = new URLSearchParams({
    "filters[publishedAt][$notNull]": "true",
    "pagination[pageSize]": "100",
    sort: "publishedAt:desc",
    // Omit heavy body from list response when Strapi honors `fields`
    "fields[0]": "slug",
    "fields[1]": "title",
    "fields[2]": "metaTitle",
    "fields[3]": "metaDescription",
    "fields[4]": "hubDesc",
    "fields[5]": "updatedAt",
    "fields[6]": "publishedAt",
  });
  const url = `${base}/api/learn-articles?${params.toString()}`;
  const res = await fetch(url, {
    headers: resolveStrapiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strapi learn-articles list failed: ${res.status}`);
  }
  const json = (await res.json()) as { data?: unknown[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  const metas = rows
    .map((row) => rowToMetaOnly(row))
    .filter((m): m is LearnArticleMeta => m != null);
  return metas;
}

/** Single article with markdown body. */
export async function fetchStrapiLearnArticleBySlug(
  slug: string,
): Promise<StrapiLearnArticlePayload | null> {
  const base = resolveStrapiBaseUrl();
  if (!base) return null;

  const params = new URLSearchParams({
    "filters[slug][$eq]": slug,
    "filters[publishedAt][$notNull]": "true",
    "pagination[page]": "1",
    "pagination[pageSize]": "1",
  });
  const url = `${base}/api/learn-articles?${params.toString()}`;
  const res = await fetch(url, {
    headers: resolveStrapiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Strapi learn-articles find failed: ${res.status}`);
  }
  const json = (await res.json()) as { data?: unknown[] };
  const rows = Array.isArray(json.data) ? json.data : [];
  const first = rows[0];
  return first ? rowToPayload(first) : null;
}
