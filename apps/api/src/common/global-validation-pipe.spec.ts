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
import { TelegramAuthDto, FirebaseIdTokenDto } from '../auth/dto/auth.dto';
import { DiscoverReorderDto } from '../admin/discover/discover.dto';
import { CreateWithdrawDto } from '../withdraw/dto/create-withdraw.dto';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from './validation-pipe.options';

/**
 * Integration test for the GLOBAL ValidationPipe wired in main.ts (#46 / V-1).
 *
 * Unit tests call controllers directly and bypass the pipe, so they cannot
 * prove a real request is validated/accepted. This boots a real Nest app with
 * the EXACT pipe config from main.ts and exercises it over HTTP.
 */

@Controller('pipe-test')
class PipeTestController {
  @Post('withdraw')
  withdraw(@Body() dto: CreateWithdrawDto) {
    return { ok: true, dto };
  }

  @Post('telegram')
  telegram(@Body() dto: TelegramAuthDto) {
    return { ok: true, dto };
  }

  @Post('firebase-token')
  firebaseToken(@Body() dto: FirebaseIdTokenDto) {
    return { ok: true, dto };
  }

  @Post('discover-reorder')
  discoverReorder(@Body() dto: DiscoverReorderDto) {
    return { ok: true, dto };
  }
}

describe('global ValidationPipe wiring (#46 whitelist)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PipeTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
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

  it('rejects a negative amount_net with 400 (decorators enforced)', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: -5, currency: 'USD' })
      .expect(400));

  it('rejects an unsupported currency with 400', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: 10, currency: 'EUR' })
      .expect(400));

  it('rejects unknown withdraw fields with 400 (whitelist + forbidNonWhitelisted)', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: 10, currency: 'USD', evil: true })
      .expect(400));

  it('accepts a valid TelegramAuthDto body', () =>
    request(app.getHttpServer())
      .post('/pipe-test/telegram')
      .send({
        id: 12345,
        first_name: 'Ada',
        auth_date: 1_700_000_000,
        hash: 'abc123',
      })
      .expect(201));

  it('rejects TelegramAuthDto bodies with unknown fields', () =>
    request(app.getHttpServer())
      .post('/pipe-test/telegram')
      .send({
        id: 12345,
        first_name: 'Ada',
        auth_date: 1_700_000_000,
        hash: 'abc123',
        injected: 'nope',
      })
      .expect(400));

  it('rejects TelegramAuthDto bodies missing required fields', () =>
    request(app.getHttpServer())
      .post('/pipe-test/telegram')
      .send({ first_name: 'Ada' })
      .expect(400));

  it('accepts FirebaseIdTokenDto and rejects unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/pipe-test/firebase-token')
      .send({ idToken: 'tok' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/pipe-test/firebase-token')
      .send({ idToken: 'tok', evil: true })
      .expect(400);
  });

  it('accepts DiscoverReorderDto and rejects empty order', async () => {
    await request(app.getHttpServer())
      .post('/pipe-test/discover-reorder')
      .send({ order: ['a', 'b'] })
      .expect(201);
    await request(app.getHttpServer())
      .post('/pipe-test/discover-reorder')
      .send({ order: [] })
      .expect(400);
  });
});
