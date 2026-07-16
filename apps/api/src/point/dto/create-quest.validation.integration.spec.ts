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
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';
import { CreateQuestDto } from './create-quest.dto';

const QUEST_BANNER_FIELDS = [
  { name: 'banner_en', maxCount: 1 },
  { name: 'banner_th', maxCount: 1 },
  { name: 'sub_banner_en', maxCount: 1 },
  { name: 'sub_banner_th', maxCount: 1 },
];

@Controller('quest-validation-test')
class QuestValidationController {
  @Post()
  @UseInterceptors(FileFieldsInterceptor(QUEST_BANNER_FIELDS))
  createQuest(
    @Body() body: CreateQuestDto,
    @UploadedFiles()
    files: Record<string, Express.Multer.File[]>,
  ) {
    return {
      body,
      uploadedFields: Object.keys(files).sort(),
    };
  }
}

describe('CreateQuestDto multipart validation (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [QuestValidationController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts all four file-backed banner fields without requiring duplicate body strings', async () => {
    let pending = request(app.getHttpServer())
      .post('/quest-validation-test')
      .field('start_date', '2026-07-20T02:00:00.000Z')
      .field('end_date', '2026-07-31T15:00:00.000Z')
      .field('facebook_post', '')
      .field('facebook_page', '')
      .field('line', '');

    for (const field of QUEST_BANNER_FIELDS) {
      pending = pending.attach(field.name, Buffer.from(`fake-${field.name}`), {
        filename: `${field.name}.png`,
        contentType: 'image/png',
      });
    }

    const response = await pending;

    expect(response.status).toBe(201);
    expect(response.body.uploadedFields).toEqual([
      'banner_en',
      'banner_th',
      'sub_banner_en',
      'sub_banner_th',
    ]);
  });
});
