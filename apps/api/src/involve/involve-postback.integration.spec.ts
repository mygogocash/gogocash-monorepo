import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { ApiKeyGuard } from 'src/common/api-key.guard';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { InvolveController } from './involve.controller';
import { InvolveService } from './involve.service';
import { ConversionIngestService } from './conversion-ingest.service';
import { InvolvePostbackTokenGuard } from './involve-postback-token.guard';

describe('GET /involve/postback (integration)', () => {
  let app: INestApplication;
  const ORIGINAL_SECRET = process.env.INVOLVE_POSTBACK_SECRET;

  const involveService = {
    findAll: jest.fn(),
    checkOfferDuplicate: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createAffiliate: jest.fn(),
    createAffiliateAi: jest.fn(),
    getConversion: jest.fn(),
    getConversationAllPage: jest.fn(),
  };
  const conversionIngestService = {
    upsertFromPostback: jest.fn().mockResolvedValue('skipped'),
  };
  const analytics = { capture: jest.fn() };
  const allow = { canActivate: () => true };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [InvolveController],
      providers: [
        InvolvePostbackTokenGuard,
        { provide: InvolveService, useValue: involveService },
        { provide: ConversionIngestService, useValue: conversionIngestService },
        { provide: AnalyticsService, useValue: analytics },
      ],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue(allow)
      .overrideGuard(FirebaseAuthGuard)
      .useValue(allow)
      .overrideGuard(ApiKeyGuard)
      .useValue(allow)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    if (ORIGINAL_SECRET === undefined)
      delete process.env.INVOLVE_POSTBACK_SECRET;
    else process.env.INVOLVE_POSTBACK_SECRET = ORIGINAL_SECRET;
  });

  it('returns 401 when INVOLVE_POSTBACK_SECRET is not configured', async () => {
    delete process.env.INVOLVE_POSTBACK_SECRET;

    const res = await request(app.getHttpServer()).get(
      '/involve/postback?token=anything',
    );

    expect(res.status).toBe(401);
    // Client must get generic, leak-free copy (the real cause is logged server-side).
    expect(res.body.message).toMatch(/temporarily unavailable/i);
    expect(res.body.message).not.toMatch(/postback secret|not configured/i);
    expect(conversionIngestService.upsertFromPostback).not.toHaveBeenCalled();
  });

  it('returns 401 when token query param does not match', async () => {
    process.env.INVOLVE_POSTBACK_SECRET = 'expected-postback-secret';

    const res = await request(app.getHttpServer()).get(
      '/involve/postback?token=wrong-token',
    );

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid postback token/i);
    expect(conversionIngestService.upsertFromPostback).not.toHaveBeenCalled();
  });

  it('returns 200 OK when token matches INVOLVE_POSTBACK_SECRET', async () => {
    process.env.INVOLVE_POSTBACK_SECRET = 'expected-postback-secret';

    const res = await request(app.getHttpServer()).get(
      '/involve/postback?token=expected-postback-secret&conversion_id=test_conversion_id&offer_id=123',
    );

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
    expect(conversionIngestService.upsertFromPostback).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'expected-postback-secret',
        conversion_id: 'test_conversion_id',
        offer_id: '123',
      }),
    );
  });
});
