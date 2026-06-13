# Learn hub: local Markdown vs Strapi

The `/learn` hub and `/learn/[slug]` pages resolve article metadata and Markdown from **one of two sources**, chosen at **`next build`** (static export).

## Local (default)

- **Metadata:** [`lib/learn-articles.ts`](../lib/learn-articles.ts) (`LEARN_ARTICLES`).
- **Body:** files under [`content/learn/`](../content/learn/) named `{slug}.md`, or bundled fallbacks in [`lib/learn-article-content.ts`](../lib/learn-article-content.ts).

No environment variables are required. CI builds use this path unless Strapi is configured.

## Strapi (optional)

When **`STRAPI_URL`** is set (and the API returns at least one published entry), [`lib/learn-data.ts`](../lib/learn-data.ts) prefers:

1. **Index:** [`fetchStrapiLearnIndex`](../lib/strapi-learn.ts) for the hub and `generateStaticParams`.
2. **Per slug:** [`fetchStrapiLearnArticleBySlug`](../lib/strapi-learn.ts) for each article page.

If Strapi is unreachable or returns empty data, the build **falls back** to local `LEARN_ARTICLES` + `content/learn/*.md` without cluttering the build log. To print those diagnostics, set **`NODE_DEBUG=learn-data`** when running `next build` (Node `util.debuglog`).

Optional **`STRAPI_API_TOKEN`:** use for non-public Strapi permissions (build-time only; do not expose in client bundles).

Schema and field list: see the file header in [`lib/strapi-learn.ts`](../lib/strapi-learn.ts).

## CI / GitHub Actions

The default workflow ([`.github/workflows/build-landing.yml`](../.github/workflows/build-landing.yml)) does **not** set `STRAPI_URL`. To build from Strapi in CI:

1. Add repository secrets, e.g. `STRAPI_URL`, and optionally `STRAPI_API_TOKEN`.
2. Pass them into the **Build static site** step as `env:` entries (same pattern as `INVOLVE_ASIA_*`).

## Pushing local Markdown to Strapi

For one-off or scripted uploads, use:

```bash
npm run learn:strapi-push
```

Script: [`scripts/push-learn-to-strapi.ts`](../scripts/push-learn-to-strapi.ts) (requires Strapi credentials / API access as documented there).
