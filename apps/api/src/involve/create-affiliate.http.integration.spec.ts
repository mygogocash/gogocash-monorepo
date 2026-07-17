import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { ApiKeyGuard } from 'src/common/api-key.guard';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from 'src/common/validation-pipe.options';
import { ConversionIngestService } from './conversion-ingest.service';
import { InvolvePostbackTokenGuard } from './involve-postback-token.guard';
import { InvolveController } from './involve.controller';
import { InvolveService } from './involve.service';

describe('POST /involve/create-affiliate abuse boundaries', () => {
  let app: INestApplication;
  const createAffiliate = jest.fn().mockResolvedValue({ deeplink: 'safe' });
  const capture = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const authenticated = {
      canActivate: (context: any) => {
        context.switchToHttp().getRequest().user = {
          sub: '507f1f77bcf86cd799439011',
        };
        return true;
      },
    };
    const allow = { canActivate: () => true };
    const moduleRef = await Test.createTestingModule({
      controllers: [InvolveController],
      providers: [
        RateLimitGuard,
        Reflector,
        { provide: InvolveService, useValue: { createAffiliate } },
        { provide: AnalyticsService, useValue: { capture } },
        {
          provide: ConversionIngestService,
          useValue: { upsertFromPostback: jest.fn() },
        },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(authenticated)
      .overrideGuard(AuthAdminGuard)
      .useValue(allow)
      .overrideGuard(ApiKeyGuard)
      .useValue(allow)
      .overrideGuard(InvolvePostbackTokenGuard)
      .useValue(allow)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  beforeEach(() => {
    createAffiliate.mockClear();
    capture.mockClear();
  });

  afterAll(async () => app.close());

  const validBody = (deeplink = '') => ({
    offer_id: 5031,
    merchant_id: 103877,
    deeplink,
  });

  it.each([
    ['empty general destination', ''],
    [
      'exact coupon query',
      'https://merchant.example/deal?coupon=SAVE%2020&src=app',
    ],
  ])(
    'accepts the %s without changing its destination',
    async (_label, deeplink) => {
      const response = await request(app.getHttpServer())
        .post('/involve/create-affiliate')
        .set('CF-Connecting-IP', `203.0.113.${deeplink ? 10 : 11}`)
        .send(validBody(deeplink));

      expect(response.status).toBe(201);
      expect(createAffiliate).toHaveBeenCalledWith(
        expect.objectContaining({ deeplink }),
        '507f1f77bcf86cd799439011',
      );
    },
  );

  it('rejects an oversized destination before the mint service can reserve or call a provider', async () => {
    const response = await request(app.getHttpServer())
      .post('/involve/create-affiliate')
      .set('CF-Connecting-IP', '203.0.113.12')
      .send(validBody(`https://merchant.example/?q=${'a'.repeat(2021)}`));

    expect(response.status).toBe(400);
    expect(createAffiliate).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('returns 429 on attempt eleven and does not enter the mint service', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/involve/create-affiliate')
        .set('CF-Connecting-IP', '203.0.113.13')
        .send(validBody());
      expect({
        attempt: attempt + 1,
        status: response.status,
        body: response.body,
      }).toEqual({
        attempt: attempt + 1,
        status: 201,
        body: { deeplink: 'safe' },
      });
    }
    createAffiliate.mockClear();
    capture.mockClear();

    const blocked = await request(app.getHttpServer())
      .post('/involve/create-affiliate')
      .set('CF-Connecting-IP', '203.0.113.13')
      .send(validBody());

    expect(blocked.status).toBe(429);
    expect(createAffiliate).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
});
