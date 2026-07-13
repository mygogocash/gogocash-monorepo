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
import { UpdateBannerHomeBodyDto } from './update-admin.dto';
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
});
