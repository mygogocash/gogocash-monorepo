import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { POLICY_QA_FAILURE_POINT } from './dto/policy-qa-failure-injection.dto';

export const POLICY_QA_FAILURE_INJECTION_SENTINEL =
  'policy-qa-failure-injection-v1' as const;
export const POLICY_QA_FAILURE_INJECTION_ENV = Symbol(
  'POLICY_QA_FAILURE_INJECTION_ENV',
);

type FailureInjectionBody = Record<string, unknown>;

function canonicalFields(method: string, body: FailureInjectionBody) {
  const common = [
    method.toUpperCase(),
    body.environment,
    body.candidate_sha,
    body.marker,
    body.request_key,
  ];
  return method.toUpperCase() === 'POST'
    ? [...common, body.failure_point, body.ttl_seconds, String(body.one_shot)]
    : common;
}

export function policyQaFailureInjectionCanonicalConfirmation(
  method: string,
  body: FailureInjectionBody,
  secret: string,
) {
  return createHmac('sha256', secret)
    .update(canonicalFields(method, body).join('\n'))
    .digest('hex');
}

function exactKeys(body: FailureInjectionBody, expected: string[]) {
  const keys = Object.keys(body).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index])
  );
}

function deny(): never {
  throw new ForbiddenException('Policy QA failure injection is unavailable');
}

@Injectable()
export class PolicyQaFailureInjectionGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject(POLICY_QA_FAILURE_INJECTION_ENV)
    private readonly environment: NodeJS.ProcessEnv = process.env,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method?: unknown;
      body?: unknown;
      headers?: Record<string, unknown>;
    }>();
    const method =
      typeof request.method === 'string' ? request.method.toUpperCase() : '';
    if (method !== 'POST' && method !== 'DELETE') deny();
    const body =
      request.body &&
      typeof request.body === 'object' &&
      !Array.isArray(request.body)
        ? (request.body as FailureInjectionBody)
        : deny();
    const expectedKeys =
      method === 'POST'
        ? [
            'environment',
            'candidate_sha',
            'marker',
            'request_key',
            'failure_point',
            'ttl_seconds',
            'one_shot',
          ]
        : ['environment', 'candidate_sha', 'marker', 'request_key'];
    if (!exactKeys(body, expectedKeys)) deny();

    const deployedEnvironment = this.environment.RAILWAY_ENVIRONMENT_NAME;
    const deployedRevision = this.environment.RAILWAY_GIT_COMMIT_SHA;
    const enabled = this.environment.POLICY_QA_FAILURE_INJECTION_ENABLED;
    const secret = this.environment.POLICY_QA_FAILURE_INJECTION_SECRET;
    if (
      (deployedEnvironment !== 'dev' && deployedEnvironment !== 'staging') ||
      !/^[a-f0-9]{40}$/.test(deployedRevision ?? '') ||
      enabled !== POLICY_QA_FAILURE_INJECTION_SENTINEL ||
      typeof secret !== 'string' ||
      Buffer.byteLength(secret, 'utf8') < 32
    ) {
      deny();
    }

    if (
      body.environment !== deployedEnvironment ||
      body.candidate_sha !== deployedRevision ||
      typeof body.marker !== 'string' ||
      !new RegExp(`^policy-qa-${deployedEnvironment}-[a-z0-9-]{3,96}$`).test(
        body.marker,
      ) ||
      typeof body.request_key !== 'string' ||
      !body.request_key.startsWith(`${body.marker}-`)
    ) {
      deny();
    }
    if (
      method === 'POST' &&
      (body.failure_point !== POLICY_QA_FAILURE_POINT ||
        body.one_shot !== true ||
        !Number.isInteger(body.ttl_seconds) ||
        Number(body.ttl_seconds) < 1 ||
        Number(body.ttl_seconds) > 60)
    ) {
      deny();
    }

    const supplied = request.headers?.['x-policy-qa-failure-confirmation'];
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)) {
      deny();
    }
    const expected = policyQaFailureInjectionCanonicalConfirmation(
      method,
      body,
      secret,
    );
    const suppliedBytes = Buffer.from(supplied, 'hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      deny();
    }
    return true;
  }
}
