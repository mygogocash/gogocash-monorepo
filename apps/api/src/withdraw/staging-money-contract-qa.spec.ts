import 'reflect-metadata';
import { ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../common/validation-pipe.options';
import { CreateAffiliateDto } from '../involve/dto/create-involve.dto';

const SCRIPT = resolve(
  __dirname,
  '../../../../scripts/staging-money-contract-qa.sh',
);

describe('staging-money-contract-qa safety guards', () => {
  let sandbox: string;
  let curlMarker: string;
  let fakeBin: string;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'gogocash-issue34-script-'));
    fakeBin = join(sandbox, 'bin');
    curlMarker = join(sandbox, 'curl-called');
    mkdirSync(fakeBin);
    const fakeCurl = join(fakeBin, 'curl');
    writeFileSync(
      fakeCurl,
      '#!/usr/bin/env bash\nprintf called >"$CURL_MARKER"\nexit 99\n',
      { mode: 0o700 },
    );
  });

  afterEach(() => {
    rmSync(sandbox, { force: true, recursive: true });
  });

  const run = (extraEnv: NodeJS.ProcessEnv = {}, input?: string) =>
    spawnSync('bash', [SCRIPT], {
      encoding: 'utf8',
      input,
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        CURL_MARKER: curlMarker,
        EVIDENCE_DIR: join(sandbox, 'evidence'),
        ...extraEnv,
      },
    });

  it('defaults to a no-network, no-write dry run', () => {
    const result = run({ API_URL: 'https://api-staging.gogocash.co' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('NO NETWORK / NO WRITES');
    expect(existsSync(curlMarker)).toBe(false);
    expect(existsSync(join(sandbox, 'evidence'))).toBe(false);
  });

  it('always refuses the production API without a force bypass', () => {
    const result = run({ API_URL: 'https://api.gogocash.co' });

    expect(result.status).toBe(6);
    expect(result.stderr).toContain('Production target is forbidden');
    expect(existsSync(curlMarker)).toBe(false);
    expect(readFileSync(SCRIPT, 'utf8')).not.toContain('FORCE_API_URL');
  });

  it.each(['http://api.dev.gogocash.co', 'http://api-staging.gogocash.co'])(
    'refuses non-HTTPS remote target %s without a network call',
    (apiUrl) => {
      const result = run({ API_URL: apiUrl });

      expect(result.status).toBe(6);
      expect(result.stderr).toContain('API_URL is not permitted');
      expect(existsSync(curlMarker)).toBe(false);
    },
  );

  it.each([
    ['https://alice:supersecret@api-staging.gogocash.co', 'supersecret'],
    [
      'https://api-staging.gogocash.co?access_token=query-secret',
      'query-secret',
    ],
    ['https://api-staging.gogocash.co#fragment-secret', 'fragment-secret'],
  ])(
    'refuses credential-bearing or ambiguous URL %s without echoing its secret',
    (apiUrl, secret) => {
      const result = run({ API_URL: apiUrl });
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status).toBe(6);
      expect(output).toContain('API_URL is not permitted');
      expect(output).not.toContain(secret);
      expect(existsSync(curlMarker)).toBe(false);
    },
  );

  it.each(['http://localhost:8080', 'http://127.0.0.1:8080'])(
    'allows HTTP only for local target %s in no-network dry-run mode',
    (apiUrl) => {
      const result = run({ API_URL: apiUrl });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`Target: ${apiUrl}`);
      expect(existsSync(curlMarker)).toBe(false);
    },
  );

  it('refuses apply mode before any network call without exact confirmation', () => {
    const result = run({
      API_URL: 'https://api-staging.gogocash.co',
      MODE: 'apply',
    });

    expect(result.status).toBe(3);
    expect(result.stderr).toContain('CONFIRM_NONPROD_WRITE=issue-34');
    expect(existsSync(curlMarker)).toBe(false);
  });

  it('never prints supplied credentials during dry-run planning', () => {
    const customerToken = 'customer-secret-token';
    const adminToken = 'admin-secret-token';
    const invalidToken = 'invalid-secret-token';
    const result = run({
      API_URL: 'https://api-staging.gogocash.co',
      ADMIN_JWT: adminToken,
      CUSTOMER_JWT: customerToken,
      INVALID_SUB_CUSTOMER_JWT: invalidToken,
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(0);
    expect(output).not.toContain(customerToken);
    expect(output).not.toContain(adminToken);
    expect(output).not.toContain(invalidToken);
    expect(existsSync(curlMarker)).toBe(false);
  });

  it('requires MONGO_URI before creating token files or making a network call', () => {
    const invalidSubToken = `header.${Buffer.from(
      JSON.stringify({ userId: 'invalid-qa-user' }),
    ).toString('base64url')}.signature`;
    const result = run({
      API_URL: 'https://api-staging.gogocash.co',
      MODE: 'apply',
      CONFIRM_NONPROD_WRITE: 'issue-34',
      ADMIN_JWT: 'admin-secret-token',
      CUSTOMER_JWT: 'customer-secret-token',
      INVALID_SUB_CUSTOMER_JWT: invalidSubToken,
      QA_COUPON_ID: '0123456789abcdef01234567',
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(2);
    expect(output).toContain('Missing required variable: MONGO_URI');
    expect(output).not.toContain('admin-secret-token');
    expect(output).not.toContain('customer-secret-token');
    expect(output).not.toContain(invalidSubToken);
    expect(existsSync(curlMarker)).toBe(false);
  });

  it('uses MONGO_URI only through process env for raw before/after deeplink counts', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    expect(source).toContain('process.env.MONGO_URI');
    expect(source).toContain('collection("deeplinks")');
    expect(source).toContain('countDocuments');
    expect(source).toContain('DEEPLINK_COUNT_BEFORE');
    expect(source).toContain('DEEPLINK_COUNT_AFTER');
    expect(source).not.toMatch(/process\.argv[^\n]*MONGO_URI/);
  });

  it('keeps the acceptance deeplink body DTO-valid while malformed identity stays JWT-only', async () => {
    const markerPayload = {
      offer_id: 9_123_456_789_012,
      merchant_id: 8_123_456_789_012,
      deeplink: 'QA #34 inert deeplink validation-only',
    };
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateAffiliateDto,
    };
    const pipe = new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS);

    await expect(pipe.transform(markerPayload, metadata)).resolves.toEqual(
      markerPayload,
    );
    await expect(
      pipe.transform(
        { ...markerPayload, user_id: 'not-a-valid-object-id' },
        metadata,
      ),
    ).rejects.toMatchObject({ status: 400 });

    const source = readFileSync(SCRIPT, 'utf8');
    expect(source).toContain('DEEPLINK_INPUT_MARKER=');
    expect(source).toContain('deeplink: process.env.DEEPLINK_INPUT_MARKER');
    expect(source).not.toContain('deeplink: "",');
  });

  const canonicalCoupon = () => ({
    _id: '1123456789abcdef01234567',
    name: 'QA #34 canonical coupon',
    description: '',
    code: 'QA34',
    code_enabled: true,
    offer_id: {
      _id: '2123456789abcdef01234567',
      offer_name: 'QA offer',
    },
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    start_time: '09:00',
    end_time: '22:00',
    eligibility: '',
    min_spend: '',
    min_spend_currency: 'THB',
    max_cap: 500,
    max_cap_enabled: true,
    max_cap_currency: 'THB',
    discount: 10,
    discount_type: 'percent',
    discount_currency: 'THB',
    quantity: 100,
    unlimited_amount_enabled: false,
    one_time_use_enabled: false,
    usage_per_user: 3,
    link: '',
    terms_and_conditions: 'Canonical QA terms.',
    disabled: true,
  });

  it('accepts a fully canonical coupon snapshot without network access', () => {
    const result = run(
      {
        API_URL: 'https://api-staging.gogocash.co',
        MODE: 'validate-coupon-json',
      },
      JSON.stringify(canonicalCoupon()),
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Coupon restore preflight passed');
    expect(existsSync(curlMarker)).toBe(false);
  });

  it.each([
    [
      'missing canonical field',
      () => {
        const coupon = canonicalCoupon();
        delete (coupon as Partial<typeof coupon>).terms_and_conditions;
        return coupon;
      },
    ],
    [
      'disabled code with retained code',
      () => ({ ...canonicalCoupon(), code_enabled: false }),
    ],
    [
      'disabled max cap with nonzero value',
      () => ({ ...canonicalCoupon(), max_cap_enabled: false }),
    ],
    [
      'one-time coupon with noncanonical usage limit',
      () => ({ ...canonicalCoupon(), one_time_use_enabled: true }),
    ],
    [
      'normalization-sensitive whitespace',
      () => ({ ...canonicalCoupon(), terms_and_conditions: ' trailing ' }),
    ],
  ])(
    'refuses %s before any coupon mutation or network call',
    (_label, buildCoupon) => {
      const result = run(
        {
          API_URL: 'https://api-staging.gogocash.co',
          MODE: 'validate-coupon-json',
        },
        JSON.stringify(buildCoupon()),
      );

      expect(result.status).toBe(3);
      expect(result.stderr).toContain('Coupon restore preflight failed');
      expect(existsSync(curlMarker)).toBe(false);
    },
  );

  it('orders live coupon preflight before the mutation-owned flag', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const preflightCall = source.indexOf(
      'COUPON_JSON" | coupon_restore_preflight',
    );
    const touchedFlag = source.lastIndexOf('COUPON_TOUCHED=1');

    expect(preflightCall).toBeGreaterThan(-1);
    expect(touchedFlag).toBeGreaterThan(preflightCall);
  });
});
