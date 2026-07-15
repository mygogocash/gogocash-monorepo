import { Controller, INestApplication, Post, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { RateLimit } from './rate-limit.decorator';
import { RATE_LIMIT_KEY, RateLimitGuard } from './rate-limit.guard';

@Controller('phone-eligibility-rate-limit-harness')
class PhoneEligibilityRateLimitHarnessController {
  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, max: 5 })
  check() {
    return { eligible: true };
  }
}

describe('phone sign-in eligibility rate limiting', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PhoneEligibilityRateLimitHarnessController],
      providers: [RateLimitGuard, Reflector],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('pins the production endpoint to five checks per minute', () => {
    const config = Reflect.getMetadata(
      RATE_LIMIT_KEY,
      AuthController.prototype.phoneSignInEligibility,
    );

    expect(config).toEqual({ windowMs: 60_000, max: 5 });
  });

  it('rejects the sixth request from the same edge IP', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/phone-eligibility-rate-limit-harness')
        .set('CF-Connecting-IP', '203.0.113.7');
      expect(response.status).toBe(201);
    }

    const blocked = await request(app.getHttpServer())
      .post('/phone-eligibility-rate-limit-harness')
      .set('CF-Connecting-IP', '203.0.113.7');

    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/too quickly/i);
  });
});
