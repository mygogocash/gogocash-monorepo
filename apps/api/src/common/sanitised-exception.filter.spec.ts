import {
  ArgumentsHost,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SanitisedExceptionFilter } from './sanitised-exception.filter';

function invoke(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({
        method: 'POST',
        url: '/policy/category/abc/retire',
      }),
    }),
  } as unknown as ArgumentsHost;

  new SanitisedExceptionFilter().catch(exception, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('SanitisedExceptionFilter', () => {
  it('given a plain HttpException > then returns the sanitised envelope only', () => {
    const { status, body } = invoke(
      new UnauthorizedException('token not found'),
    );
    expect(status).toBe(401);
    expect(body).toEqual({
      statusCode: 401,
      message: 'token not found',
      timestamp: expect.any(String),
      path: '/policy/category/abc/retire',
    });
  });

  it('given a generic Error > then never leaks its message', () => {
    const { status, body } = invoke(
      new Error('mongodb: connection string @host leaked'),
    );
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(body.code).toBeUndefined();
  });

  it('given an unlisted structured error code > then drops code and extra fields', () => {
    const { body } = invoke(
      new InternalServerErrorException({
        code: 'STRIPE_RAW_ERROR',
        message: 'boom',
        secret_field: 'do-not-leak',
      }),
    );
    expect(body.code).toBeUndefined();
    expect((body as Record<string, unknown>).secret_field).toBeUndefined();
    expect(body.message).toBe('boom');
  });

  it('given the POLICY_CATEGORY_REFERENCED conflict > then surfaces code + numeric reference_counts', () => {
    const { status, body } = invoke(
      new ConflictException({
        statusCode: 409,
        code: 'POLICY_CATEGORY_REFERENCED',
        message: 'Category is referenced by offers and cannot be retired.',
        reference_counts: {
          offer_policy_category_id: 2,
          offer_categories_normalized: 5,
          unique_offers: 6,
        },
      }),
    );
    expect(status).toBe(409);
    expect(body.code).toBe('POLICY_CATEGORY_REFERENCED');
    expect(body.message).toBe(
      'Category is referenced by offers and cannot be retired.',
    );
    expect(body.reference_counts).toEqual({
      offer_policy_category_id: 2,
      offer_categories_normalized: 5,
      unique_offers: 6,
    });
  });

  it('given an allowlisted code with a non-numeric reference_counts > then omits the tampered details but keeps code', () => {
    const { body } = invoke(
      new ConflictException({
        code: 'POLICY_CATEGORY_REFERENCED',
        message: 'blocked',
        reference_counts: {
          unique_offers: 'DROP TABLE',
          leaked: { nested: 'x' },
        },
      }),
    );
    expect(body.code).toBe('POLICY_CATEGORY_REFERENCED');
    expect(body.reference_counts).toBeUndefined();
  });
});
