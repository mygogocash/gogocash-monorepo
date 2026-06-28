# GitHub Actions — monorepo CI

GitHub only reads workflows from this directory (`.github/workflows/` at the
repo root). The CI/deploy files still nested under `apps/api/.github/` are
**inert** — GitHub never runs them. This root workflow set replaces them for
build/test. (The landing site is a separate repo, not in this monorepo.)

## What runs

`ci.yml` — runs on pull requests targeting `main`, `dev`, `staging`, or
`production`, and on pushes to `main` and `dev`.

Promotion flow: **main → dev → staging → production** (merge PRs between branches,
one step at a time). `production` is **locked** in branch protection until the
Railway/GCP cutover is deliberate.

A `changes` job (using `dorny/paths-filter`) detects which app changed, then
gates each app's job. A change confined to `apps/<X>/**` runs only `<X>`'s
job; a change to shared root config (`package.json`, `package-lock.json`,
`turbo.json`, `.nvmrc`, `.npmrc`, `ci.yml`) fans out to every app.

Every job uses `actions/setup-node@v6` on **Node 22** and installs with a bare
`npm ci` at the repo root (the root `.npmrc` already sets
`legacy-peer-deps=true`).

| App | Workspace / package | Jobs | Gate |
|-----|---------------------|------|------|
| admin | `gogocash-admin` | lint (informational) · test · build | **test + build are gates**; lint stays informational (~54 react-hooks/compiler warnings — tracked in #45) |
| app (mobile) | `@gogocash/mobile` | typecheck · unit · render · web export | **all four are gates** (P2-CI) |
| api | `gogocash-api` | **lint** | **gate** |
| api | `gogocash-api` | **unit tests** | **gate** |
| api | `gogocash-api` | **build + boot smoke + integration** | **required** — `nest build`, boots vs ephemeral Mongo, then runs the `checkWithdraw`↔Mongo integration test (`test/withdraw-balance.e2e-spec.ts`) |
Notes:
- **app (`@gogocash/mobile`)** has no `build` script — Expo apps export via EAS,
  not a CI build. Its gates are `typecheck` + the unit and render suites + the
  web export. It has no `lint` script, so lint is omitted (not invented).
- **admin test + app typecheck/unit/render are gates** (P2-CI — all verified
  green). Admin **lint** stays informational: ~54 React-Compiler / react-hooks
  warnings-as-errors (`setState-in-effect`, `refs-during-render`) are real
  pre-existing component debt — see #45. Drop its `continue-on-error` after that
  cleanup.
- **api lint + unit tests are gates.**
- **api build + boot smoke + integration is the required gate.** It runs
  `nest build` (type-check), boots `node dist/main` against an ephemeral Mongo
  service probing `/` (catches DI/bootstrap crashes), then runs the
  `checkWithdraw`↔Mongo integration test (covers the mongoose-9 aggregation
  risk the mock-based unit specs can't). Dummy env values only
  (`RESEND_API_KEY=re_ci_smoke_dummy`, `MONGO_URI`/`JWT_SECRET`/
  `JWT_ADMIN_SECRET`/`FIREBASE_PROJECT_ID` dummies); the smoke test never sends
  email.
- There is **no aggregator job** — the `ci-gate` aggregator was removed. The
  per-app jobs run directly; nothing requires them yet (no branch protection on
  this free-plan repo, see below).

### Branch protection

| Branch | Status |
|--------|--------|
| **`production`** | **Locked** — no pushes or merges until unlocked in repo Settings → Branches |
| `main`, `dev`, `staging` | Open (add PR + required CI checks when ready) |

Dependabot opens PRs against **`main`**; promote dependency bumps down the chain
with the same PR flow as feature work.

> ⚠️ Separately, GitHub Actions is currently **blocked org-wide by a billing /
> spending-limit issue** (jobs fail at "Set up job" with 0 steps). Resolve it in
> **Org → Settings → Billing & plans**; the workflows themselves are healthy.

## Staging CD — auto build, manual release

Staging deploys use an **auto-build + approval-gate** split (a real-money
platform: builds are automatic, releases are a deliberate human action). All
three Cloud Run lanes share two **reusable** workflows so the deploy logic lives
in one place.

| Workflow | Trigger | Does |
|----------|---------|------|
| **`build-staging.yml`** | push to `staging` + manual (`workflow_dispatch`) | reuses `ci.yml` as the gate, then builds + pushes a `:staging-candidate` image for each **changed** app (path-filtered). **No deploy.** |
| **`release-staging.yml`** | manual `workflow_dispatch` (pick app + tag) | deploys the chosen candidate image to Cloud Run, then **health-smokes** the new revision. API releases smoke `/gototrack/merchants` so stale deployments without the GoGoTrack module fail before device acceptance. The dispatch **is** the approval. |
| `_build-push.yml` | `workflow_call` | reusable: WIF auth → optional prebuild → docker build → push `:sha` + `:staging-candidate`. |
| `_deploy-cloudrun.yml` | `workflow_call` | reusable: WIF auth → `gcloud run deploy` a given tag → post-deploy `curl` health check. |

Both reusables run in the **`staging` GitHub Environment** (holds the `GCP_*` WIF
vars; GCP Secret-Manager secrets stay in GCP via `--set-secrets`).

**Approval gate:** GitHub Environment required-reviewer protection needs a paid
plan for private repos (see #44). Until then the approval is the manual
`release-staging` dispatch. Once on Pro/public, add required-reviewers to the
`staging` environment and the release pauses for one-click approval (no workflow
change needed).

**Native app** (`deploy-app-native-eas.yml`) stays manual for build/update/submit
(needs `EXPO_TOKEN`). Android `build` runs wait for EAS to finish, download the
completed archive, and upload it as a GitHub artifact so device QA can install
the dev client without local EAS auth. If the `GCP_EAS_ARTIFACT_BUCKET` Actions
variable is set, the same APK and SHA-256 sidecar are also archived to
`gs://$GCP_EAS_ARTIFACT_BUCKET/eas/android/<profile>/<run-id>/` using the
existing `GCP_WIF_PROVIDER` and `GCP_SERVICE_ACCOUNT` workload identity setup.

> The legacy `deploy-{api,admin,app-web}-staging.yml` lanes are kept as a manual
> fallback during cutover; delete them once `build-staging` + `release-staging`
> are verified on a real merge.
