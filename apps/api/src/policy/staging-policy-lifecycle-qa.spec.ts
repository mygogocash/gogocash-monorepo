import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve(
  process.cwd(),
  '../../scripts/staging-policy-lifecycle-qa.sh',
);

describe('hosted policy after-Put failure QA harness', () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'policy-failure-qa-'));
  });

  afterEach(() => rmSync(sandbox, { force: true, recursive: true }));

  it('is inert by default and refuses an incompletely gated execution', () => {
    const evidence = join(sandbox, 'evidence.json');
    const dryRun = spawnSync('bash', [script], {
      encoding: 'utf8',
      env: { ...process.env, EXECUTE: '0', FAILURE_EVIDENCE_FILE: evidence },
    });
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain('NO NETWORK; NO WRITES');
    expect(existsSync(evidence)).toBe(false);

    const execute = spawnSync('bash', [script], {
      encoding: 'utf8',
      env: { ...process.env, EXECUTE: '1' },
    });
    expect(execute.status).toBe(64);
    expect(execute.stderr).toContain('ENVIRONMENT must be dev or staging');
  });

  it('arms the exact one-shot endpoint, submits multipart after arming, and always disarms', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'POLICY_QA_FAILURE_INJECTION_SECRET',
      'POLICY_QA_FAILURE_CONFIRM',
      'after-media-put-before-db-commit',
      'ttl_seconds',
      'one_shot',
      'x-policy-qa-failure-confirmation',
      '/policy/qa/failure-injection',
      '/policy/aggregate',
      'default_banner',
      'disarm_failure_injection',
      'trap cleanup EXIT INT TERM',
    ]) {
      expect(source).toContain(token);
    }
    const arm = source.indexOf('request_failure_control POST');
    const aggregate = source.indexOf('"$API_URL/policy/aggregate"');
    const disarm = source.indexOf('request_failure_control DELETE');
    expect(arm).toBeGreaterThan(-1);
    expect(aggregate).toBeGreaterThan(arm);
    expect(disarm).toBeGreaterThan(-1);
  });

  it('requires exact failed-command, zero-owner, compensated-media, and zero-debt proof before signed evidence', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'policy_lifecycle_commands',
      'policy_media_cleanup',
      'policy_media_asset_registry',
      "command.status !== 'failed'",
      'categories.countDocuments',
      'policies.countDocuments',
      "cleanup.status !== 'deleted'",
      "registry.state !== 'deleted'",
      'unresolved cleanup debt',
      "'404' | '410'",
      'phase:"after-put-failure"',
      'createHmac',
    ]) {
      expect(source).toContain(token);
    }
    expect(source.indexOf('audit_failure_command')).toBeLessThan(
      source.indexOf('write_signed_evidence'),
    );
    expect(source.indexOf('assert_media_absent')).toBeLessThan(
      source.indexOf('write_signed_evidence'),
    );
  });

  it('keeps production, URL, SHA, role token, marker, and operator confirmation gates fail closed', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'https://api.dev.gogocash.co',
      'https://api-staging.gogocash.co',
      'production API is forbidden',
      'CANDIDATE_SHA must be an exact lowercase 40-character Git SHA',
      'ADMIN_JWT with support-or-higher access is required',
      'FAILURE_MARKER is not owned by the declared environment',
      'POLICY_QA_FAILURE_CONFIRM does not bind',
      '/offer/deployment-proof',
    ]) {
      expect(source).toContain(token);
    }
  });

  it('parses as shell', () => {
    const result = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
    expect(result.status).toBe(0);
  });
});
