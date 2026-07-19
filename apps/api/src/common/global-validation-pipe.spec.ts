import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { TelegramAuthDto, FirebaseIdTokenDto } from '../auth/dto/auth.dto';
import { DiscoverReorderDto } from '../admin/discover/discover.dto';
import { CreateWithdrawDto } from '../withdraw/dto/create-withdraw.dto';
import { WalletAdjustDto } from '../admin/wallets/dto/wallet.dto';
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

  @Post('wallet-adjust')
  walletAdjust(@Body() dto: WalletAdjustDto) {
    return { ok: true, dto };
  }
}

describe('global ValidationPipe wiring (#46 whitelist)', () => {
  let app: INestApplication;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PipeTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const expectStatus = async (
    pending: PromiseLike<Response>,
    status: number,
  ) => {
    const response = await pending;
    if (response.status !== status) {
      throw new Error(
        `expected HTTP ${status}, received ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
  };

  it('accepts a valid withdraw body', () =>
    request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: 10, currency: 'USD' })
      .expect(201));

  it('rejects a negative amount_net with 400 (decorators enforced)', () =>
    expectStatus(
      request(app.getHttpServer())
        .post('/pipe-test/withdraw')
        .send({ amount_net: -5, currency: 'USD' }),
      400,
    ));

  it('rejects an unsupported currency with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pipe-test/withdraw')
      .send({ amount_net: 10, currency: 'EUR' });
    expect({ status: response.status, body: response.body }).toMatchObject({
      status: 400,
    });
  });

  it('rejects unknown withdraw fields with 400 (whitelist + forbidNonWhitelisted)', () =>
    expectStatus(
      request(app.getHttpServer())
        .post('/pipe-test/withdraw')
        .send({ amount_net: 10, currency: 'USD', evil: true }),
      400,
    ));

  it('accepts a canonical wallet adjustment and trims its reason', () =>
    request(app.getHttpServer())
      .post('/pipe-test/wallet-adjust')
      .send({ type: 'credit', amount: 25, currency: 'thb', reason: ' Reward ' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.dto).toEqual({
          type: 'credit',
          amount: 25,
          currency: 'THB',
          reason: 'Reward',
        });
      }));

  it.each([
    { type: 'credit', amount: 0, currency: 'THB', reason: 'Reward' },
    { type: 'credit', amount: -1, currency: 'THB', reason: 'Reward' },
    { type: 'credit', amount: 25, currency: 'BTC', reason: 'Reward' },
    { type: 'credit', amount: 25, currency: 'THB', reason: '   ' },
    {
      type: 'credit',
      amount: 25,
      currency: 'THB',
      reason: 'Reward',
      adminId: 'spoofed-admin',
    },
  ])('rejects unsafe wallet adjustment body %j', (body) =>
    expectStatus(
      request(app.getHttpServer()).post('/pipe-test/wallet-adjust').send(body),
      400,
    ),
  );

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
    expectStatus(
      request(app.getHttpServer()).post('/pipe-test/telegram').send({
        id: 12345,
        first_name: 'Ada',
        auth_date: 1_700_000_000,
        hash: 'abc123',
        injected: 'nope',
      }),
      400,
    ));

  it('rejects TelegramAuthDto bodies missing required fields', () =>
    expectStatus(
      request(app.getHttpServer())
        .post('/pipe-test/telegram')
        .send({ first_name: 'Ada' }),
      400,
    ));

  it('accepts FirebaseIdTokenDto and rejects unknown fields', async () => {
    const accepted = await request(app.getHttpServer())
      .post('/pipe-test/firebase-token')
      .send({ idToken: 'tok' });
    if (accepted.status !== 201) {
      throw new Error(
        `expected Firebase HTTP 201, received ${accepted.status}: ${JSON.stringify(accepted.body)}`,
      );
    }
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
