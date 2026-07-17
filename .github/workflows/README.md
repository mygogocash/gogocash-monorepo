# GitHub Actions — monorepo CI/CD

GitHub only reads workflows from **`.github/workflows/`** at the repo root. Files under `apps/api/.github/workflows/` are **inert** (see `apps/api/.github/README.md`).

## Architecture

```text
PR / push main|dev  ──►  ci.yml  (path-filtered lint/test/build)
push staging        ──►  ci-staging.yml  ──►  ci.yml (gate)
                              ├──► Railway auto-deploy (API, admin, mobile web)
                              └──► deploy-app-native-eas.yml (app OTA, after app gate)

Manual / rollback   ──►  build-staging.yml  ──►  release-staging.yml  (GCP Cloud Run)
Health checks       ──►  staging-smoke.yml  (Railway URLs, optional Involve postback)
Native build / OTA  ──►  deploy-app-native-eas.yml  (manual build/update + gated OTA call)
Security            ──►  codeql.yml, dependabot.yml
E2E (non-gating)    ──►  e2e-weekly.yml, ci.yml → e2e-local (dispatch)
```

**Promotion flow:** `main → dev → staging → production` (merge PRs one step at a time).

---

## What runs when

| Trigger                                     | Workflow              | Purpose                                                                 |
| ------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| PR → `main`, `dev`, `staging`, `production` | `ci.yml`              | Path-filtered gates per app                                             |
| Push → `main`, `dev`                        | `ci.yml`              | Same                                                                    |
| Push → `staging`                            | `ci-staging.yml`      | CI gate; OTA-safe runtime changes publish only after the app gate       |
| Manual                                      | `staging-smoke.yml`   | HTTP smoke on Railway staging                                           |
| Manual from `main`                          | `build-staging.yml`   | CI-gated GCP rollback images tagged with the exact source SHA           |
| Manual from `main`                          | `release-staging.yml` | Deploy exact SHA tags only when they still match build-reported digests |
| Weekly Mon 04:00 UTC                        | `e2e-weekly.yml`      | Optional API e2e (non-gating)                                           |
| Weekly Sun 01:30 UTC                        | `codeql.yml`          | SAST                                                                    |
| Weekly Mon                                  | Dependabot            | npm + actions bumps → `main`                                            |

---

## CI gates (`ci.yml`)

Uses `dorny/paths-filter`: changes under `apps/<app>/**` run only that app’s jobs; root config changes fan out to all apps.

Shared setup: **`.github/actions/setup-node-monorepo`** (Node 24 LTS, `npm ci`).

| Job               | When                        | Gate?                                                                                           |
| ----------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `admin`           | `apps/admin/**`             | typecheck + lint + test + build **yes**                                                         |
| `app`             | `apps/app/**`               | typecheck, unit, render, web export **yes**                                                     |
| `api-lint`        | `apps/api/**`               | **yes**                                                                                         |
| `api-test`        | `apps/api/**`               | **yes** (includes Involve postback integration specs)                                           |
| `api-build-smoke` | `apps/api/**`               | **required** — native `tsc --noEmit` + swc build, boot vs Mongo **8.0.4**, withdraw integration |
| `gototrack`       | api or app                  | **yes** — `test:gototrack` / `test:gototrack:api`                                               |
| `gototrack-mcp`   | `packages/gototrack-mcp/**` | **yes** — typecheck + build + `node --test`                                                     |
| `knip`            | apps/scripts/root           | **yes** (path-filtered)                                                                         |
| `e2e-local`       | manual dispatch only        | optional                                                                                        |

### Branch protection (recommended)

When org billing allows, require the stable aggregate check **`CI gate (required)`**
on **`main`**, `staging`, and `dev`. It rejects failed/cancelled/missing selected jobs while
allowing only legitimate path-filter skips.

`production` stays locked until deliberate cutover.

---

## Staging deploy — Railway (primary)

| Service      | Railway name       | URL                                 |
| ------------ | ------------------ | ----------------------------------- |
| API          | `gogocash-api`     | `https://api-staging.gogocash.co`   |
| Admin        | `gogocash-admin`   | `https://admin-staging.gogocash.co` |
| Customer web | `@gogocash/mobile` | `https://app-staging.gogocash.co`   |

Merge to **`staging`** → `ci-staging.yml` must pass → Railway GitHub integration deploys changed services.

Config-as-code: `apps/*/railway.json` (e.g. `sleepApplication: false` on mobile web).

### Post-deploy smoke

Run **`staging-smoke.yml`** after merges or on schedule. Optional repo secret:

- `INVOLVE_POSTBACK_TEST_TOKEN` — must match Railway `INVOLVE_POSTBACK_SECRET` (not `INVOLVE_SECRET`).

---

## Staging deploy — GCP Cloud Run (rollback / legacy)

Use when Railway is unavailable or during production migration.

1. **`build-staging.yml`** (manual from `main`) — choose `api`, `admin`,
   `app-web`, or `all`; a preflight rejects any other ref before CI or builds.
   The reusable CI gate must succeed, then every selected image is pushed with
   the full 40-character source SHA. `staging-candidate` is only a convenience
   pointer. The final job emits a canonical, one-line `api` / `admin` /
   `app-web` digest map that can be copied directly into the release input.
2. **`release-staging.yml`** (manual from `main`) — provide that exact SHA, the
   canonical digest-map line from the selected build, and the service(s). The
   preflight rejects whitespace, escapes, duplicate/reordered/extra/missing
   keys, malformed digests, or any other ref before deploy jobs. Each selected
   SHA tag must still resolve to the supplied build-reported digest; only that
   digest is deployed and health-checked.

Legacy one-shot workflows (same behavior, duplicated logic):

