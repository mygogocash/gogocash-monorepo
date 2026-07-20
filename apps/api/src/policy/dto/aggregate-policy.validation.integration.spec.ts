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
import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';
import { AggregatePolicyCommandDto } from './aggregate-policy.dto';

@Controller('policy-aggregate-test')
class AggregatePolicyValidationController {
  @Put()
  save(@Body() body: AggregatePolicyCommandDto) {
    return { ok: true, body };
  }
}

const valid = {
  request_key: 'policy-save-12345678',
  category_name: '  Travel   Deals  ',
  icon_key: 'travel',
  policy: JSON.stringify({
    category_id: '__new__',
    terms: {
      primary_locale: 'th',
      translations: { th: 'ข้อกำหนด' },
    },
    banner: {
      primary_locale: 'th',
      translations: { th: 'ข้อความแบนเนอร์' },
    },
  }),
};

describe('AggregatePolicyCommandDto validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.useRealTimers();
    const moduleRef = await Test.createTestingModule({
      controllers: [AggregatePolicyValidationController],
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

  const put = (body: object) =>
    request(app.getHttpServer()).put('/policy-aggregate-test').send(body);

  it('requires a bounded request_key', async () => {
    const response = await put({ ...valid, request_key: '' });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('request_key');
  });

  it('rejects category ids that are neither absent nor Mongo ids', async () => {
    const response = await put({ ...valid, category_id: 'not-an-id' });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain(
      'category_id must be a mongodb id',
    );
  });

  it('rejects icon values outside the product allow-list', async () => {
    const response = await put({ ...valid, icon_key: '<script>' });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('icon_key');
  });

  it('accepts the scalar multipart-compatible command envelope', async () => {
    const response = await put(valid);
    expect(response.status).toBe(200);
    expect(response.body.body.request_key).toBe(valid.request_key);
    expect(response.body.body.policy).toBe(valid.policy);
  });

  // Expanded built-in icon set (#28): keys added to CATEGORY_ICON_KEYS must be
  // accepted by the DTO allow-list, else the admin can't save them.
  it.each(['electronics', 'fashion', 'beauty', 'health', 'home', 'education'])(
    'accepts the expanded icon key %s',
    async (iconKey) => {
      const response = await put({ ...valid, icon_key: iconKey });
      expect(response.status).toBe(200);
      expect(response.body.body.icon_key).toBe(iconKey);
    },
  );
});
