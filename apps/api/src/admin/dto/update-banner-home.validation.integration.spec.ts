import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Post,
  UploadedFiles,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  UpdateBannerHomeBodyDto,
  UpdateSpecificPageBannerBodyDto,
} from './update-admin.dto';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';

@Controller('banner-test')
class BannerValidationController {
  @Post('banner-home')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_1', maxCount: 1 },
      { name: 'image_2', maxCount: 1 },
      { name: 'image_3', maxCount: 1 },
      { name: 'image_4', maxCount: 1 },
      { name: 'image_5', maxCount: 1 },
    ]),
  )
  updateBannerHome(
    @UploadedFiles()
    files: {
      image_1?: Express.Multer.File[];
    },
    @Body() body: UpdateBannerHomeBodyDto,
  ) {
    return {
      ok: true,
      body,
      hasFile: Boolean(files?.image_1?.[0]),
    };
  }

  @Post('banner-specific-page')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_1', maxCount: 1 },
      { name: 'image_2', maxCount: 1 },
      { name: 'image_3', maxCount: 1 },
    ]),
  )
  updateSpecificPageBanner(
    @UploadedFiles() files: { image_3?: Express.Multer.File[] },
    @Body() body: UpdateSpecificPageBannerBodyDto,
  ) {
    return {
      ok: true,
      body,
      hasFile: Boolean(files?.image_3?.[0]),
    };
  }
}

describe('UpdateBannerHomeBodyDto validation (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BannerValidationController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('given a single-slot multipart upload > then accepts the body and file without image_1 string validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/banner-test/banner-home')
      .field('link_1', '')
      .field('enabled_1', 'true')
      .field('start_date_1', '')
      .field('end_date_1', '')
      .attach('image_1', Buffer.from('fake-png'), {
        filename: 'hero.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.hasFile).toBe(true);
    expect(response.body.body.link_1).toBe('');
    expect(response.body.body.enabled_1).toBe('true');
  });

  it('given a specific-page slot 3 upload > then accepts the shared three-slot contract', async () => {
    const response = await request(app.getHttpServer())
      .post('/banner-test/banner-specific-page')
      .field('link_3', '/discover/promo')
      .field('enabled_3', 'true')
      .attach('image_3', Buffer.from('fake-png'), {
        filename: 'discovery.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.hasFile).toBe(true);
    expect(response.body.body.link_3).toBe('/discover/promo');
  });

  it('given a hidden slot 4 field > then the specific-page contract rejects it', async () => {
    const response = await request(app.getHttpServer())
      .post('/banner-test/banner-specific-page')
      .field('link_4', '/must-not-persist');

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('link_4 should not exist'),
      ]),
    );
  });
});
