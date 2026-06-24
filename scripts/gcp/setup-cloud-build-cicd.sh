#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gogocash-staging}"
PROJECT_NUMBER="${PROJECT_NUMBER:-729804769570}"
REGION="${REGION:-asia-southeast1}"
BUILD_REGION="${BUILD_REGION:-global}"
ARTIFACT_REPO="${ARTIFACT_REPO:-gogocash}"
REPO_OWNER="${REPO_OWNER:-mygogocash}"
REPO_NAME="${REPO_NAME:-gogocash-monorepo}"
REPOSITORY_RESOURCE="${REPOSITORY_RESOURCE:-}"
CB_SA_NAME="${CB_SA_NAME:-gogocash-cloud-build-deployer}"
RUNTIME_SERVICE_ACCOUNTS="${RUNTIME_SERVICE_ACCOUNTS:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

CB_SA_EMAIL="${CB_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CB_SA_RESOURCE="projects/${PROJECT_ID}/serviceAccounts/${CB_SA_EMAIL}"
CLOUDBUILD_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com"

run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  "$@"
}

ensure_project() {
  local described_number
  described_number="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  if [ "$described_number" != "$PROJECT_NUMBER" ]; then
    echo "PROJECT_NUMBER mismatch for ${PROJECT_ID}: expected ${PROJECT_NUMBER}, got ${described_number}" >&2
    exit 1
  fi
}

ensure_project_role() {
  local member="$1"
  local role="$2"
  run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "$member" \
    --role "$role" \
    --condition=None \
    --quiet >/dev/null
}

ensure_service_account_role() {
  local target_service_account="$1"
  local member="$2"
  local role="$3"
  run gcloud iam service-accounts add-iam-policy-binding "$target_service_account" \
    --project "$PROJECT_ID" \
    --member "$member" \
    --role "$role" \
    --quiet >/dev/null
}

ensure_trigger() {
  local name="$1"
  shift

  if gcloud builds triggers list \
    --project "$PROJECT_ID" \
    --region "$BUILD_REGION" \
    --filter "name=${name}" \
    --format='value(name)' | grep -qx "$name"; then
    echo "Cloud Build trigger ${name} already exists in ${BUILD_REGION}; skipping."
    return 0
  fi

  run "$@"
}

main() {
  ensure_project

  run gcloud services enable \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    --project "$PROJECT_ID"

  if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
    --project "$PROJECT_ID" \
    --location "$REGION" >/dev/null 2>&1; then
    run gcloud artifacts repositories create "$ARTIFACT_REPO" \
      --project "$PROJECT_ID" \
      --location "$REGION" \
      --repository-format docker \
      --description "GoGoCash staging Docker images"
  fi

  if ! gcloud iam service-accounts describe "$CB_SA_EMAIL" \
    --project "$PROJECT_ID" >/dev/null 2>&1; then
    run gcloud iam service-accounts create "$CB_SA_NAME" \
      --project "$PROJECT_ID" \
      --display-name "GoGoCash Cloud Build deployer"
  fi

  ensure_project_role "serviceAccount:${CB_SA_EMAIL}" roles/artifactregistry.writer
  ensure_project_role "serviceAccount:${CB_SA_EMAIL}" roles/logging.logWriter
  ensure_project_role "serviceAccount:${CB_SA_EMAIL}" roles/run.admin
  ensure_project_role "serviceAccount:${CB_SA_EMAIL}" roles/secretmanager.secretAccessor

  ensure_service_account_role "$CB_SA_EMAIL" \
    "serviceAccount:${CLOUDBUILD_SERVICE_AGENT}" \
    roles/iam.serviceAccountUser

  for runtime_sa in ${RUNTIME_SERVICE_ACCOUNTS//,/ }; do
    ensure_service_account_role "$runtime_sa" \
      "serviceAccount:${CB_SA_EMAIL}" \
      roles/iam.serviceAccountUser
    ensure_project_role "serviceAccount:${runtime_sa}" roles/artifactregistry.reader
    ensure_project_role "serviceAccount:${runtime_sa}" roles/secretmanager.secretAccessor
  done

  github_source_args=()
  if [ -n "$REPOSITORY_RESOURCE" ]; then
    github_source_args=(--repository "$REPOSITORY_RESOURCE")
  else
    github_source_args=(--repo-owner "$REPO_OWNER" --repo-name "$REPO_NAME")
  fi

  ensure_trigger gogocash-ci-pr \
    gcloud builds triggers create github \
      --project "$PROJECT_ID" \
      --region "$BUILD_REGION" \
      --name gogocash-ci-pr \
      "${github_source_args[@]}" \
      --pull-request-pattern '^main$' \
      --build-config cloudbuild/ci.yaml \
      --service-account "$CB_SA_RESOURCE" \
      --include-logs-with-status

  ensure_trigger gogocash-build-staging-main \
    gcloud builds triggers create github \
      --project "$PROJECT_ID" \
      --region "$BUILD_REGION" \
      --name gogocash-build-staging-main \
      "${github_source_args[@]}" \
      --branch-pattern '^main$' \
      --build-config cloudbuild/build-staging.yaml \
      --substitutions "_REGION=${REGION},_ARTIFACT_REPO=${ARTIFACT_REPO}" \
      --service-account "$CB_SA_RESOURCE" \
      --include-logs-with-status

  cat <<EOF

Cloud Build PR/build triggers are ready.

This project currently uses the legacy GitHub App trigger source. For staging
release and cleanup, run the Cloud Build configs directly with:

  gcloud builds submit --project ${PROJECT_ID} --config cloudbuild/deploy-staging.yaml --substitutions _APP=api,_REGION=${REGION},_ARTIFACT_REPO=${ARTIFACT_REPO},_IMAGE_TAG=staging-candidate .

  gcloud builds submit --project ${PROJECT_ID} --config cloudbuild/cleanup-accidental-cloudrun.yaml --substitutions _REGION=europe-west1,_SERVICE=gogocash-monorepo --no-source

If you later connect the repository through Cloud Build repository connections,
manual triggers can be added on top of these same config files.
EOF
}

main "$@"
