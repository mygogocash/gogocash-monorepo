# GCP rollback and staging CI/CD runbook

## Current deployment topology

Railway is the day-to-day staging platform. A push to `staging` runs
`.github/workflows/ci-staging.yml`; the Railway GitHub integration then deploys
the changed API, Admin, and customer-web services.

| Staging surface | Primary host                        |
| --------------- | ----------------------------------- |
| API             | `https://api-staging.gogocash.co`   |
| Admin           | `https://admin-staging.gogocash.co` |
| Customer web    | `https://app-staging.gogocash.co`   |

GCP project `gogocash-staging` (`asia-southeast1`) is retained as an
operator-initiated rollback/cutover path. It is not triggered by a staging push.
The retained Cloud Run services are:

- `gogocash-api-staging`
- `gogocash-admin`
- `gogocash-app-web-staging`

Do not use the accidental source-deploy service
`europe-west1/gogocash-monorepo`.

## Manual exact-SHA GCP build

Run `.github/workflows/build-staging.yml` from the GitHub Actions UI, select the
reviewed default branch `main`, and choose `api`, `admin`, `app-web`, or `all`.
The upstream preflight rejects feature branches before CI or any image build.

The workflow:

1. invokes the reusable repository CI workflow;
2. requires that CI invocation to succeed;
3. builds every explicitly selected service independent of path-filter output;
4. validates that `github.sha` is a full lowercase 40-character commit SHA;
5. pushes the image with that SHA tag; and
6. reports the exact image reference and digest in the workflow summary.

The build also updates `staging-candidate` as an operator convenience. That
moving pointer is never accepted by the release workflow.

The reusable GCP job runs in the GitHub Environment `staging` and reads only the
named WIF variables `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, and
`GCP_SERVICE_ACCOUNT`. The app-web prebuild reads its `EXPO_PUBLIC_*` values
from the same environment. No secret values belong in the workflow or this
runbook.

## Manual exact-SHA GCP release

After a successful build, run `.github/workflows/release-staging.yml` from the
reviewed default branch `main` and:

1. choose `api`, `admin`, `app-web`, or `all`; and
2. paste the exact 40-character SHA reported by the build summary; and
3. paste an `image_digests` JSON object containing exactly the selected build
   digest(s) by copying the build summary's canonical one-line map exactly. For
   example, an API-only release uses
   `{"api":"sha256:<64 lowercase hex characters>"}`; an `all` release uses
   ordered `api`, `admin`, and `app-web` keys. Whitespace, escaped keys,
   duplicate/reordered/extra/missing keys, and non-lowercase digests are
   rejected before parsing or deployment.

For every selected service, the reusable release job:

- rejects a feature-branch dispatch before any deploy-capable job;
- rejects a short SHA or a moving tag;
- rejects missing, malformed, extra, or unselected digest-map entries;
- verifies that the SHA-tagged Artifact Registry image exists;
- requires the tag's current registry digest to equal the build-reported
  digest supplied by the operator;
- deploys that exact digest to Cloud Run; and
- requires a 2xx/3xx health response from the new service revision.

The API smoke uses `/health`. Admin and customer web use `/`; Admin's normal
unauthenticated redirect is accepted as a healthy 3xx.

API Secret Manager references stay name-only in `release-staging.yml`.
`INVOLVE_AI_API_KEY` remains intentionally omitted because no approved Secret
Manager secret name exists for that caller; the guarded route remains
fail-closed.

## Native EAS staging packet (scaffold)

`.github/workflows/deploy-app-native-eas.yml` remains labelled **scaffold**
until a new post-patch build, staging OTA, and physical-device acceptance all
succeed.

The reusable/manual workflow is intentionally limited to:

- dispatch ref `refs/heads/staging`;
- GitHub Environment `staging`;
- EAS server environment `preview` (required by Expo SDK 57 updates);
- EAS build profile `preview`;
- EAS Update channel `staging`;
- staging API and customer-web URLs; and
- manual `build` or `update`, or a caller `update` (there is no submit or
  production target). Every update requires the exact successful
  `OTA-safe runtime payload` job from its selected `ci-staging.yml` run.

Before calling EAS, it queries GitHub's Actions run and jobs APIs. Manual
dispatch discovers (or accepts an operator-supplied ID for) a completed,
successful `ci-staging.yml` push run on the exact staging branch and commit.
The automatic path is a reusable call from the same in-progress
`ci-staging.yml` run after its app CI job succeeds. Both paths fetch all Actions
API pages and require exactly one successful aggregate gate and exactly one
successful `CI gate / app (@gogocash/mobile)` job from the same exact run ID,
attempt, push event, staging branch, and SHA. A skipped app job, checkbox,
suffix lookalike, duplicate, incomplete page, different SHA/branch/run, or older
workflow cannot bypass the proof.

The automatic path is narrower than the app CI path. It publishes only when an
Expo runtime bundle/asset changed and no native-sensitive path changed.
Dependency locks, Expo/app/EAS config, native modules/plugins, platform service
files, and native icon/splash assets suppress OTA and produce a `native build
required` handoff. The exact successful staging run can then be used for an
explicit `workflow_dispatch` build; older binaries never receive a bundle whose
native compatibility surface changed. Manual OTA cannot bypass this decision:
the exact selected CI run must contain one successful `OTA-safe runtime payload`
job with the same run attempt and SHA.

The caller is non-canceling, and every automatic/manual staging EAS build or
update shares one literal non-canceling deployment queue. Once the job owns the
queue and has installed dependencies, it rechecks that the selected commit is
still the current staging branch head before any provider mutation. This lets a
pending stale run fail before publishing while preventing an in-flight EAS
write from being canceled, overlapped, or followed by an older commit.

Provider JSON is also fail-closed. Build results must cover every selected
platform, be terminal-successful, bind to the exact dispatched commit,
`preview` profile, `staging` channel, and internal distribution, and contain
newline-free IDs plus credential-free HTTPS artifact URLs before the Android
URL reaches `GITHUB_ENV`. The expected project ID is validated, while account
and slug metadata are sanitized before constructing canonical Expo
build-details links. The summary records Android and iOS build IDs, links, and
runtime versions. Before
publishing an OTA, the workflow requires the active `staging` channel to map to
exactly the `staging` branch, then publishes directly to that branch with
`--environment preview`. Its results must contain exactly one Android and one
iOS record for the exact commit and branch, with unique update IDs, one shared
group, one shared runtime version, and credential-free HTTPS manifest links.
Those values form the update proof in the summary.

Before either build or update, GitHub writes the canonical Firebase values to an
ephemeral mode-0600 runner file. An authenticated `eas env:exec preview` proof
clears local release variables, loads the remote environment, compares its four
Firebase values to that independent file, and verifies the fixed EAS project,
staging API, app mode, backend data source, and staging frontend. Missing, blank,
or mismatched values stop before provider mutation and are never printed; an
exit trap removes the file.

Required repository/environment configuration:

- repository secret `EXPO_TOKEN`;
- all four staging `EXPO_PUBLIC_FIREBASE_*` secrets listed in
  `docs/firebase-native-eas.md`; missing or blank values fail before any EAS
  build/update and values are never printed;
- any configured staging native OAuth, PostHog, and Sentry `EXPO_PUBLIC_*`
  secrets used by the app;
- EAS credentials already configured for a native build; and
- for optional Android artifact archiving, `GCP_EAS_ARTIFACT_BUCKET` plus the
  staging WIF variables.

## Artifact Registry cleanup policy (operator-only)

The reviewed policy file is
`scripts/gcp/artifact-registry-cleanup-policy.json`. It has three independent
rules:

- always keep images carrying `staging-candidate` or `latest`;
- keep at least the 10 most recent versions of every image; and
- make versions older than 7 days eligible for deletion.

Artifact Registry keep rules override a matching delete rule. The seven-day
age condition is a short inspection/rollback window; the 10-version keep rule
prevents a quiet service from losing its rollback floor and bounds high-volume
repositories much more tightly than a 30-day window.

Repository validation does not apply the policy. The following commands are
**operator-only external mutations** and were not run as part of this change.

First, an authorized operator may install the policy in dry-run mode:

```bash
gcloud artifacts repositories set-cleanup-policies gogocash \
  --project=gogocash-staging \
  --location=asia-southeast1 \
  --policy=scripts/gcp/artifact-registry-cleanup-policy.json \
  --dry-run
