# Performance runbook

## Bundle analysis

```bash
SKIP_ENV_VALIDATION=1 NEXTAUTH_SECRET=ci-build-placeholder-secret-min-32-chars!! npm run build
npm run analyze
```

Opens the Webpack bundle analyzer (requires `ANALYZE=true`). Inspect shared vendors (MUI, Firebase, etc.) and async chunks.

## Bundle size gate (CI)

```bash
npm run build
npm run perf:check-budget
```

Adjust `scripts/perf-budget.json` only when intentionally changing total client payload; document in the PR.

## Quick chunk summary

```bash
npm run build
npm run perf:baseline
```

## Lighthouse (local)

```bash
npm run build
npm run start &
npx wait-on http://127.0.0.1:3000
npx lighthouse http://127.0.0.1:3000/en --only-categories=performance --output=html --output-path=./lighthouse-report.html
```

## Sentry Web Vitals

With `NEXT_PUBLIC_SENTRY_DSN` set in production, distributions are recorded as `web_vitals.lcp`, `web_vitals.cls`, etc. Use **Discover** or **Metrics** in Sentry to trend p75 over time.

## Third-party load order

- **Google Tag Manager / GA:** `afterInteractive` (marketing needs reasonable early load).
- **Meta Pixel:** `lazyOnload` — loads after the main thread settles (`src/components/analytics/MetaPixel.tsx`).
