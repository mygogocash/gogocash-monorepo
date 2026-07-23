import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

// The production QA runner is intentionally plain CommonJS so operators can
// execute it with Node without compiling the Nest application first.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const evidenceHelper = require(
  resolve(__dirname, '../../../../scripts/staging-coupon-qa-evidence.cjs'),
);

const KEY = 'issue-339-test-evidence-key-32-bytes-minimum';
const REVISION = 'a'.repeat(40);

describe('issue #339 revision-bound QA evidence', () => {
  let sandbox: string;
  let qaScriptPath: string;
  let mongoHelperPath: string;
  let evidenceHelperPath: string;
  let paths: {
    qaScriptPath: string;
    mongoHelperPath: string;
    evidenceHelperPath: string;
  };

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'gogocash-issue339-evidence-'));
    qaScriptPath = join(sandbox, 'qa.sh');
    mongoHelperPath = join(sandbox, 'mongo.cjs');
    evidenceHelperPath = join(sandbox, 'evidence.cjs');
    writeFileSync(qaScriptPath, 'qa-script-v1');
    writeFileSync(mongoHelperPath, 'mongo-helper-v1');
    writeFileSync(evidenceHelperPath, 'evidence-helper-v1');
    paths = { qaScriptPath, mongoHelperPath, evidenceHelperPath };
  });

  afterEach(() => rmSync(sandbox, { force: true, recursive: true }));

  const build = (overrides: Record<string, unknown> = {}) =>
    evidenceHelper.buildEvidence({
      hmacKey: KEY,
      runId: '20260717T010203Z-339',
      deployedRevision: REVISION,
      localRevision: REVISION,
      ...paths,
      cleanup: { couponCount: 0, offerCount: 0 },
      completedAt: new Date('2026-07-17T01:02:03.000Z'),
      ...overrides,
    });

  const verify = (evidence: Record<string, unknown>, overrides = {}) =>
    evidenceHelper.verifyEvidence(evidence, {
      hmacKey: KEY,
      expectedRevision: REVISION,
      ...paths,
      now: new Date('2026-07-17T02:02:03.000Z'),
      ...overrides,
    });

  const resign = (evidence: Record<string, unknown>) => ({
    ...evidence,
    signature: evidenceHelper.signEvidence(evidence, KEY),
  });

  it('accepts a fresh signed dev result bound to the exact revision and helper hashes', () => {
    const evidence = build();

    expect(verify(evidence)).toBe(evidence);
    expect(evidence).toMatchObject({
      schema: 'gogocash.issue339.dev-evidence.v2',
      issue: 339,
      qaEnvironment: 'dev',
      apiUrl: 'https://api.dev.gogocash.co',
      environmentIdentity: 'dev',
      deployedRevision: REVISION,
      localRevision: REVISION,
      publicContractVerified: true,
      cleanup: { verified: true, couponCount: 0, offerCount: 0 },
    });
  });

  it.each([
    ['tampered API URL', (evidence: any) => ({ ...evidence, apiUrl: 'x' })],
    [
      'tampered environment',
      (evidence: any) => ({ ...evidence, qaEnvironment: 'staging' }),
    ],
    [
      'tampered revision',
      (evidence: any) => ({ ...evidence, deployedRevision: 'b'.repeat(40) }),
    ],
    [
      'fabricated signature',
      (evidence: any) => ({ ...evidence, signature: '0'.repeat(64) }),
    ],
  ])('rejects %s without a valid signature', (_label, mutate) => {
    expect(() => verify(mutate(build()))).toThrow('signature is invalid');
  });

  it('rejects stale signed evidence', () => {
    const evidence = build({
      completedAt: new Date('2026-07-16T18:00:00.000Z'),
    });

    expect(() => verify(evidence)).toThrow('evidence is stale');
  });

  it('rejects signature-valid evidence completed beyond the allowed future clock skew', () => {
    const evidence = build({
      completedAt: new Date('2026-07-17T02:08:04.000Z'),
    });

    expect(() => verify(evidence)).toThrow('invalid timing');
  });

  it.each([
    ['zero', '2026-07-17T01:02:03.000Z'],
    ['inverted', '2026-07-17T01:02:02.999Z'],
  ])('rejects a correctly signed %s evidence window', (_label, expiresAt) => {
    const evidence = resign({ ...build(), expiresAt });

    expect(() => verify(evidence)).toThrow('invalid timing');
  });

  it.each([
    ['API URL', { apiUrl: 'https://api-staging.gogocash.co' }],
    ['QA environment', { qaEnvironment: 'staging' }],
    ['environment identity', { environmentIdentity: 'staging' }],
    [
      'cleanup count',
      { cleanup: { verified: true, couponCount: 1, offerCount: 0 } },
    ],
    ['public contract', { publicContractVerified: false }],
  ])(
    'rejects signature-valid evidence with mismatched %s',
    (_label, change) => {
      const evidence = resign({ ...build(), ...change });

      expect(() => verify(evidence)).toThrow(
        'evidence does not match the current revision',
      );
    },
  );

  it('rejects a different expected revision even when the evidence itself is authentic', () => {
    const evidence = build();

    expect(() =>
      verify(evidence, { expectedRevision: 'b'.repeat(40) }),
    ).toThrow('evidence does not match the current revision');
  });

  it('rejects evidence when any current QA helper hash has changed', () => {
    const evidence = build();
    writeFileSync(mongoHelperPath, 'mongo-helper-v2');

    expect(() => verify(evidence)).toThrow(
      'evidence does not match the current revision',
    );
  });

  it('requires exact cleanup absence before creating evidence', () => {
    expect(() => build({ cleanup: { couponCount: 0, offerCount: 1 } })).toThrow(
      'cleanup proof must show exact absence',
    );
  });

  it('accepts only an exact deployment proof for the requested environment and revision', () => {
    expect(
      evidenceHelper.parseDeploymentProof(
        {
          schema: 'gogocash.deployment-revision.v1',
          environment: 'staging',
          revision: REVISION,
        },
        { expectedEnvironment: 'staging', expectedRevision: REVISION },
      ),
    ).toEqual({
      schema: 'gogocash.deployment-revision.v1',
      environment: 'staging',
      revision: REVISION,
    });
  });

  it.each([
    ['stale revision', { revision: 'b'.repeat(40) }],
    ['wrong environment', { environment: 'dev' }],
    ['fabricated schema', { schema: 'fake-proof' }],
  ])('rejects deployment proof with %s', (_label, change) => {
    expect(() =>
      evidenceHelper.parseDeploymentProof(
        {
          schema: 'gogocash.deployment-revision.v1',
          environment: 'staging',
          revision: REVISION,
          ...change,
        },
        { expectedEnvironment: 'staging', expectedRevision: REVISION },
      ),
    ).toThrow('deployed revision proof does not match');
  });
});