```

Wait at least one cleanup cycle (approximately one day), enable/review Artifact
Registry Data Write audit logs, and confirm the candidate deletions preserve
the pointer tags and rollback floor. Only after explicit owner approval may an
authorized operator activate deletion:

```bash
gcloud artifacts repositories set-cleanup-policies gogocash \
  --project=gogocash-staging \
  --location=asia-southeast1 \
  --policy=scripts/gcp/artifact-registry-cleanup-policy.json \
  --no-dry-run
```

See Google's current
[cleanup-policy format](https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy)
and
[`set-cleanup-policies` reference](https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/set-cleanup-policies)
before operator execution.

## PR-B retirement (#52) — completed in repo

The one-shot legacy workflows are deleted:

- ~~`.github/workflows/deploy-api-staging.yml`~~
- ~~`.github/workflows/deploy-admin-staging.yml`~~
- ~~`.github/workflows/deploy-app-web-staging.yml`~~

Day-to-day staging is Railway (`ci-staging.yml`). GCP rollback remains
`build-staging.yml` + `release-staging.yml` only.

**Post-merge operator cleanup (still required to close #52):**

1. Verify the three deleted workflows are absent from
   `gh workflow list --all --repo mygogocash/gogocash-monorepo`.
2. Inventory both scopes with `gh variable list --repo
mygogocash/gogocash-monorepo` and `gh variable list --env staging --repo
mygogocash/gogocash-monorepo`.
3. Delete only the repository-level `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, and
   `GCP_SERVICE_ACCOUNT` variables. Preserve the same three variables in the
   `staging` Environment because the retained build/release path uses them.
4. Optionally dispatch `build-staging.yml` then `release-staging.yml` from
   `main` to re-prove the retained GCP rollback path.

EAS build, OTA, and physical-device acceptance remains an independent #35 gate.

Cloud Build configs under `cloudbuild/` remain repository artifacts, but they
are not the primary Railway staging path and are not covered by this exact-SHA
GitHub workflow hardening. Do not treat their presence as acceptance evidence.

## Repository-only verification

These commands are safe before any live dispatch:

```bash
npm run test:workflow-contracts

find .github/workflows -maxdepth 1 -type f \
  \( -name '*.yml' -o -name '*.yaml' \) -print0 | \
  xargs -0 docker run --rm \
    -v "$PWD:/repo" -w /repo \
    rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 \
    -color

cd apps/app
npx expo config --json >/tmp/gogocash-expo-config.json
```

They validate repository structure and Expo configuration only. They do not
push an image, deploy Cloud Run, publish an OTA, run an EAS build, change a
secret, or modify an Artifact Registry policy.
