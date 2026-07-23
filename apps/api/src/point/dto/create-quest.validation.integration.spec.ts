import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';
import { CreateQuestDto, UpdateQuestTasksDto } from './create-quest.dto';

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

  @Patch('tasks')
  updateQuestTasks(@Body() body: UpdateQuestTasksDto) {
    return body;
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
      .field('request_key', 'quest-media:validation-test')
      .field('campaign_revision', '0')
      .field('expected_config_revision', '0')
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
    expect(response.body.body).toMatchObject({
      request_key: 'quest-media:validation-test',
      campaign_revision: 0,
      expected_config_revision: 0,
    });
  });

  it('rejects legacy banner strings so they cannot prove an upload', async () => {
    const response = await request(app.getHttpServer())
      .post('/quest-validation-test')
      .field('request_key', 'quest-media:body-string-test')
      .field('campaign_revision', '0')
      .field('expected_config_revision', '0')
      .field('start_date', '2026-07-20T02:00:00.000Z')
      .field('end_date', '2026-07-31T15:00:00.000Z')
      .field('facebook_post', '')
      .field('facebook_page', '')
      .field('line', '')
      .field('banner_en', 'https://untrusted.example/banner.png');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      'property banner_en should not exist',
    );
    expect(response.body.message).not.toContain('banner_en must be a string');
  });
});

describe('UpdateQuestTasksDto discriminated validation (integration)', () => {
  let app: INestApplication;

  const questConfig = {
    reward_model: 'task_v2',
    expected_config_revision: 0,
    timezone: 'Asia/Bangkok',
    audience: { kind: 'all' },
    reward_caps: {
      max_awards_per_user: 1,
      max_referrals_per_user: null,
    },
  };

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

  it.each([
    [
      'brand_purchase',
      {
        task_type: 'brand_purchase',
        offer: '6942b79d7b9f8214ada6eed5',
        points: 50,
        enabled: true,
        wording_en: 'Shop with this brand',
        wording_th: 'ช้อปกับแบรนด์นี้',
        notes: '',
      },
    ],
    [
      'friend_referral',
      {
        task_type: 'friend_referral',
        completion_rule: 'account_created',
        points: 75,
        enabled: true,
        wording_en: 'Invite a friend',
        wording_th: 'ชวนเพื่อน',
        notes: '',
      },
    ],
    [
      'spend_target',
      {
        task_type: 'spend_target',
        spend_scope: 'any_shop_via_ggc',
        target_thb_minor: 150_000,
        points: 100,
        enabled: true,
        wording_en: 'Spend THB 1,500',
        wording_th: 'ใช้จ่าย 1,500 บาท',
        notes: '',
      },
    ],
  ])('accepts the %s variant with only its own fields', async (_, task) => {
    const response = await request(app.getHttpServer())
      .patch('/quest-validation-test/tasks')
      .send({ ...questConfig, tasks: [task] });

    expect(response.status).toBe(200);
    expect(response.body.tasks).toEqual([task]);
  });

  it.each([
    [
      'brand_purchase with a client-owned provider id',
      {
        task_type: 'brand_purchase',
        offer: '6942b79d7b9f8214ada6eed5',
        offer_id: 803,
        points: 50,
      },
      'tasks.0.property offer_id should not exist',
    ],
    [
      'friend_referral with a brand field',
      {
        task_type: 'friend_referral',
        completion_rule: 'account_created',
        offer: '6942b79d7b9f8214ada6eed5',
        points: 50,
      },
      'tasks.0.property offer should not exist',
    ],
    [
      'spend_target with a referral rule',
      {
        task_type: 'spend_target',
        spend_scope: 'any_shop_via_ggc',
        target_thb_minor: 100_000,
        completion_rule: 'account_created',
        points: 50,
      },
      'tasks.0.property completion_rule should not exist',
    ],
  ])('rejects %s', async (_, task, message) => {
    const response = await request(app.getHttpServer())
      .patch('/quest-validation-test/tasks')
      .send({ ...questConfig, tasks: [task] });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(message);
  });

  it('rejects membership-tier audience without at least one tier', async () => {
    const response = await request(app.getHttpServer())
      .patch('/quest-validation-test/tasks')
      .send({
        ...questConfig,
        audience: { kind: 'membership_tiers', tier_ids: [] },
        tasks: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      'audience.tier_ids must contain at least 1 elements',
    );
  });

  it('rejects membership-tier audience values that are not canonical Mongo ids', async () => {
    const response = await request(app.getHttpServer())
      .patch('/quest-validation-test/tasks')
      .send({
        ...questConfig,
        audience: {
          kind: 'membership_tiers',
          tier_ids: ['gogopass', '6942b79d7b9f8214ada6eed5'],
        },
        tasks: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(
      'audience.each value in tier_ids must be a mongodb id',
    );
  });
});
