/**
 * Upserts Learn articles from `lib/learn-articles.ts` plus local/embedded markdown into Strapi.
 *
 * Requires a token with create/update permission (not read-only).
 * Usage: npm run learn:strapi-push
 *
 * Env: STRAPI_URL, STRAPI_PUSH_TOKEN (or STRAPI_API_TOKEN if it has full access)
 * Optional: DRY_RUN=1 — log actions only, no HTTP writes
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEARN_ARTICLES } from "../lib/learn-articles";
import { learnArticleMarkdownBySlug } from "../lib/learn-article-content";

function baseUrl(): string {
  const raw = process.env.STRAPI_URL?.trim();
  if (!raw) throw new Error("STRAPI_URL is required");
  return raw.replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token =
    process.env.STRAPI_PUSH_TOKEN?.trim() ||
    process.env.STRAPI_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "STRAPI_PUSH_TOKEN (recommended) or STRAPI_API_TOKEN is required for writes",
    );
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

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

function entryId(row: unknown): string | number | null {
  const u = unwrapStrapiRow(row);
  if (!u) return null;
  if (u.documentId != null) return String(u.documentId);
  if (u.id != null) return typeof u.id === "number" ? u.id : String(u.id);
  return null;
}

async function findBySlug(
  base: string,
  headers: HeadersInit,
  slug: string,
): Promise<unknown | null> {
  const params = new URLSearchParams({
    "filters[slug][$eq]": slug,
    "pagination[pageSize]": "1",
  });
  const res = await fetch(`${base}/api/learn-articles?${params}`, {
    headers,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Strapi find failed ${res.status}: ${t.slice(0, 500)}`);
  }
  const json = (await res.json()) as { data?: unknown[] };
  const row = json.data?.[0];
  return row ?? null;
}

async function main() {
  const base = baseUrl();
  const headers = authHeaders();
  const root = process.cwd();

  console.log(`Strapi: ${base}`);
  console.log(dryRun ? "DRY_RUN — no writes\n" : "");

  for (const meta of LEARN_ARTICLES) {
    const mdPath = join(root, "content", "learn", `${meta.slug}.md`);
    let markdown: string;
    try {
      markdown = readFileSync(mdPath, "utf8");
    } catch {
      markdown = learnArticleMarkdownBySlug(meta.slug) ?? "";
    }
    if (!markdown) {
      console.error(`Skip (missing content): ${meta.slug}`);
      continue;
    }

    const data = {
      slug: meta.slug,
      title: meta.title,
      metaTitle: meta.metaTitle,
      metaDescription: meta.metaDescription,
      hubDesc: meta.hubDesc,
      content: markdown,
      publishedAt: new Date().toISOString(),
    };

    const existing = await findBySlug(base, headers, meta.slug);
    const id = existing ? entryId(existing) : null;

    if (dryRun) {
      console.log(
        id != null ? `[update] ${meta.slug} id=${id}` : `[create] ${meta.slug}`,
      );
      continue;
    }

    if (id != null) {
      const url = `${base}/api/learn-articles/${id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `PUT ${meta.slug} failed ${res.status}: ${t.slice(0, 800)}`,
        );
      }
      console.log(`Updated: ${meta.slug}`);
    } else {
      const res = await fetch(`${base}/api/learn-articles`, {
        method: "POST",
        headers,
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `POST ${meta.slug} failed ${res.status}: ${t.slice(0, 800)}`,
        );
      }
      console.log(`Created: ${meta.slug}`);
    }
  }

  console.log("\nDone. Rebuild the landing site (npm run build) to pull from Strapi.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
