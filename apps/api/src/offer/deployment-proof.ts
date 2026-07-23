import { ServiceUnavailableException } from '@nestjs/common';

export const DEPLOYMENT_REVISION_SCHEMA =
  'gogocash.deployment-revision.v1' as const;

const ALLOWED_ENVIRONMENTS = new Set(['dev', 'staging']);
const FULL_GIT_REVISION = /^[0-9a-f]{40}$/;

export function resolveDeploymentProof(
  environment: NodeJS.ProcessEnv = process.env,
) {
  // This endpoint is a Railway deployment attestation, not a generic build
  // metadata echo. Accept only Railway's runtime-injected pair so a copied
  // COMMIT_SHA/APP_ENV cannot fabricate deploy proof in another runtime.
  const deploymentEnvironment = environment.RAILWAY_ENVIRONMENT_NAME?.trim();
  const revision = environment.RAILWAY_GIT_COMMIT_SHA?.trim().toLowerCase();
  if (
    !deploymentEnvironment ||
    !ALLOWED_ENVIRONMENTS.has(deploymentEnvironment) ||
    !revision ||
    !FULL_GIT_REVISION.test(revision)
  ) {
    throw new ServiceUnavailableException('Deployment proof is unavailable');
  }
  return {
    schema: DEPLOYMENT_REVISION_SCHEMA,
    environment: deploymentEnvironment,
    revision,
  };
}