- `deploy-api-staging.yml` — ⚠️ **paused / known-broken** (2026-07-10): the
  Secret Manager secrets `gogocash-staging-r2-access-key-id` and
  `gogocash-staging-r2-secret-access-key` were never created, so every run
  fails at Cloud Run revision creation. Live staging is Railway and is NOT
  affected. Revival steps are in the workflow's header comment.
- `deploy-admin-staging.yml`
- `deploy-app-web-staging.yml`

Prefer `build-staging` + `release-staging` after their new post-patch live proof.
The three one-shot workflows remain present for now. Their deletion is a
separate PR-B, blocked until an authorized build/release/rollback proof succeeds;
do not delete them based on repository-only validation.

WIF vars live in GitHub Environment **`staging`**: `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`.

---

## Native app (EAS)

| Workflow                    | Trigger                                                                  | Notes                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-app-native-eas.yml` | manual build/OTA from `staging`; reusable OTA call from `ci-staging.yml` | **Scaffold**; needs `EXPO_TOKEN`; exact CI/SHA proof is mandatory; OTA additionally requires the exact successful OTA-safety job |

`deploy-app-native-eas.yml` has no checkbox override and no production/submit
target. Manual dispatch resolves a completed successful `ci-staging.yml` push
run for the exact staging SHA. A manual OTA additionally requires exactly one
successful `OTA-safe runtime payload` job from that run, so an operator cannot
bypass the native-safety filter. The automatic app-only path passes its current
caller run ID after both the reusable app CI gate and that OTA-safety job
succeed; the called workflow
fetches every Actions API page and requires exactly one aggregate gate plus
exactly one successful `CI gate / app (@gogocash/mobile)` from that same run,
attempt, branch, event, and SHA. Automatic OTA additionally requires an
`app_ota_payload` change and rejects any `app_ota_unsafe` change. Dependency
locks, Expo/app/EAS config, native modules/plugins, platform files, Firebase
service files, and native icon/splash assets are unsafe; the caller emits a
`native build required` handoff instead of publishing to older binaries. The old
parallel `app-ota-staging.yml` write path is removed. Keep the scaffold label
until a new workflow build, OTA, and physical-device acceptance all succeed from
the patched staging SHA. EAS provider JSON is validated before IDs or URLs reach
the environment/summary.
The build proof binds every selected platform to the exact commit, `preview`
profile, `staging` channel, internal distribution, and runtime. The SDK 57 OTA
uses EAS environment `preview`; before publishing it requires the active
`staging` channel to map only to the `staging` branch. Its proof requires exactly
one Android and one iOS update sharing one group/runtime and records the IDs,
branch, channel, runtime, platforms, and exact commit.
Before either a native build or OTA starts, GitHub writes its canonical Firebase
values to an ephemeral mode-0600 runner file. `eas env:exec preview` then verifies
that the remote environment's four Firebase values match that independent file
and that its effective project/API/app/frontend identity is fixed to staging.
An exit trap deletes the file. The repository workflow-contract job also validates
`apps/app/.eas/workflows/*.yml` against the pinned EAS CLI/schema whenever those
files change.

`ci-staging.yml` and the EAS workflow are non-canceling once a run can reach a
provider write. Every automatic or manual staging EAS action shares the literal
`gogocash-eas-staging-deployment-queue`; after acquiring it, the validator also
requires the selected SHA to remain the current staging branch head. This
serializes writes and rejects a slower stale run before mutation. Missing,
blank, or mismatched staging Firebase values fail before any EAS build/update
command; their values are never written to logs or summaries.

## Artifact Registry cleanup policy (operator-only)

[`scripts/gcp/artifact-registry-cleanup-policy.json`](../../scripts/gcp/artifact-registry-cleanup-policy.json)
protects the `staging-candidate` and `latest` pointers, retains at least the 10
most recent versions of every image, and makes versions older than 7 days
eligible for deletion. Keep rules override the delete rule. The seven-day
window gives operators time to inspect a new image while the 10-version rule
preserves a rollback floor even during quiet periods.

Repository changes do **not** apply this policy. An authorized operator must
first run it in dry-run mode and review the resulting audit logs for at least
one cleanup cycle. The exact dry-run and eventual apply commands are in
[`docs/gcp-cicd.md`](../../docs/gcp-cicd.md).

---

## Security

| Control                               | Location                                               |
| ------------------------------------- | ------------------------------------------------------ |
| Pinned action SHAs                    | All workflows                                          |
| `permissions: contents: read` default | CI workflows                                           |
| `id-token: write`                     | GCP build/release and optional EAS Android GCS archive |
| CodeQL                                | `codeql.yml` — skips docs-only paths                   |
| Dependabot                            | `.github/dependabot.yml` — weekly npm + actions        |

See **`docs/github-actions-environments.md`** for secrets/vars matrix (GitHub ↔ Railway ↔ GCP).

---

## Troubleshooting

| Symptom                              | Likely cause                                                            |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Jobs fail at “Set up job”, 0 steps   | Org Actions billing / spending limit                                    |
| Staging deploy but CI didn’t run     | Push bypassed branch protection; check `ci-staging`                     |
| Involve postback 401 on staging      | `INVOLVE_POSTBACK_SECRET` missing on Railway API                        |
| Mobile web “Sleeping”                | Railway `sleepApplication: true` — set false in `apps/app/railway.json` |
| GCP deploy works but Railway is live | Expected — GCP is rollback path only                                    |

---

## Maestro (scaffold)

`maestro-smoke.yml` documents local/self-hosted Maestro runs. Default GitHub-hosted runners do not include Maestro or Android emulators — use a self-hosted runner or Maestro Cloud when ready.
