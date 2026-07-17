import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { createHmac } from 'node:crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { ROLES_KEY } from 'src/admin/roles.decorator';
import { RolesGuard } from 'src/admin/roles.guard';

import {
  PolicyQaFailureInjectionDto,
  PolicyQaFailureInjectionDisarmDto,
} from './dto/policy-qa-failure-injection.dto';
import { PolicyQaFailureInjectionController } from './policy-qa-failure-injection.controller';
import { PolicyQaFailureInjectionHook } from './policy-qa-failure-injection.hook';
import {
  POLICY_QA_FAILURE_INJECTION_SENTINEL,
  PolicyQaFailureInjectionGuard,
  policyQaFailureInjectionCanonicalConfirmation,
} from './policy-qa-failure-injection.guard';

const revision = 'a'.repeat(40);
const secret = 's'.repeat(32);
const marker = 'policy-qa-dev-failure-owner';
const requestKey = `${marker}-after-media-put`;

const armBody = {
  environment: 'dev' as const,
  candidate_sha: revision,
  marker,
  request_key: requestKey,
  failure_point: 'after-media-put-before-db-commit' as const,
  ttl_seconds: 30,
  one_shot: true as const,
};

function context(
  body: Record<string, unknown>,
  method = 'POST',
  confirmation = policyQaFailureInjectionCanonicalConfirmation(
    method,
    body,
    secret,
  ),
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        body,
        headers: { 'x-policy-qa-failure-confirmation': confirmation },
      }),
    }),
  } as never;
}

describe('Policy QA failure injection contract', () => {
  it('accepts only the exact one-shot after-media-put failpoint DTO', async () => {
    await expect(
      validate(plainToInstance(PolicyQaFailureInjectionDto, armBody)),
    ).resolves.toEqual([]);

    for (const patch of [
      { failure_point: 'after-commit' },
      { one_shot: false },
      { ttl_seconds: 0 },
      { ttl_seconds: 61 },
      { candidate_sha: 'ABC' },
      { environment: 'production' },
    ]) {
      const errors = await validate(
        plainToInstance(PolicyQaFailureInjectionDto, {
          ...armBody,
          ...patch,
        }),
      );
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('accepts a narrowly bound disarm DTO without a failpoint or TTL', async () => {
    const dto = plainToInstance(PolicyQaFailureInjectionDisarmDto, {
      environment: 'dev',
      candidate_sha: revision,
      marker,
      request_key: requestKey,
    });
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('fails closed by default and in production', () => {
    expect(() =>
      new PolicyQaFailureInjectionGuard({}).canActivate(context(armBody)),
    ).toThrow(ForbiddenException);
    expect(() =>
      new PolicyQaFailureInjectionGuard({
        RAILWAY_ENVIRONMENT_NAME: 'production',
        RAILWAY_GIT_COMMIT_SHA: revision,
        POLICY_QA_FAILURE_INJECTION_ENABLED:
          POLICY_QA_FAILURE_INJECTION_SENTINEL,
        POLICY_QA_FAILURE_INJECTION_SECRET: secret,
      }).canActivate(context(armBody)),
    ).toThrow(ForbiddenException);
  });

  it('requires exact env/SHA/marker/request binding, sentinel, secret, and timing-safe HMAC', () => {
    const guard = new PolicyQaFailureInjectionGuard({
      RAILWAY_ENVIRONMENT_NAME: 'dev',
      RAILWAY_GIT_COMMIT_SHA: revision,
      POLICY_QA_FAILURE_INJECTION_ENABLED: POLICY_QA_FAILURE_INJECTION_SENTINEL,
      POLICY_QA_FAILURE_INJECTION_SECRET: secret,
    });
    expect(guard.canActivate(context(armBody))).toBe(true);

    for (const badBody of [
      { ...armBody, environment: 'staging' },
      { ...armBody, candidate_sha: 'b'.repeat(40) },
      { ...armBody, marker: 'policy-qa-staging-failure-owner' },
      { ...armBody, request_key: 'unowned-request' },
      { ...armBody, one_shot: false },
    ]) {
      expect(() => guard.canActivate(context(badBody))).toThrow(
        ForbiddenException,
      );
    }

    expect(() =>
      guard.canActivate(context(armBody, 'POST', '0'.repeat(64))),
    ).toThrow(ForbiddenException);
    expect(() =>
      new PolicyQaFailureInjectionGuard({
        RAILWAY_ENVIRONMENT_NAME: 'dev',
        RAILWAY_GIT_COMMIT_SHA: revision,
        POLICY_QA_FAILURE_INJECTION_ENABLED:
          POLICY_QA_FAILURE_INJECTION_SENTINEL,
        POLICY_QA_FAILURE_INJECTION_SECRET: 'short',
      }).canActivate(context(armBody)),
    ).toThrow(ForbiddenException);
  });

  it('uses an action-bound HMAC rather than accepting the raw secret', () => {
    const actual = policyQaFailureInjectionCanonicalConfirmation(
      'POST',
      armBody,
      secret,
    );
    expect(actual).toBe(
      createHmac('sha256', secret)
        .update(
          [
            'POST',
            armBody.environment,
            armBody.candidate_sha,
            armBody.marker,
            armBody.request_key,
            armBody.failure_point,
            armBody.ttl_seconds,
            'true',
          ].join('\n'),
        )
        .digest('hex'),
    );
    expect(actual).not.toBe(secret);
  });

  it('arms with a short TTL, consumes exactly once, and can explicitly disarm', () => {
    let now = 1_000;
    const hook = new PolicyQaFailureInjectionHook(() => now);
    const armed = hook.armOneShot(armBody);
    expect(armed).toMatchObject({
      armed: true,
      one_shot: true,
      failure_point: 'after-media-put-before-db-commit',
      request_key: requestKey,
    });

    expect(hook.consumeOnce(armBody)).toBe(true);
    expect(hook.consumeOnce(armBody)).toBe(false);

    hook.armOneShot({ ...armBody, request_key: `${marker}-disarm` });
    expect(hook.disarm({ marker, request_key: `${marker}-disarm` })).toBe(true);
    expect(
      hook.consumeOnce({ ...armBody, request_key: `${marker}-disarm` }),
    ).toBe(false);

    hook.armOneShot({
      ...armBody,
      request_key: `${marker}-expires`,
      ttl_seconds: 1,
    });
    now += 1_001;
    expect(
      hook.consumeOnce({ ...armBody, request_key: `${marker}-expires` }),
    ).toBe(false);
  });

  it('controller is support-protected and returns no secret material', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      PolicyQaFailureInjectionController,
    );
    expect(guards).toEqual([
      AuthAdminGuard,
      RolesGuard,
      PolicyQaFailureInjectionGuard,
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, PolicyQaFailureInjectionController),
    ).toEqual(['support']);

    const hook = new PolicyQaFailureInjectionHook(() => 1_000);
    const controller = new PolicyQaFailureInjectionController(hook);
    const response = controller.arm(armBody);
    expect(response).toMatchObject({
      armed: true,
      one_shot: true,
      environment: 'dev',
      candidate_sha: revision,
      marker,
      request_key: requestKey,
      failure_point: 'after-media-put-before-db-commit',
    });
    expect(JSON.stringify(response)).not.toContain(secret);
  });
});
