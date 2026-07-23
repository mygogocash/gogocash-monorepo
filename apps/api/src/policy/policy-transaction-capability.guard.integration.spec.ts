import {
  CallHandler,
  ExecutionContext,
  INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';

import { PolicyAggregateService } from './policy-aggregate.service';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { PolicyTransactionCapabilityGuard } from './policy-transaction-capability.guard';
import { CategoryIntegrityService } from './category-integrity.service';
import { CategoryIntegrityReadinessGuard } from './category-integrity-readiness.guard';

jest.mock('src/common/multer-upload-buffer', () => ({
  readMulterUploadBuffer: jest.fn(),
}));

jest.mock('@nestjs/platform-express', () => {
  const actual = jest.requireActual('@nestjs/platform-express');
  return {
    ...actual,
    FileInterceptor: () =>
      class MultipartProbeInterceptor {
        intercept(_context: ExecutionContext, next: CallHandler) {
          (
            globalThis as typeof globalThis & {
              __policyMultipartProbe?: () => void;
            }
          ).__policyMultipartProbe?.();
          return next.handle();
        }
      },
  };
});

describe('Policy transaction capability guard — HTTP ordering', () => {
  let app: INestApplication;
  const multipartGlobal = globalThis as typeof globalThis & {
    __policyMultipartProbe?: () => void;
  };
  let hadMultipartProbe = false;
  let originalMultipartProbe: (() => void) | undefined;
  const aggregate = {
    assertTransactionsAvailable: jest.fn(),
    getTransactionCapability: jest.fn(),
    execute: jest.fn(),
  };
  const multipartProbe = jest.fn();

  beforeAll(async () => {
    jest.useRealTimers();
    hadMultipartProbe = Object.prototype.hasOwnProperty.call(
      multipartGlobal,
      '__policyMultipartProbe',
    );
    originalMultipartProbe = multipartGlobal.__policyMultipartProbe;
    multipartGlobal.__policyMultipartProbe = multipartProbe;
    aggregate.assertTransactionsAvailable.mockRejectedValue(
      new ServiceUnavailableException(
        'Policy aggregate saves require MongoDB replica set or mongos transaction support.',
      ),
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        PolicyTransactionCapabilityGuard,
        CategoryIntegrityReadinessGuard,
        { provide: PolicyService, useValue: {} },
        { provide: PolicyAggregateService, useValue: aggregate },
        {
          provide: CategoryIntegrityService,
          useValue: {
            assertReady: jest.fn().mockResolvedValue(undefined),
            fenceReady: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue({
        canActivate: jest.fn((context: ExecutionContext) => {
          // Mirror the real guard: attach the decoded admin payload so the
          // route's RolesGuard (support+, #377) authorises and the request
          // reaches the capability guard under test.
          context.switchToHttp().getRequest().user = { role: 'support' };
          return true;
        }),
      })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (hadMultipartProbe) {
        multipartGlobal.__policyMultipartProbe = originalMultipartProbe;
      } else {
        delete multipartGlobal.__policyMultipartProbe;
      }
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });

  it('returns 503 before the multipart interceptor, file read, or command/upload code', async () => {
    const response = await request(app.getHttpServer())
      .put('/policy/aggregate')
      .field('request_key', 'policy-save-guard-test')
      .field('category_name', 'Guard test')
      .field('icon_key', 'travel')
      .field('policy', '{}')
      .attach('default_banner', Buffer.from('not-read'), {
        filename: 'oversized.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(503);
    expect(response.body.message).toContain('replica set or mongos');
    expect(multipartProbe).not.toHaveBeenCalled();
    expect(readMulterUploadBuffer).not.toHaveBeenCalled();
    expect(aggregate.execute).not.toHaveBeenCalled();
  });
});
