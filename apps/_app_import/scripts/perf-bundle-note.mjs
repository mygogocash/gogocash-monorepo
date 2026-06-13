#!/usr/bin/env node
/**
 * Quick pointer to bundle / performance workflows.
 * @see docs/performance/RUNBOOK.md
 */
console.log(`Performance tooling:
  npm run build && npm run perf:baseline   — total .next/static/chunks size
  npm run analyze                        — Webpack bundle analyzer (ANALYZE=true)
  npm run perf:check-budget              — fail if chunks exceed scripts/perf-budget.json
  docs/performance/                      — SLOs, PR checklist, Lighthouse commands
`);
