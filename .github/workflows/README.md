# GitHub Actions — monorepo CI/CD

GitHub only reads workflows from **`.github/workflows/`** at the repo root. Files under `apps/api/.github/workflows/` are **inert** (see `apps/api/.github/README.md`).

## Architecture

```text
PR / push main|dev  ──►  ci.yml  (path-filtered lint/test/build)
push staging        ──►  ci-staging.yml  ──►  ci.yml (gate)
                              │
                              └──► Railway auto-deploy (API, admin, mobile web)

Manual / rollback   ──►  build-staging.yml  ──►  release-staging.yml  (GCP Cloud Run)
Health checks       ──►  staging-smoke.yml  (Railway URLs, optional Involve postback)
Native / OTA        ──►  deploy-app-native-eas.yml, app-ota-staging.yml  (manual)
Security            ──►  codeql.yml, dependabot.yml
E2E (non-gating)    ──►  e2e-weekly.yml, ci.yml → e2e-local (dispatch)
```

**Promotion flow:** `main → dev → staging → production` (merge PRs one step at a time).

---

## What runs when

| Trigger | Workflow | Purpose |
|---------|----------|---------|
| PR → `main`, `dev`, `staging`, `production` | `ci.yml` | Path-filtered gates per app |
| Push → `main`, `dev` | `ci.yml` | Same |
| Push → `staging` | `ci-staging.yml` | CI gate before Railway deploy |
| Manual | `staging-smoke.yml` | HTTP smoke on Railway staging |
| Manual | `build-staging.yml` | Build GCP `:staging-candidate` images (rollback) |
| Manual | `release-staging.yml` | Deploy GCP image to Cloud Run |
| Weekly Mon 04:00 UTC | `e2e-weekly.yml` | Optional API e2e (non-gating) |
| Weekly Sun 01:30 UTC | `codeql.yml` | SAST |
| Weekly Mon | Dependabot | npm + actions bumps → `main` |

---

## CI gates (`ci.yml`)

Uses `dorny/paths-filter`: changes under `apps/<app>/**` run only that app’s jobs; root config changes fan out to all apps.

Shared setup: **`.github/actions/setup-node-monorepo`** (Node 24 LTS, `npm ci`).

| Job | When | Gate? |
|-----|------|-------|
| `admin` | `apps/admin/**` | typecheck + test + build **yes**; lint informational (#45) |
| `app` | `apps/app/**` | typecheck, unit, render, web export **yes** |
| `api-lint` | `apps/api/**` | **yes** |
| `api-test` | `apps/api/**` | **yes** (includes Involve postback integration specs) |
| `api-build-smoke` | `apps/api/**` | **required** — native `tsc --noEmit` + swc build, boot vs Mongo **8.0.4**, withdraw integration |
| `gototrack` | api or app | **yes** — `test:gototrack` / `test:gototrack:api` |
| `gototrack-mcp` | `packages/gototrack-mcp/**` | **yes** — typecheck + build + `node --test` |
| `knip` | apps/scripts/root | **yes** (path-filtered) |
| `e2e-local` | manual dispatch only | optional |

### Branch protection (recommended)

When org billing allows, require on **`staging`** (and `dev`):

- `api build + boot smoke (required)`
- `api lint`
- `api unit tests`
- `app (@gogocash/mobile)`
- `admin (gogocash-admin)`
- `gototrack tests` (when applicable)

`production` stays locked until deliberate cutover.

---

## Staging deploy — Railway (primary)

| Service | Railway name | URL |
|---------|--------------|-----|
| API | `gogocash-api` | `https://api-staging.gogocash.co` |
| Admin | `gogocash-admin` | `https://admin-staging.gogocash.co` |
| Customer web | `@gogocash/mobile` | `https://app-staging.gogocash.co` |

Merge to **`staging`** → `ci-staging.yml` must pass → Railway GitHub integration deploys changed services.

Config-as-code: `apps/*/railway.json` (e.g. `sleepApplication: false` on mobile web).

### Post-deploy smoke

Run **`staging-smoke.yml`** after merges or on schedule. Optional repo secret:

- `INVOLVE_POSTBACK_TEST_TOKEN` — must match Railway `INVOLVE_POSTBACK_SECRET` (not `INVOLVE_SECRET`).

---

## Staging deploy — GCP Cloud Run (rollback / legacy)

Use when Railway is unavailable or during production migration.

1. **`build-staging.yml`** (manual) — builds `:staging-candidate` to Artifact Registry  
2. **`release-staging.yml`** (manual) — deploys chosen tag + health smoke  

Legacy one-shot workflows (same behavior, duplicated logic):

- `deploy-api-staging.yml` — ⚠️ **paused / known-broken** (2026-07-10): the
  Secret Manager secrets `gogocash-staging-r2-access-key-id` and
  `gogocash-staging-r2-secret-access-key` were never created, so every run
  fails at Cloud Run revision creation. Live staging is Railway and is NOT
  affected. Revival steps are in the workflow's header comment.
- `deploy-admin-staging.yml`
- `deploy-app-web-staging.yml`

Prefer `build-staging` + `release-staging` once verified.

WIF vars live in GitHub Environment **`staging`**: `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`.

---

## Native app (EAS)

| Workflow | Trigger | Notes |
|----------|---------|-------|
| `deploy-app-native-eas.yml` | manual | Needs `EXPO_TOKEN`; optional `wait_for_ci` input |
| `app-ota-staging.yml` | manual | OTA to staging channel |

Run EAS **after** CI is green on the target SHA (check Actions tab or enable `wait_for_ci`).

---

## Security

| Control | Location |
|---------|----------|
| Pinned action SHAs | All workflows |
| `permissions: contents: read` default | CI workflows |
| `id-token: write` | GCP deploy / build only |
| CodeQL | `codeql.yml` — skips docs-only paths |
| Dependabot | `.github/dependabot.yml` — weekly npm + actions |

See **`docs/github-actions-environments.md`** for secrets/vars matrix (GitHub ↔ Railway ↔ GCP).

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Jobs fail at “Set up job”, 0 steps | Org Actions billing / spending limit |
| Staging deploy but CI didn’t run | Push bypassed branch protection; check `ci-staging` |
| Involve postback 401 on staging | `INVOLVE_POSTBACK_SECRET` missing on Railway API |
| Mobile web “Sleeping” | Railway `sleepApplication: true` — set false in `apps/app/railway.json` |
| GCP deploy works but Railway is live | Expected — GCP is rollback path only |

---

## Maestro (scaffold)

`maestro-smoke.yml` documents local/self-hosted Maestro runs. Default GitHub-hosted runners do not include Maestro or Android emulators — use a self-hosted runner or Maestro Cloud when ready.
