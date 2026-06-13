# Performance program (GoGoCash web)

Operational docs for the performance baseline, PR review, and automation in this repo.

| Document | Purpose |
| --- | --- |
| [PERFORMANCE_BASELINE.md](./PERFORMANCE_BASELINE.md) | SLOs, budgets, how to record baselines |
| [PERFORMANCE_PR_CHECKLIST.md](./PERFORMANCE_PR_CHECKLIST.md) | PR review checklist |
| [RUNBOOK.md](./RUNBOOK.md) | Commands: build, analyze, bundle budget, Lighthouse |

## Automation

- `npm run perf:check-budget` — fails CI if total `.next/static/chunks/*.js` exceeds `scripts/perf-budget.json`
- `npm run perf:baseline` — prints chunk size summary after a production build
- `.github/workflows/performance.yml` — optional scheduled / manual Lighthouse against local `next start`

## Instrumentation

- `src/instrumentation-client.ts` — Sentry browser + `browserTracingIntegration` + `replayIntegration`
- `src/components/analytics/WebVitalsReporter.tsx` — Core Web Vitals → Sentry metrics (`web_vitals.*`) when DSN is set
