import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Patch,
  Param,
  UploadedFiles,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UpdateOfferAdminDto } from './update-admin.dto';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';

@Controller('offer-test')
class OfferValidationController {
  @Patch('update-offer/:id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo_desktop', maxCount: 1 },
      { name: 'logo_mobile', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
      { name: 'logo_circle', maxCount: 1 },
      { name: 'banner_mobile', maxCount: 1 },
    ]),
  )
  updateOffer(
    @Param('id') id: string,
    @Body() body: UpdateOfferAdminDto,
    @UploadedFiles()
    files: {
      logo_circle?: Express.Multer.File[];
    },
  ) {
    return { ok: true, id, body, hasLogo: Boolean(files?.logo_circle?.[0]) };
  }
}

describe('UpdateOfferAdminDto validation (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OfferValidationController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('given brand-info multipart fields > then accepts disabled=false and extra_store=true as strings', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('offer_name_display', 'Shopee')
      .field('lookup_value', 'shopee_th')
      .field('disabled', 'false')
      .field('extra_store', 'true')
      .field(
        'offer_display_tags',
        JSON.stringify({
          brand_category_enabled: true,
          brand_category_label: 'Shopping',
          extra_cashback_tag: true,
        }),
      );

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.body.offer_name_display).toBe('Shopee');
    expect(response.body.body.lookup_value).toBe('shopee_th');
    expect(response.body.body.disabled).toBe('false');
    expect(response.body.body.extra_store).toBe('true');
    expect(response.body.body.offer_display_tags).toBe(
      JSON.stringify({
        brand_category_enabled: true,
        brand_category_label: 'Shopping',
        extra_cashback_tag: true,
      }),
    );
  });

  it('given tracking-period multipart fields > then accepts manual mode with day counts arriving as strings', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('tracking_period_mode', 'manual')
      .field('tracking_days', '21')
      .field('confirm_days', '45');

    expect(response.status).toBe(200);
    expect(response.body.body.tracking_period_mode).toBe('manual');
    expect(response.body.body.tracking_days).toBe('21');
    expect(response.body.body.confirm_days).toBe('45');
  });

  it('given tracking_period_mode=weekly > then validation rejects with 400', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('tracking_period_mode', 'weekly');

    expect(response.status).toBe(400);
  });

  it('given flow_type=two_step with step subtitles > then they pass validation', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('flow_type', 'two_step')
      .field('tracking_subtitle', 'after the return window closes')
      .field('confirm_subtitle', 'once the store approves');

    expect(response.status).toBe(200);
    expect(response.body.body.flow_type).toBe('two_step');
    expect(response.body.body.tracking_subtitle).toBe(
      'after the return window closes',
    );
    expect(response.body.body.confirm_subtitle).toBe('once the store approves');
  });

  it('given flow_type=four_step > then validation rejects with 400', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('flow_type', 'four_step');

    expect(response.status).toBe(400);
  });

  it('given an oversized tracking_subtitle > then validation rejects with 400', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('tracking_subtitle', 'x'.repeat(201));

    expect(response.status).toBe(400);
  });

  it('given terms-and-conditions multipart fields > then policy/custom terms/note pass validation', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('policy_category_id', '68345f00aa11bb22cc33dd99')
      .field('custom_terms', '1. Custom term\n2. No stacking')
      .field('note_to_user', 'Flash sale this week only.');

    expect(response.status).toBe(200);
    expect(response.body.body.policy_category_id).toBe(
      '68345f00aa11bb22cc33dd99',
    );
    expect(response.body.body.custom_terms).toBe(
      '1. Custom term\n2. No stacking',
    );
    expect(response.body.body.note_to_user).toBe('Flash sale this week only.');
  });

  it('given an oversized note_to_user > then validation rejects with 400 (stored-DoS guard)', async () => {
    const response = await request(app.getHttpServer())
      .patch('/offer-test/update-offer/offer-1')
      .field('note_to_user', 'x'.repeat(2_001));

    expect(response.status).toBe(400);
  });
});
