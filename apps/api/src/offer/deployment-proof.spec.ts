import {
  DEPLOYMENT_REVISION_SCHEMA,
  resolveDeploymentProof,
} from './deployment-proof';

describe('resolveDeploymentProof', () => {
  it.each(['dev', 'staging'])(
    'returns the exact Railway %s environment and full deployed revision',
    (environment) => {
      expect(
        resolveDeploymentProof({
          RAILWAY_ENVIRONMENT_NAME: environment,
          RAILWAY_GIT_COMMIT_SHA: 'A'.repeat(40),
        }),
      ).toEqual({
        schema: DEPLOYMENT_REVISION_SCHEMA,
        environment,
        revision: 'a'.repeat(40),
      });
    },
  );

  it.each([
    ['missing revision', { RAILWAY_ENVIRONMENT_NAME: 'dev' }],
    ['missing environment', { RAILWAY_GIT_COMMIT_SHA: 'a'.repeat(40) }],
    [
      'generic fallback pair only',
      { APP_ENV: 'dev', COMMIT_SHA: 'a'.repeat(40) },
    ],
    [
      'alternate generic fallback pair only',
      { GOGOCASH_ENV: 'staging', GIT_COMMIT_SHA: 'a'.repeat(40) },
    ],
    [
      'short revision',
      {
        RAILWAY_ENVIRONMENT_NAME: 'dev',
        RAILWAY_GIT_COMMIT_SHA: 'abc123',
      },
    ],
    [
      'production environment',
      {
        RAILWAY_ENVIRONMENT_NAME: 'production',
        RAILWAY_GIT_COMMIT_SHA: 'a'.repeat(40),
      },
    ],
    [
      'blank Railway values with populated generic fallbacks',
      {
        RAILWAY_ENVIRONMENT_NAME: ' ',
        RAILWAY_GIT_COMMIT_SHA: '',
        APP_ENV: 'dev',
        COMMIT_SHA: 'a'.repeat(40),
      },
    ],
  ])('fails closed for %s', (_label, environment) => {
    let thrown: unknown;
    try {
      resolveDeploymentProof(environment);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      message: 'Deployment proof is unavailable',
    });
    expect((thrown as { getStatus: () => number }).getStatus()).toBe(503);
  });

  it('ignores generic metadata when the exact Railway pair is valid', () => {
    expect(
      resolveDeploymentProof({
        RAILWAY_ENVIRONMENT_NAME: 'dev',
        RAILWAY_GIT_COMMIT_SHA: 'a'.repeat(40),
        APP_ENV: 'production',
        COMMIT_SHA: 'b'.repeat(40),
      }),
    ).toMatchObject({ environment: 'dev', revision: 'a'.repeat(40) });
  });
});
