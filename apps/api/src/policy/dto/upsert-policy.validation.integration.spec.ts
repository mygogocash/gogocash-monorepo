import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UpsertPolicyDto } from './upsert-policy.dto';
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';

const VALID_CATEGORY_ID = '507f1f77bcf86cd799439011';

const validTerms = {
  primary_locale: 'en',
  translations: { en: 'Terms body' },
};

@Controller('policy-test')
class PolicyValidationController {
  @Put()
  upsert(@Body() body: UpsertPolicyDto) {
    return { ok: true, body };
  }
}

describe('UpsertPolicyDto validation (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.useRealTimers();
    const moduleRef = await Test.createTestingModule({
      controllers: [PolicyValidationController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(GLOBAL_VALIDATION_PIPE_OPTIONS));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
    }
  });

  const put = (payload: unknown) =>
    request(app.getHttpServer())
      .put('/policy-test')
      .send(payload as object);

  it('given a { data: {...} }-wrapped payload > then rejects with property-should-not-exist and missing category_id (issue #337 regression)', async () => {
    const response = await put({
      data: { category_id: VALID_CATEGORY_ID, terms: validTerms },
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'property data should not exist',
        'category_id must be a mongodb id',
      ]),
    );
  });

  it('given a payload without category_id > then rejects with a category_id error', async () => {
    const response = await put({ terms: validTerms });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['category_id must be a mongodb id']),
    );
  });

  it('given a non-Mongo-id category_id > then rejects', async () => {
    const response = await put({
      category_id: 'not-an-id',
      terms: validTerms,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['category_id must be a mongodb id']),
    );
  });

  it('given an unsupported terms.primary_locale > then rejects via nested validation', async () => {
    const response = await put({
      category_id: VALID_CATEGORY_ID,
      terms: { primary_locale: 'fr', translations: { fr: 'Conditions' } },
    });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain(
      'primary_locale must be one of: th, en, ja, ko, zh',
    );
  });

  it('given a non-object terms.translations > then rejects', async () => {
    const response = await put({
      category_id: VALID_CATEGORY_ID,
      terms: { primary_locale: 'en', translations: 'not-an-object' },
    });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain(
      'translations must be an object',
    );
  });

  it('given an unknown top-level property > then rejects it as non-whitelisted', async () => {
    const response = await put({
      category_id: VALID_CATEGORY_ID,
      terms: validTerms,
      unexpected_field: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['property unexpected_field should not exist']),
    );
  });

  it('given a valid flat terms payload > then accepts and preserves the body through transform', async () => {
    const response = await put({
      category_id: VALID_CATEGORY_ID,
      terms: validTerms,
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.body.category_id).toBe(VALID_CATEGORY_ID);
    expect(response.body.body.terms).toEqual(validTerms);
  });

  it('given a banner block with clear_terms > then accepts the flat partial-update shape', async () => {
    const response = await put({
      category_id: VALID_CATEGORY_ID,
      banner: {
        primary_locale: 'th',
        translations: { th: 'ประกาศ', en: 'Banner' },
      },
      clear_terms: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.body.clear_terms).toBe(true);
    expect(response.body.body.banner.translations.en).toBe('Banner');
  });
});
