import 'reflect-metadata';
import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { GLOBAL_VALIDATION_PIPE_OPTIONS } from '../../common/validation-pipe.options';
import { CategoryLifecycleCommandDto } from './category-lifecycle-command.dto';

@Controller('category-lifecycle-validation-test')
class CategoryLifecycleValidationController {
  @Post()
  save(@Body() body: CategoryLifecycleCommandDto) {
    return { ok: true, body };
  }
}

describe('CategoryLifecycleCommandDto validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.useRealTimers();
    const moduleRef = await Test.createTestingModule({
      controllers: [CategoryLifecycleValidationController],
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

  const post = (body: object) =>
    request(app.getHttpServer())
      .post('/category-lifecycle-validation-test')
      .send(body);

  it('accepts a bounded request key and positive integer revision', async () => {
    const response = await post({
      request_key: 'retire-policy-1234',
      expected_revision: 4,
    });
    expect(response.status).toBe(201);
  });

  it.each([0, -1, 1.5, '4', null])(
    'rejects invalid expected_revision %p',
    async (expectedRevision) => {
      const response = await post({
        request_key: 'retire-policy-1234',
        expected_revision: expectedRevision,
      });
      expect(response.status).toBe(400);
    },
  );

  it('rejects malformed request keys', async () => {
    const response = await post({
      request_key: 'bad key with spaces',
      expected_revision: 1,
    });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('request_key');
  });

  it('rejects unknown fields', async () => {
    const response = await post({
      request_key: 'retire-policy-1234',
      expected_revision: 1,
      force: true,
    });
    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('force');
  });
});
