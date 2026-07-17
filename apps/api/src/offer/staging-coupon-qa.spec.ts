import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const SCRIPT = resolve(__dirname, '../../../../scripts/staging-coupon-qa.sh');

describe('staging-coupon-qa safety guards', () => {
  let sandbox: string;
  let fakeBin: string;
  let curlMarker: string;
  let nodeMarker: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'gogocash-issue339-script-'));
    fakeBin = join(sandbox, 'bin');
    curlMarker = join(sandbox, 'curl-called');
    nodeMarker = join(sandbox, 'node-called');
    mkdirSync(fakeBin);
    writeFileSync(
      join(fakeBin, 'curl'),
      '#!/usr/bin/env bash\nprintf called >"$CURL_MARKER"\nexit 99\n',
      { mode: 0o700 },
    );
    writeFileSync(
      join(fakeBin, 'node'),
      '#!/usr/bin/env bash\nprintf called >"$NODE_MARKER"\nexec "$REAL_NODE" "$@"\n',
      { mode: 0o700 },
    );
  });

  afterEach(() => rmSync(sandbox, { force: true, recursive: true }));

  const run = (extraEnv: NodeJS.ProcessEnv = {}) =>
    spawnSync('bash', [SCRIPT], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        CURL_MARKER: curlMarker,
        NODE_MARKER: nodeMarker,
        REAL_NODE: process.execPath,
        EVIDENCE_DIR: join(sandbox, 'evidence'),
        ...extraEnv,
      },
    });

  it('defaults to dev planning with no network or writes', () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('NO NETWORK / NO WRITES');
    expect(result.stdout).toContain('https://api.dev.gogocash.co (dev)');
    expect(existsSync(curlMarker)).toBe(false);
    expect(existsSync(nodeMarker)).toBe(false);
    expect(existsSync(join(sandbox, 'evidence'))).toBe(false);
  });

  it.each([
    ['dev', 'https://api.gogocash.co'],
    ['dev', 'https://api-staging.gogocash.co'],
    ['staging', 'https://api.dev.gogocash.co'],
    ['dev', 'http://api.dev.gogocash.co'],
  ])('refuses mismatched or unsafe target %s %s', (qaEnv, apiUrl) => {
    const result = run({ QA_ENV: qaEnv, API_URL: apiUrl });
    expect(result.status).toBe(6);
    expect(result.stderr).toMatch(
      /Production target is forbidden|API_URL is not permitted/,
    );
    expect(existsSync(curlMarker)).toBe(false);
    expect(existsSync(nodeMarker)).toBe(false);
  });

  it('requires exact apply confirmation before any network call', () => {
    const result = run({ MODE: 'apply', MONGO_URI: 'secret-mongo-uri' });
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('CONFIRM_NONPROD_WRITE=issue-339');
    expect(`${result.stdout}${result.stderr}`).not.toContain(
      'secret-mongo-uri',
    );
    expect(existsSync(curlMarker)).toBe(false);
    expect(existsSync(nodeMarker)).toBe(false);
  });

  it('enforces a passing dev evidence file before staging', () => {
    const result = run({
      API_URL: 'https://api-staging.gogocash.co',
      QA_ENV: 'staging',
      MODE: 'apply',
      CONFIRM_NONPROD_WRITE: 'issue-339',
      MONGO_URI: 'secret-mongo-uri',
    });
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('requires DEV_EVIDENCE_FILE');
    expect(`${result.stdout}${result.stderr}`).not.toContain(
      'secret-mongo-uri',
    );
    expect(existsSync(curlMarker)).toBe(false);
    expect(existsSync(nodeMarker)).toBe(false);
  });

  it('requires the external DB sentinel before local state or fixture work', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    expect(source).toContain('node "$MONGO_HELPER" sentinel');
    expect(source.indexOf('node "$MONGO_HELPER" sentinel')).toBeLessThan(
      source.indexOf('QA_STATE_FILE="$(mktemp'),
    );
    expect(source).toContain('node "$MONGO_HELPER" prepare');
    expect(source).toContain('node "$MONGO_HELPER" cleanup');
    expect(source).toContain('trap cleanup EXIT');
  });

  it('binds staging to signed dev evidence and both environments to the exact deployed revision', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    expect(source).toContain('node "$EVIDENCE_HELPER" verify');
    expect(source).toContain('git -C "$REPO_ROOT" rev-parse --verify HEAD');
    expect(source).toContain('git -C "$REPO_ROOT" diff --quiet HEAD');
    expect(source).toContain('"$API_URL/offer/deployment-proof"');
    expect(source).toContain('node "$EVIDENCE_HELPER" revision');
    expect(source).toContain('node "$EVIDENCE_HELPER" create');
    expect(source).not.toContain('dev-pass.txt');
    expect(source).not.toMatch(/grep[^\n]*PASS issue-339/);
    expect(source.indexOf('node "$EVIDENCE_HELPER" verify')).toBeLessThan(
      source.indexOf('node "$MONGO_HELPER" prepare'),
    );
    expect(source.indexOf('/offer/deployment-proof')).toBeLessThan(
      source.indexOf('node "$MONGO_HELPER" prepare'),
    );
    expect(source.indexOf('node "$MONGO_HELPER" cleanup')).toBeLessThan(
      source.indexOf('node "$EVIDENCE_HELPER" create'),
    );
  });

  it('helper persists exact IDs before inserts and validates ownership before coupon-first cleanup', () => {
    const helper = readFileSync(
      resolve(__dirname, '../../../../scripts/staging-coupon-qa-mongo.cjs'),
      'utf8',
    );
    expect(helper).toContain('persistFixtureState(stateFile, state);');
    expect(
      helper.indexOf('persistFixtureState(stateFile, state);'),
    ).toBeLessThan(helper.indexOf('collection("offers").insertOne'));
    expect(helper).toContain('validateFixtureOwnership(db, parsed)');
    expect(helper.indexOf('validateFixtureOwnership(db, parsed)')).toBeLessThan(
      helper.indexOf('collection("coupons").deleteMany'),
    );
    expect(helper.indexOf('collection("coupons").deleteMany')).toBeLessThan(
      helper.indexOf('collection("offers").deleteOne'),
    );
    expect(helper).toContain('countDocuments({ _id: { $in: couponIds } })');
    expect(helper).toContain('countDocuments({ _id: offerId })');
    expect(helper).not.toMatch(
      /collection\(SENTINEL_COLLECTION\)\.(insert|update|replace)/,
    );
  });

  it('keeps MONGO_URI environment-only and never accepts a force production bypass', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const helper = readFileSync(
      resolve(__dirname, '../../../../scripts/staging-coupon-qa-mongo.cjs'),
      'utf8',
    );
    expect(helper).toContain('mongoUri: process.env.MONGO_URI');
    expect(source).toContain(
      'JSON.parse(readFileSync(process.env.QA_STATE_FILE, "utf8"))',
    );
    expect(source).not.toContain('require(process.env.QA_STATE_FILE)');
    expect(source).not.toMatch(/process\.argv[^\n]*MONGO_URI/);
    expect(source).not.toContain('FORCE_API_URL');
  });

  it('parses the shell and every embedded apply-path Node program', () => {
    const shellCheck = spawnSync('bash', ['-n', SCRIPT], { encoding: 'utf8' });
    expect(shellCheck.status).toBe(0);

    const source = readFileSync(SCRIPT, 'utf8');
    const nodePrograms = Array.from(
      source.matchAll(/node <<'NODE'\n([\s\S]*?)\nNODE/g),
      (match) => match[1],
    );
    expect(nodePrograms).toHaveLength(1);
    for (const program of nodePrograms) {
      const syntaxCheck = spawnSync(process.execPath, ['--check', '-'], {
        encoding: 'utf8',
        input: program,
      });
      expect(syntaxCheck.status).toBe(0);
    }
    const helperCheck = spawnSync(
      process.execPath,
      [
        '--check',
        resolve(__dirname, '../../../../scripts/staging-coupon-qa-mongo.cjs'),
      ],
      { encoding: 'utf8' },
    );
    expect(helperCheck.status).toBe(0);
    const evidenceHelperCheck = spawnSync(
      process.execPath,
      [
        '--check',
        resolve(
          __dirname,
          '../../../../scripts/staging-coupon-qa-evidence.cjs',
        ),
      ],
      { encoding: 'utf8' },
    );
    expect(evidenceHelperCheck.status).toBe(0);
  });
});
