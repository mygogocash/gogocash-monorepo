import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RolesGuard } from 'src/admin/roles.guard';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from 'src/common/validation-pipe.options';
import { CreateWithdrawDto } from 'src/withdraw/dto/create-withdraw.dto';

import { PolicyQaFailureInjectionController } from './policy-qa-failure-injection.controller';
import { PolicyQaFailureInjectionHook } from './policy-qa-failure-injection.hook';
import {
  POLICY_QA_FAILURE_INJECTION_ENV,
  POLICY_QA_FAILURE_INJECTION_SENTINEL,
  PolicyQaFailureInjectionGuard,
  policyQaFailureInjectionCanonicalConfirmation,
} from './policy-qa-failure-injection.guard';

@Controller('policy-qa-validation-probe')
class PolicyQaValidationProbeController {
  @Post()
  probe(@Body() dto: CreateWithdrawDto) {
    return { ok: true, dto };
  }
}

describe('Policy QA failure injection HTTP boundary', () => {
  let app: INestApplication;
  let hook: PolicyQaFailureInjectionHook;
  const revision = 'b'.repeat(40);
  const secret = 'qa-secret-'.repeat(4);
  const marker = 'policy-qa-staging-http-owner';
  const armBody = {
    environment: 'staging',
    candidate_sha: revision,
    marker,
    request_key: `${marker}-one-shot`,
    failure_point: 'after-media-put-before-db-commit',
    ttl_seconds: 15,
    one_shot: true,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        PolicyQaFailureInjectionController,
        PolicyQaValidationProbeController,
      ],
      providers: [
        Reflector,
        RolesGuard,
        PolicyQaFailureInjectionGuard,
        PolicyQaFailureInjectionHook,
        {
          provide: POLICY_QA_FAILURE_INJECTION_ENV,
          useValue: {
            RAILWAY_ENVIRONMENT_NAME: 'staging',
            RAILWAY_GIT_COMMIT_SHA: revision,
            POLICY_QA_FAILURE_INJECTION_ENABLED:
              POLICY_QA_FAILURE_INJECTION_SENTINEL,
            POLICY_QA_FAILURE_INJECTION_SECRET: secret,
          },
        },
      ],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.listen(0, '127.0.0.1');
    hook = moduleRef.get(PolicyQaFailureInjectionHook);
  });

  beforeEach(() => {
    jest.useRealTimers();
    hook.disarm({ marker, request_key: armBody.request_key });
    jest.restoreAllMocks();
  });

  afterEach(() => {
    hook.disarm({ marker, request_key: armBody.request_key });
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('arms one exact short-lived injection and rejects duplicate arming', async () => {
    const confirmation = policyQaFailureInjectionCanonicalConfirmation(
      'POST',
      armBody,
      secret,
    );
    const first = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', confirmation)
      .send(armBody);
    if (first.status !== 201) {
      throw new Error(
        `expected arm HTTP 201, received ${first.status}: ${JSON.stringify(first.body)}`,
      );
    }
    expect(first.body).toMatchObject({
      armed: true,
      one_shot: true,
      environment: 'staging',
      candidate_sha: revision,
      marker,
      request_key: armBody.request_key,
      failure_point: 'after-media-put-before-db-commit',
    });
    expect(first.text).not.toContain(secret);

    const duplicate = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', confirmation)
      .send(armBody);
    expect(duplicate.status).toBe(409);
  });

  it('requires an exact signed body and rejects unknown fields', async () => {
    const forged = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', '0'.repeat(64))
      .send({ ...armBody, request_key: `${marker}-forged` });
    expect(forged.status).toBe(403);

    const unknownBody = {
      ...armBody,
      request_key: `${marker}-unknown`,
      repeat: true,
    };
    const unknown = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set(
        'x-policy-qa-failure-confirmation',
        policyQaFailureInjectionCanonicalConfirmation(
          'POST',
          unknownBody,
          secret,
        ),
      )
      .send(unknownBody);
    expect(unknown.status).toBe(403);
  });

  it('keeps global validation 400s and policy guard 403s isolated in both directions', async () => {
    await request(app.getHttpServer())
      .post('/policy-qa-validation-probe')
      .send({ amount_net: 10, currency: 'EUR' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', '0'.repeat(64))
      .send(armBody)
      .expect(403);

    await request(app.getHttpServer())
      .post('/policy-qa-validation-probe')
      .send({ amount_net: -1, currency: 'USD' })
      .expect(400);

    const confirmation = policyQaFailureInjectionCanonicalConfirmation(
      'POST',
      armBody,
      secret,
    );
    const arm = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', confirmation)
      .send(armBody);
    if (arm.status !== 201) {
      throw new Error(
        `expected mixed-order arm HTTP 201, received ${arm.status}: ${JSON.stringify(arm.body)}`,
      );
    }
  });

  it('keeps the policy guard and global validation isolated in reverse order', async () => {
    const confirmation = policyQaFailureInjectionCanonicalConfirmation(
      'POST',
      armBody,
      secret,
    );
    const arm = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', confirmation)
      .send(armBody);
    if (arm.status !== 201) {
      throw new Error(
        `expected reverse-order arm HTTP 201, received ${arm.status}: ${JSON.stringify(arm.body)}`,
      );
    }

    await request(app.getHttpServer())
      .post('/policy-qa-validation-probe')
      .send({ amount_net: 10, currency: 'EUR' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set('x-policy-qa-failure-confirmation', '0'.repeat(64))
      .send({ ...armBody, request_key: `${marker}-reverse-forged` })
      .expect(403);

    await request(app.getHttpServer())
      .post('/policy-qa-validation-probe')
      .send({ amount_net: 10, currency: 'USD' })
      .expect(201);
  });

  it('disarms only the exact signed marker/request pair', async () => {
    const arm = await request(app.getHttpServer())
      .post('/policy/qa/failure-injection')
      .set(
        'x-policy-qa-failure-confirmation',
        policyQaFailureInjectionCanonicalConfirmation('POST', armBody, secret),
      )
      .send(armBody);
    if (arm.status !== 201) {
      throw new Error(
        `expected disarm setup HTTP 201, received ${arm.status}: ${JSON.stringify(arm.body)}`,
      );
    }

    const body = {
      environment: 'staging',
      candidate_sha: revision,
      marker,
      request_key: armBody.request_key,
    };
    const response = await request(app.getHttpServer())
      .delete('/policy/qa/failure-injection')
      .set(
        'x-policy-qa-failure-confirmation',
        policyQaFailureInjectionCanonicalConfirmation('DELETE', body, secret),
      )
      .send(body);
    expect({ status: response.status, body: response.body }).toMatchObject({
      status: 200,
    });
    expect(response.body).toEqual({ ...body, disarmed: true });
  });
});
