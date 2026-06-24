# GCP CI/CD Runbook

This is the replacement path for GitHub Actions. GitHub remains the source
repository, but Cloud Build owns CI, image builds, staging releases, and cleanup.

## Targets

Staging uses project `gogocash-staging` / project number `729804769570`.

Use the existing split Cloud Run services in `asia-southeast1`:

- `gogocash-api-staging`
- `gogocash-admin`
- `gogocash-app-web-staging`

Do not use the accidental Cloud Run source-deploy service:

- `europe-west1/gogocash-monorepo`

## Files

- `cloudbuild/ci.yaml` runs the monorepo CI gate with Node 22 and `npm@10.9.0`.
- `cloudbuild/build-staging.yaml` builds all staging service images and pushes both
  `$COMMIT_SHA` and `staging-candidate` tags to Artifact Registry.
- `cloudbuild/deploy-staging.yaml` deploys one selected service to Cloud Run and
  runs a post-deploy smoke check.
- `cloudbuild/cleanup-accidental-cloudrun.yaml` deletes the accidental
  `europe-west1/gogocash-monorepo` Cloud Run service.
- `scripts/gcp/setup-cloud-build-cicd.sh` enables APIs, creates IAM, creates
  Artifact Registry if needed, and creates supported Cloud Build triggers.

## One-Time Setup

Refresh local Google auth first:

```bash
gcloud auth login
gcloud config set project gogocash-staging
```

Connect the GitHub repository in Cloud Build. Prefer a Cloud Build repository
connection, then pass the repository resource to the setup script:

```bash
export REPOSITORY_RESOURCE="projects/gogocash-staging/locations/REGION/connections/CONNECTION/repositories/gogocash-monorepo"
```

If the repo is connected through the older GitHub App trigger flow, leave
`REPOSITORY_RESOURCE` unset and the script will use `mygogocash/gogocash-monorepo`.

Run setup:

```bash
PROJECT_ID=gogocash-staging \
PROJECT_NUMBER=729804769570 \
REGION=asia-southeast1 \
BUILD_REGION=global \
scripts/gcp/setup-cloud-build-cicd.sh
```

If `REPOSITORY_RESOURCE` uses a regional Cloud Build connection, set
`BUILD_REGION` to the connection region instead of `global`.

## Trigger Inventory

The setup script creates these triggers:

- `gogocash-ci-pr`: PR CI gate targeting `main`; PR builds run without a manual trigger comment.
- `gogocash-build-staging-main`: builds all staging images on pushes to `main`.

The current GCP connection uses the legacy GitHub App trigger source. With that
source type, deploy and cleanup are run as direct Cloud Build submissions from
this repo rather than repository-backed manual triggers. If the repo is later
connected through Cloud Build repository connections, manual triggers can be
created using the same `cloudbuild/deploy-staging.yaml` and
`cloudbuild/cleanup-accidental-cloudrun.yaml` configs.

## Manual Build And Release

Build the latest `main` images:

```bash
gcloud builds triggers run gogocash-build-staging-main \
  --project gogocash-staging \
  --region global \
  --branch main
```

Deploy API staging from the current `staging-candidate` tag:

```bash
gcloud builds submit \
  --project gogocash-staging \
  --config cloudbuild/deploy-staging.yaml \
  --substitutions _APP=api,_IMAGE_TAG=staging-candidate,_REGION=asia-southeast1,_ARTIFACT_REPO=gogocash
```

Deploy admin or customer web by changing `_APP`:

```bash
gcloud builds submit \
  --project gogocash-staging \
  --config cloudbuild/deploy-staging.yaml \
  --substitutions _APP=admin,_IMAGE_TAG=staging-candidate,_REGION=asia-southeast1,_ARTIFACT_REPO=gogocash
```

```bash
gcloud builds submit \
  --project gogocash-staging \
  --config cloudbuild/deploy-staging.yaml \
  --substitutions _APP=app-web,_IMAGE_TAG=staging-candidate,_REGION=asia-southeast1,_ARTIFACT_REPO=gogocash
```

Run these commands from the repo root so Cloud Build can upload the checked-out
config file.

## Cleanup Accidental Cloud Run Service

After setup, run:

```bash
gcloud builds submit \
  --project gogocash-staging \
  --config cloudbuild/cleanup-accidental-cloudrun.yaml \
  --substitutions _REGION=europe-west1,_SERVICE=gogocash-monorepo \
  --no-source
```

If a Cloud Build trigger was created by Cloud Run's console source-deploy flow,
delete that trigger from Cloud Build after confirming its name in the console or
with:

```bash
gcloud builds triggers list --project gogocash-staging --region global
```

## Retirement Criteria For GitHub Actions

Do not delete GitHub Actions workflows until these are true:

- `gogocash-ci-pr` passes on a PR.
- `gogocash-build-staging-main` builds all three images from `main`.
- `cloudbuild/deploy-staging.yaml` deploys `api` and the smoke check passes.
- Optional: deploy `admin` and `app-web` once to validate their Cloud Run services.
- Branch protection is updated to require Cloud Build checks instead of GitHub
  Actions checks.

After that, delete or archive `.github/workflows/*.yml` and remove the
GitHub Actions Dependabot entry.

## Production Follow-Up

Keep production separate from this staging cutover. Add production only after
staging has at least one successful CI/build/release cycle in Cloud Build.
For production, prefer immutable image SHA tags or image digests and consider
Cloud Deploy for approvals, promotion history, and rollback.

## References

- Cloud Build triggers: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Cloud Build to Cloud Run: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Cloud Build service accounts: https://docs.cloud.google.com/build/docs/cloud-build-service-account
- Cloud Build approvals: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- Artifact Registry IAM: https://docs.cloud.google.com/artifact-registry/docs/access-control
