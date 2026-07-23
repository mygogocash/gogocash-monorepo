import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from 'src/common/validation-pipe.options';
import { UpdateFeeRateDto } from './update-admin.dto';

@Controller('fee-rate-test')
class FeeRateTestController {
  @Patch()
  update(@Body() dto: UpdateFeeRateDto) {
    return dto;
  }
}

describe('UpdateFeeRateDto persistent fee structure contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FeeRateTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts and transforms structured cashback and withdrawal settings', async () => {
    const response = await request(app.getHttpServer())
      .patch('/fee-rate-test')
      .send({
        system: '5',
        global_max_cap_mode: 'fixed',
        global_max_cap_percent: '0',
        global_max_cap_amount: '500',
        global_max_cap_currency: 'THB',
        global_withdraw_fee: '30',
        global_minimum_withdraw: '100',
        global_withdraw_currency: 'THB',
        withdraw_regions: [
          {
            id: 'r-th',
            countryCode: 'TH',
            currency: 'THB',
            feeWithdraw: '25',
            minimumWithdraw: '100',
            max_cap_mode: 'percent',
            max_cap_percent: '10',
            max_cap_amount: '0',
            max_cap_currency: 'THB',
          },
        ],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      system: 5,
      global_max_cap_amount: 500,
      global_withdraw_fee: 30,
      withdraw_regions: [
        expect.objectContaining({ feeWithdraw: 25, max_cap_percent: 10 }),
      ],
    });
  });

  it('keeps legacy partial numeric-string updates valid', async () => {
    const response = await request(app.getHttpServer())
      .patch('/fee-rate-test')
      .send({ fee_withdraw_thb: '30', minimum_withdraw_thb: '100' })
      .expect(200);

    expect(response.body).toEqual({
      fee_withdraw_thb: 30,
      minimum_withdraw_thb: 100,
    });
  });

  it('rejects invalid country, currency, percentages, and negative fees', () =>
    request(app.getHttpServer())
      .patch('/fee-rate-test')
      .send({
        global_max_cap_mode: 'percent',
        global_max_cap_percent: 101,
        global_withdraw_fee: -1,
        global_withdraw_currency: '$',
        withdraw_regions: [
          {
            id: 'bad',
            countryCode: 'Thailand',
            currency: '$',
            feeWithdraw: -1,
            minimumWithdraw: -1,
            max_cap_mode: 'percent',
            max_cap_percent: 101,
          },
        ],
      })
      .expect(400));
});
