# Performance baseline and SLOs

## Targets (fill with measured values)

Update after each quarterly review. Sources: Lighthouse (lab), Sentry / RUM (field), PageSpeed Insights (optional).

| Metric | Lab target (mobile) | Field target (p75) | Notes |
| --- | --- | --- | --- |
| LCP | &lt; 2.5s | Good | Hero / largest image or text block |
| INP | &lt; 200ms | Good | Search, filters, checkout |
| CLS | &lt; 0.1 | Good | Fonts already `display: swap` |
| TTFB | &lt; 800ms | — | Server / edge / API |
| First Load JS (home) | TBD KB | — | From `next build` + analyzer |

## Bundle budget (repository gate)

Total size of **all** files under `.next/static/chunks` (after `next build`) is capped by `scripts/perf-budget.json`. This is a **coarse** guardrail; tighten `maxTotalStaticChunksBytes` when you improve the bundle.

**Current philosophy:** fail the build in CI if the client chunk footprint grows unexpectedly. Use `npm run analyze` for *which* dependency grew.

## Baseline capture (quarterly)

1. `SKIP_ENV_VALIDATION=1 NEXTAUTH_SECRET=<32+ chars> npm run build`
2. `npm run perf:baseline`
3. `npm run analyze` — inspect largest route and shared chunks (Webpack analyzer)
4. Lighthouse (mobile, throttled) on: `/en` (or default locale), `/en/shop`, `/en/login` — save HTML or PDF to shared drive
5. In Sentry: confirm **Metrics** show `web_vitals.*` distributions when `NEXT_PUBLIC_SENTRY_DSN` is set

## Related env vars

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Enables Sentry browser SDK + Web Vitals metrics |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Set `false` to disable GTM/Meta scripts locally |
| `NEXT_PUBLIC_WEB_VITALS_DEBUG` | Dev-only console logging for Web Vitals |
