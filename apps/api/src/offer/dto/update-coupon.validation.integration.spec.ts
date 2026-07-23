import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';
import { UpdateCouponDto } from './update-offer.dto';

const couponWrite = jest.fn((body: UpdateCouponDto) => ({ ok: true, body }));

@Controller('coupon-validation-test')
class CouponValidationController {
  @Post()
  update(@Body() body: UpdateCouponDto) {
    return couponWrite(body);
  }
}

describe('UpdateCouponDto global ValidationPipe integration', () => {
  let app: INestApplication;
  let socketDirectory: string;
  let socketPath: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CouponValidationController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
    socketDirectory = mkdtempSync(join(tmpdir(), 'coupon-validation-http-'));
    socketPath = join(socketDirectory, 'api.sock');
    await new Promise<void>((resolve, reject) => {
      app.getHttpServer().once('error', reject).listen(socketPath, resolve);
    });
  });

  beforeEach(() => couponWrite.mockClear());

  afterAll(async () => {
    await app.close();
    rmSync(socketDirectory, { force: true, recursive: true });
  });

  const postCoupon = (body: Record<string, unknown>) =>
    new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const payload = JSON.stringify(body);
      const request = httpRequest(
        {
          socketPath,
          path: '/coupon-validation-test',
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(payload),
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          response.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let responseBody: unknown = raw;
            try {
              responseBody = JSON.parse(raw);
            } catch {
              // Keep the raw body for a useful assertion failure.
            }
            resolve({ status: response.statusCode ?? 0, body: responseBody });
          });
        },
      );
      request.once('error', reject);
      request.end(payload);
    });

  const validBody = () => ({
    name: 'Safe coupon',
    offer_id: '507f1f77bcf86cd799439011',
    start_date: '2026-07-01',
    end_date: '2026-07-31',
  });

  const optionalFields = [
    'description',
    'code',
    'code_enabled',
    'start_time',
    'end_time',
    'eligibility',
    'min_spend',
    'min_spend_currency',
    'max_cap',
    'max_cap_enabled',
    'max_cap_currency',
    'discount',
    'discount_type',
    'discount_currency',
    'id',
    'disabled',
    'quantity',
    'unlimited_amount_enabled',
    'one_time_use_enabled',
    'usage_per_user',
    'link',
    'terms_and_conditions',
  ] as const;

  it.each([123, [], {}, null])(
    'given JSON min_spend=%p > then returns 400 and never enters the write handler',
    async (minSpend) => {
      const response = await postCoupon({
        ...validBody(),
        min_spend: minSpend,
      });

      expect(response.status).toBe(400);
      expect(couponWrite).not.toHaveBeenCalled();
    },
  );

  it.each(
    optionalFields.flatMap((field) =>
      [null, [], {}].map((value) => [field, value] as const),
    ),
  )(
    'given malformed optional %s=%p > then returns 400 and never enters the handler',
    async (field, value) => {
      const response = await postCoupon({ ...validBody(), [field]: value });

      expect(response.status).toBe(400);
      expect(couponWrite).not.toHaveBeenCalled();
    },
  );

  it('given a valid string min_spend and currency > then reaches the handler', async () => {
    const response = await postCoupon({
      ...validBody(),
      min_spend: '500',
      min_spend_currency: 'THB',
    });

    expect(response.status).toBe(201);
    expect(couponWrite).toHaveBeenCalledTimes(1);
  });
});
