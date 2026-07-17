import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const script = resolve(
  process.cwd(),
  '../../scripts/policy-category-integrity-qa.sh',
);
const failureQaScript = resolve(
  process.cwd(),
  '../../scripts/staging-policy-lifecycle-qa.sh',
);
const uiSpec = resolve(
  process.cwd(),
  '../../e2e/cross-system/policy-category-integrity-ui.spec.ts',
);
const rolloutDoc = resolve(
  process.cwd(),
  '../../docs/policy-category-integrity-rollout.md',
);

describe('policy category integrity hosted QA gate', () => {
  let sandbox: string;
  let fakeBin: string;
  let networkLog: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'policy-category-qa-'));
    fakeBin = join(sandbox, 'bin');
    networkLog = join(sandbox, 'network.log');
    mkdirSync(fakeBin);
    writeFileSync(
      join(fakeBin, 'curl'),
      `#!/usr/bin/env bash
printf '%s\n' "$*" >>"$NETWORK_LOG"
if [[ "$*" == *'/offer/deployment-proof'* ]]; then
  printf '%s\n' "\${DEPLOYMENT_PROOF_RESPONSE}"
  exit 0
fi
printf '{"unexpected":true}\n'
exit 99
`,
      { mode: 0o700 },
    );
  });

  afterEach(() => rmSync(sandbox, { force: true, recursive: true }));

  const run = (extraEnv: NodeJS.ProcessEnv = {}) =>
    spawnSync('bash', [script], {
      encoding: 'utf8',
      env: {
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        NETWORK_LOG: networkLog,
        ...extraEnv,
      },
    });

  it('is a zero-network, zero-write planner by default', () => {
    const evidenceDir = join(sandbox, 'evidence');
    const result = run({ EVIDENCE_DIR: evidenceDir });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('NO NETWORK; NO WRITES');
    expect(result.stdout).toContain('prepare-retire');
    expect(result.stdout).toContain('purge');
    expect(existsSync(networkLog)).toBe(false);
    expect(existsSync(evidenceDir)).toBe(false);
  });

  it('refuses execution before network access when exact gates are absent', () => {
    const result = run({ EXECUTE: '1' });
    expect(result.status).toBe(64);
    expect(result.stderr).toContain('PHASE must be prepare-retire or purge');
    expect(existsSync(networkLog)).toBe(false);
  });

  it('binds the candidate SHA to Railway deployment proof before any mutation', () => {
    const source = readFileSync(script, 'utf8');
    expect(source).toContain('"$API_URL/offer/deployment-proof"');
    expect(source).toContain('gogocash.deployment-revision.v1');
    expect(source).toContain('DEPLOYED_REVISION');
    expect(source).toContain('DEPLOYED_ENVIRONMENT');
    expect(source.indexOf('/offer/deployment-proof')).toBeLessThan(
      source.indexOf('/policy/aggregate-capability'),
    );
    expect(source.indexOf('/offer/deployment-proof')).toBeLessThan(
      source.indexOf('/policy/aggregate"'),
    );
  });

  it('dynamically refuses a Railway revision mismatch before a hosted mutation', () => {
    const repo = join(sandbox, 'repo');
    const copiedScript = join(repo, 'scripts/policy-category-integrity-qa.sh');
    const copiedFailureQaScript = join(
      repo,
      'scripts/staging-policy-lifecycle-qa.sh',
    );
    const copiedSpec = join(
      repo,
      'e2e/cross-system/policy-category-integrity-ui.spec.ts',
    );
    const removalHook = join(repo, 'scripts/policy-qa-remove-hook.sh');
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    mkdirSync(join(repo, 'e2e/cross-system'), { recursive: true });
    copyFileSync(script, copiedScript);
    copyFileSync(failureQaScript, copiedFailureQaScript);
    copyFileSync(uiSpec, copiedSpec);
    writeFileSync(removalHook, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    chmodSync(copiedScript, 0o755);
    chmodSync(copiedFailureQaScript, 0o755);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['add', '.'], { cwd: repo });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Policy QA',
        '-c',
        'user.email=policy-qa@example.invalid',
        'commit',
        '-qm',
        'qa fixture',
      ],
      { cwd: repo },
    );
    const candidateSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
    const fingerprint = createHash('sha256')
      .update('localhost:27017/gogocash-dev')
      .digest('hex')
      .slice(0, 16);
    const backup = join(sandbox, 'backup-evidence.txt');
    writeFileSync(backup, `${candidateSha}\n${fingerprint}\nverified\n`);
    const marker = 'policy-qa-dev-revision-owner';
    const removalHookHash = createHash('sha256')
      .update(readFileSync(removalHook))
      .digest('hex');
    const result = spawnSync('bash', [copiedScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        NETWORK_LOG: networkLog,
        DEPLOYMENT_PROOF_RESPONSE: JSON.stringify({
          schema: 'gogocash.deployment-revision.v1',
          environment: 'dev',
          revision: 'f'.repeat(40),
        }),
        EXECUTE: '1',
        PHASE: 'prepare-retire',
        ENVIRONMENT: 'dev',
        API_URL: 'https://api.dev.gogocash.co',
        ADMIN_URL: 'https://admin.dev.gogocash.co',
        CANDIDATE_SHA: candidateSha,
        QA_OWNER: 'owner',
        QA_MARKER: marker,
        MONGO_URI: 'mongodb://localhost:27017/gogocash-dev',
        MONGO_TARGET_FINGERPRINT: fingerprint,
        BACKUP_EVIDENCE_FILE: backup,
        WRITER_DRAIN_CONFIRM: `drained-old-writers:dev:${candidateSha}:${fingerprint}`,
        QA_EVIDENCE_HMAC_KEY: 'h'.repeat(32),
        ADMIN_JWT: 'redacted-test-token',
        ADMIN_UI_EMAIL: 'admin@example.invalid',
        ADMIN_UI_PASSWORD: 'redacted-test-password',
        INVOLVE_QA_OFFER_ID: '123456',
        INVOLVE_SYNC_CONFIRM: `sync-involve-qa:dev:${marker}:123456`,
        INVOLVE_REMOVE_HOOK: 'scripts/policy-qa-remove-hook.sh',
        INVOLVE_REMOVE_HOOK_SHA256: removalHookHash,
        INVOLVE_REMOVE_CONFIRM: `remove-involve-qa:dev:${candidateSha}:${marker}:123456:${removalHookHash}`,
        POLICY_QA_FAILURE_INJECTION_SECRET: 's'.repeat(32),
        POLICY_QA_FAILURE_CONFIRM: `run-policy-failure-injection:dev:${candidateSha}:${marker}-failure:${marker}-failure-after-put:${fingerprint}`,
        QA_CONFIRM: `run-policy-category-integrity-qa:dev:${candidateSha}:${marker}:${fingerprint}`,
      },
    });
    expect(result.status).toBe(64);
    expect(result.stderr).toContain(
      'deployed revision does not match CANDIDATE_SHA',
    );
    const calls = readFileSync(networkLog, 'utf8');
    expect(calls).toContain('/offer/deployment-proof');
    expect(calls).not.toContain('/policy/aggregate-capability');
    expect(calls).not.toContain('/policy/aggregate');
  });

  it('disarms from the exit trap when the arm request succeeded but its response is invalid', () => {
    const repo = join(sandbox, 'failure-runner-repo');
    const copiedFailureQaScript = join(
      repo,
      'scripts/staging-policy-lifecycle-qa.sh',
    );
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    copyFileSync(failureQaScript, copiedFailureQaScript);
    chmodSync(copiedFailureQaScript, 0o755);
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['add', '.'], { cwd: repo });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Policy QA',
        '-c',
        'user.email=policy-qa@example.invalid',
        'commit',
        '-qm',
        'failure runner fixture',
      ],
      { cwd: repo },
    );
    const candidateSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
    const fingerprint = createHash('sha256')
      .update('localhost:27017/gogocash-dev')
      .digest('hex')
      .slice(0, 16);
    const marker = 'policy-qa-dev-trap-owner';
    const requestKey = `${marker}-after-put`;
    const evidenceFile = join(sandbox, 'failure-evidence.json');

    writeFileSync(
      join(fakeBin, 'curl'),
      `#!/usr/bin/env bash
printf '%s\n' "$*" >>"$NETWORK_LOG"
if [[ "$*" == *'/offer/deployment-proof'* ]]; then
  printf '%s\n' "\${DEPLOYMENT_PROOF_RESPONSE}"
elif [[ "$*" == *'/policy/qa/failure-injection'* && "$*" == *'-X POST'* ]]; then
  printf '{"armed":true,"one_shot":true,"environment":"staging","candidate_sha":"%s","marker":"%s","request_key":"%s","failure_point":"after-media-put-before-db-commit"}\n201\n' \
    "$CANDIDATE_SHA" "$FAILURE_MARKER" "$FAILURE_REQUEST_KEY"
elif [[ "$*" == *'/policy/qa/failure-injection'* && "$*" == *'-X DELETE'* ]]; then
  printf '{"environment":"%s","candidate_sha":"%s","marker":"%s","request_key":"%s","disarmed":true}\n200\n' \
    "$ENVIRONMENT" "$CANDIDATE_SHA" "$FAILURE_MARKER" "$FAILURE_REQUEST_KEY"
else
  printf '{"unexpected":true}\n599\n'
fi
`,
      { mode: 0o700 },
    );

    const result = spawnSync('bash', [copiedFailureQaScript], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        NETWORK_LOG: networkLog,
        DEPLOYMENT_PROOF_RESPONSE: JSON.stringify({
          schema: 'gogocash.deployment-revision.v1',
          environment: 'dev',
          revision: candidateSha,
        }),
        EXECUTE: '1',
        ENVIRONMENT: 'dev',
        API_URL: 'https://api.dev.gogocash.co',
        CANDIDATE_SHA: candidateSha,
        FAILURE_MARKER: marker,
        FAILURE_REQUEST_KEY: requestKey,
        POLICY_QA_FAILURE_INJECTION_SECRET: 's'.repeat(32),
        POLICY_QA_FAILURE_CONFIRM: `run-policy-failure-injection:dev:${candidateSha}:${marker}:${requestKey}:${fingerprint}`,
        MONGO_URI: 'mongodb://localhost:27017/gogocash-dev',
        MONGO_TARGET_FINGERPRINT: fingerprint,
        ADMIN_JWT: 'redacted-test-token',
        QA_EVIDENCE_HMAC_KEY: 'h'.repeat(32),
        FAILURE_EVIDENCE_FILE: evidenceFile,
      },
    });
    expect(result.status).toBe(64);
    expect(result.stderr).toContain(
      'failure injection arm response is invalid',
    );
    const calls = readFileSync(networkLog, 'utf8');
    const post = calls.indexOf('-X POST');
    const disarm = calls.indexOf('-X DELETE');
    expect(post).toBeGreaterThan(-1);
    expect(disarm).toBeGreaterThan(post);
    expect(existsSync(evidenceFile)).toBe(false);
  });

  it('defines fail-closed dev-first, target, backup, writer-drain, and signed evidence gates', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'MONGO_TARGET_FINGERPRINT',
      'BACKUP_EVIDENCE_FILE',
      'WRITER_DRAIN_CONFIRM',
      'QA_EVIDENCE_HMAC_KEY',
      'DEV_EVIDENCE_FILE',
      'PREPARE_EVIDENCE_FILE',
      'SUPERADMIN_JWT',
    ]) {
      expect(source).toContain(token);
    }
    expect(source).not.toContain('FORCE_API_URL');
    expect(source).not.toContain('api.gogocash.co/policy');
  });

  it('covers the complete prepare-retire evidence contract', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'default_banner',
      'aggregate replay',
      'POLICY_CATEGORY_REFERENCED',
      'offer_policy_category_id',
      'offer_categories_normalized',
      'unique_offers',
      'retained alias',
      'selector exclusion',
      'INVOLVE_QA_OFFER_ID',
      'INVOLVE_SYNC_CONFIRM',
      'categories_normalized',
      'cleanup_scheduled',
      'committedRequiredCommands',
      "reason: 'content-delete', status: 'deleted'",
      'hasExpectedAliases',
      'policy-category-integrity-ui.spec.ts',
    ]) {
      expect(source).toContain(token);
    }
    expect(source).toContain('assert_media_absent');
    expect(source).toContain("'404' | '410'");
    expect(source).not.toContain("if curl -fsS -H 'Cache-Control: no-cache'");
  });

  it('requires signed after-Put failure evidence before prepare evidence can pass', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'scripts/staging-policy-lifecycle-qa.sh',
      'POLICY_QA_FAILURE_INJECTION_SECRET',
      'POLICY_QA_FAILURE_CONFIRM',
      'FAILURE_EVIDENCE_FILE',
      'after-put-failure',
      'failure_injection_evidence',
    ]) {
      expect(source).toContain(token);
    }
    expect(source.indexOf('"$FAILURE_QA_SCRIPT"')).toBeLessThan(
      source.indexOf(
        'schema:"gogocash.policy-category-qa.v2", phase:"prepare-retire"',
      ),
    );
  });

  it('accepts failure evidence only for the exact injected command error', () => {
    const source = readFileSync(failureQaScript, 'utf8');
    const auditSource = source.slice(
      source.indexOf('audit_failure_command()'),
      source.indexOf("AUDIT_RESULT=''"),
    );
    expect(auditSource).toContain(
      'Controlled policy QA failure after media upload and before database commit',
    );
    expect(auditSource.indexOf('command.last_error')).toBeLessThan(
      auditSource.indexOf('process.stdout.write(JSON.stringify({'),
    );
  });

  it('keeps purge separately authorized and verifies final absence except tombstones', () => {
    const source = readFileSync(script, 'utf8');
    expect(source).toContain('purge-policy-category-integrity-qa:');
    expect(source).toContain('purge_after');
    expect(source).toContain("category.lifecycle_status !== 'retired'");
    expect(source).toContain('row.tombstoned !== true');
    expect(source).toContain('marker-owned records remain after final cleanup');
    expect(source).toContain('reason: { $in:');
    expect(source).toContain('purge-checkpoint');
    expect(
      source.match(/write_atomic_evidence "\$EVIDENCE_FILE"/g),
    ).toHaveLength(2);
    expect(source).not.toContain('write_evidence "$EVIDENCE_FILE"');
  });

  it('checkpoints exact local Involve cleanup before category purge and resumes from verified absence', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'involve-local-cleanup-checkpoint',
      'INVOLVE_CLEANUP_CHECKPOINT_FILE',
      'local_fixture_removed:true',
      'verify_involve_cleanup_checkpoint',
      'verify_involve_local_absent',
      'SIGNED_INVOLVE_LOCAL_OFFER_ID',
    ]) {
      expect(source).toContain(token);
    }
    const checkpointWrite = source.indexOf(
      'write_atomic_evidence "$INVOLVE_CLEANUP_CHECKPOINT_FILE"',
    );
    const purge = source.indexOf(
      'request_json POST "/policy/category/$CATEGORY_ID/purge"',
    );
    expect(checkpointWrite).toBeGreaterThan(-1);
    expect(checkpointWrite).toBeLessThan(purge);
    expect(source).toContain(
      'if verify_involve_local_absent "$SIGNED_INVOLVE_LOCAL_OFFER_ID"',
    );
    const exitCleanup = source.slice(
      source.indexOf('cleanup_local()'),
      source.indexOf('trap cleanup_local EXIT'),
    );
    expect(exitCleanup).toContain(
      `if [[ $code -ne 0 && "$PHASE" == 'prepare-retire' && "$RETIRED" != '1' && -n "$INVOLVE_LOCAL_OFFER_ID" ]]`,
    );
    expect(exitCleanup).not.toContain(
      'if [[ $code -ne 0 && -n "$INVOLVE_LOCAL_OFFER_ID" ]]',
    );
    const absenceVerifier = source.slice(
      source.indexOf('verify_involve_local_absent()'),
      source.indexOf('write_evidence()'),
    );
    expect(absenceVerifier).toContain(
      "source: 'involve', offer_id: Number(process.env.INVOLVE_QA_OFFER_ID)",
    );
    expect(absenceVerifier).not.toContain('categories: process.env.QA_MARKER');

    const checkpointWrites =
      source.match(/write_(?:atomic_)?evidence "\$[A-Z_]*CHECKPOINT_FILE"/g) ??
      [];
    expect(checkpointWrites).toEqual([
      'write_atomic_evidence "$INVOLVE_CLEANUP_CHECKPOINT_FILE"',
      'write_atomic_evidence "$PURGE_CHECKPOINT_FILE"',
    ]);
    const atomicWriter = source.slice(
      source.indexOf('write_atomic_evidence()'),
      source.indexOf('verify_involve_cleanup_checkpoint()'),
    );
    expect(atomicWriter).toContain('[[ ! -L "$file" ]]');
    expect(atomicWriter).toContain('chmod 600 "$temporary"');
    expect(atomicWriter.indexOf('write_evidence "$temporary"')).toBeLessThan(
      atomicWriter.indexOf('chmod 600 "$temporary"'),
    );
    expect(atomicWriter.indexOf('chmod 600 "$temporary"')).toBeLessThan(
      atomicWriter.indexOf('mv -f "$temporary" "$file"'),
    );
  });

  it('adds a real hosted Admin UI phase with no route mocks', () => {
    const source = readFileSync(uiSpec, 'utf8');
    expect(source).toContain('/api/backend/offer/deployment-proof');
    expect(source).toContain('/api/backend/policy/aggregate');
    expect(source).toContain('/api/backend/policy/category/');
    expect(source).toContain('/delete-content');
    expect(source).toContain('/retire');
    expect(source).toContain('postDataJSON()');
    expect(source).toContain('await deleteResponse.json()');
    expect(source).toContain('await retireResponse.json()');
    expect(source).toContain('test.setTimeout(180_000)');
    expect(
      source.match(/response\.request\(\)\.method\(\) === "PUT"/g),
    ).toHaveLength(2);
    expect(
      source.match(/response\.request\(\)\.method\(\) === "POST"/g),
    ).toHaveLength(2);
    expect(source).toContain('/brands?tab=policy');
    expect(source).toContain('Save changes');
    expect(source).toContain('Close');
    expect(source).toContain('Cancel terms changes');
    expect(source).toContain('Clear T&C');
    expect(source).toContain('Delete policy content?');
    expect(source).toContain('Retire category?');
    expect(source).not.toContain('POLICY_QA_API_URL');
    expect(source).not.toContain('${apiUrl}/policy');
    expect(source).not.toContain('page.route(');
    expect(source).not.toContain('route.fulfill');
  });

  it('requires signed immediate upstream removal and exact post-grace local cleanup', () => {
    const source = readFileSync(script, 'utf8');
    for (const token of [
      'INVOLVE_REMOVE_HOOK',
      'INVOLVE_REMOVE_HOOK_SHA256',
      'INVOLVE_REMOVE_CONFIRM',
      '! -L "$INVOLVE_REMOVE_HOOK_PATH"',
      'upstream-removal',
      'involve_local_offer_id',
      'disabled_local_fixture',
      'verify_involve_local_absent',
      'upstream_removal_evidence',
    ]) {
      expect(source).toContain(token);
    }
    expect(source.indexOf('"$INVOLVE_REMOVE_HOOK"')).toBeLessThan(
      source.indexOf(
        'schema:"gogocash.policy-category-qa.v2", phase:"prepare-retire"',
      ),
    );
    expect(source).not.toContain(
      "request_json DELETE \"/offer/$INVOLVE_LOCAL_OFFER_ID\"\n  [[ \"$RESPONSE_STATUS\" == '200' ]] || refuse 'local Involve marker offer cleanup failed'\n  INVOLVE_LOCAL_OFFER_ID=''",
    );
  });

  it('documents executable dev-first promotion, backup, drain, rollback, and delayed purge gates', () => {
    const rollout = readFileSync(rolloutDoc, 'utf8');
    for (const token of [
      'Wave 2B',
      'policy-category-integrity-qa.sh',
      'PHASE=prepare-retire',
      'PHASE=purge',
      'BACKUP_EVIDENCE_FILE',
      'WRITER_DRAIN_CONFIRM',
      'DEV_EVIDENCE_FILE',
      'PREPARE_EVIDENCE_FILE',
      'deployment-proof',
      'Default banner',
      'controlled upstream Involve fixture',
      '30-day',
      'Rollback',
    ]) {
      expect(rollout).toContain(token);
    }
    expect(rollout).not.toContain('That future harness');
  });

  it('parses as shell and keeps the hosted UI spec type-safe at source level', () => {
    for (const shellScript of [script, failureQaScript]) {
      const shellCheck = spawnSync('bash', ['-n', shellScript], {
        encoding: 'utf8',
      });
      expect(shellCheck.status).toBe(0);
    }
    expect(readFileSync(uiSpec, 'utf8')).toContain('POLICY_QA_UI_EXECUTE');

    for (const shellScript of [script, failureQaScript]) {
      const source = readFileSync(shellScript, 'utf8');
      const nodePrograms = Array.from(
        source.matchAll(/node <<'NODE'[^\n]*\n([\s\S]*?)\nNODE/g),
        (match) => match[1],
      );
      expect(nodePrograms.length).toBeGreaterThanOrEqual(1);
      for (const program of nodePrograms) {
        const syntaxCheck = spawnSync(process.execPath, ['--check', '-'], {
          encoding: 'utf8',
          input: program,
        });
        expect({
          script: shellScript,
          status: syntaxCheck.status,
          stderr: syntaxCheck.stderr,
        }).toMatchObject({ status: 0, stderr: '' });
      }
    }
  });
});
