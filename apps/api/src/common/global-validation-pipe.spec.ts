import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreateWithdrawDto } from '../withdraw/dto/create-withdraw.dto';

/**
 * Integration test for the GLOBAL ValidationPipe wired in main.ts (V-1).
 *
 * Unit tests call controllers directly and bypass the pipe, so they cannot
 * prove a real request is validated/accepted. This boots a real Nest app with
 * the EXACT pipe config from main.ts and exercises it over HTTP:
 *   - decorated money DTO  -> valid accepted, garbage rejected (the fix)
 *   - decorator-less DTO    -> NOT rejected (the regression guard; a plain
 *     ValidationPipe 400s decorator-less classes under class-validator 0.15,
 *     which would have broken Telegram login etc.)
 */

// Stand-in for a legacy decorator-less @Body() DTO (e.g. TelegramAuthDto).
class PlainBodyDto {
  id: number;
  hash: string;
}

@Controller('pipe-test')
class PipeTestController {
  @Post('withdraw')
  withdraw(@Body() dto: CreateWithdrawDto) {
    return { ok: true, dto };
  }

  @Post('plain')
  plain(@Body() dto: PlainBodyDto) {
    return { ok: true, dto };
  }
}

describe('global ValidationPipe wiring (V-1 integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PipeTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts EXACTLY — if this drifts, the test is meaningless.
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, forbidUnknownValues: false }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid withdraw body', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: 10, currency: 'USD' })
      .expect(201));

  it('rejects a negative amount_net with 400 (decorators now enforced)', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: -5, currency: 'USD' })
      .expect(400));

  it('rejects an unsupported currency with 400', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: 10, currency: 'EUR' })
      .expect(400));

  it('does NOT 400 a decorator-less DTO body (Telegram-login regression guard)', () =>
    request(app.getHttpServer())
      .post('/pipe-test/plain')
      .send({ id: 1, hash: 'abc' })
      .expect(201));
});
