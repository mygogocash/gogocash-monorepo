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
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, forbidUnknownValues: false }),
    );
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
      .field('extra_store', 'true');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.body.offer_name_display).toBe('Shopee');
    expect(response.body.body.lookup_value).toBe('shopee_th');
    expect(response.body.body.disabled).toBe('false');
    expect(response.body.body.extra_store).toBe('true');
  });
});
