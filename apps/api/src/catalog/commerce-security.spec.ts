import { BadRequestException, ConflictException } from '@nestjs/common';

import { buildCheckoutRedirectUrls } from './commerce-checkout-urls';
import { validateAdminOrderStatusTransition } from './commerce-order-status';
import { escapeRegexLiteral } from './escape-regex';
import { CommerceService } from './commerce.service';

const TEST_USER_A = '507f1f77bcf86cd799439011';
const TEST_USER_B = '507f1f77bcf86cd799439012';

describe('escapeRegexLiteral', () => {
  it('escapes regex metacharacters so catastrophic patterns are literal', () => {
    expect(escapeRegexLiteral('(a+)+b')).toBe('\\(a\\+\\)\\+b');
  });
});

describe('validateAdminOrderStatusTransition', () => {
  it('rejects fulfilling an unpaid pending order', () => {
    expect(() =>
      validateAdminOrderStatusTransition(
        { status: 'pending_payment', payment_status: 'pending' },
        'fulfilled',
      ),
    ).toThrow(BadRequestException);
  });

  it('allows fulfilling a paid processing order', () => {
    expect(() =>
      validateAdminOrderStatusTransition(
        { status: 'processing', payment_status: 'paid' },
        'fulfilled',
      ),
    ).not.toThrow();
  });

  it('rejects refunding an unpaid pending order', () => {
    expect(() =>
      validateAdminOrderStatusTransition(
        { status: 'pending_payment', payment_status: 'pending' },
        'refunded',
      ),
    ).toThrow(BadRequestException);
  });

  it('allows refunding a paid fulfilled order', () => {
    expect(() =>
      validateAdminOrderStatusTransition(
        { status: 'fulfilled', payment_status: 'paid' },
        'refunded',
      ),
    ).not.toThrow();
  });
});

describe('buildCheckoutRedirectUrls', () => {
  it('builds redirect URLs from server origin only', () => {
    process.env.CUSTOMER_APP_URL = 'https://app.example.test';

    expect(buildCheckoutRedirectUrls('507f1f77bcf86cd799439011')).toEqual({
      successUrl:
        'https://app.example.test/commerce/checkout/success?order=507f1f77bcf86cd799439011',
      cancelUrl:
        'https://app.example.test/commerce/checkout/cancel?order=507f1f77bcf86cd799439011',
    });

    delete process.env.CUSTOMER_APP_URL;
  });
});

describe('CommerceService.createCheckoutSession security', () => {
  const paymentProvider = {
    createCheckoutSession: jest.fn(),
    parseWebhook: jest.fn(),
  };

  function makeService() {
    const paymentAttemptModel: any = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
      create: jest.fn().mockResolvedValue({}),
    };
    const orderModel: any = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };
    const cartModel: any = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'cart1',
            items: [
              {
                product_id: '507f1f77bcf86cd799439011',
                variant_sku: 'sku-1',
                quantity: 1,
                unit_amount: 1000,
                currency: 'THB',
                title: 'Test product',
              },
            ],
            currency: 'THB',
            subtotal_amount: 1000,
          }),
        }),
      }),
    };
    const productModel: any = {
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      }),
    };
    const reservationModel: any = {
      insertMany: jest.fn().mockResolvedValue([]),
    };

    const service = new CommerceService(
      cartModel,
      productModel,
      orderModel,
      reservationModel,
      paymentAttemptModel,
      paymentProvider as never,
    );

    return { service, paymentAttemptModel, orderModel, paymentProvider };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 409 when idempotency key belongs to another user', async () => {
    const { service, paymentAttemptModel } = makeService();
    let attemptLookup = 0;
    paymentAttemptModel.findOne.mockImplementation(() => ({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation(async () => {
          attemptLookup += 1;
          if (attemptLookup === 1) return null;
          if (attemptLookup === 2) {
            return {
              user_id: TEST_USER_B,
              idempotency_key: 'shared-key',
            };
          }
          return null;
        }),
      }),
    }));

    await expect(
      service.createCheckoutSession(TEST_USER_A, {}, 'shared-key'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ignores client redirect URLs and uses server-built checkout URLs', async () => {
    const { service, orderModel, paymentProvider } = makeService();
    orderModel.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      order_number: 'GGC-TEST',
      total_amount: 1000,
      currency: 'THB',
    });
    paymentProvider.createCheckoutSession.mockResolvedValue({
      provider: 'stripe',
      providerSessionId: 'cs_test',
      checkoutUrl: 'https://checkout.test/session',
    });
    process.env.CUSTOMER_APP_URL = 'https://app.example.test';

    await service.createCheckoutSession(
      TEST_USER_A,
      {
        success_url: 'https://evil.example/phish',
        cancel_url: 'https://evil.example/cancel',
      },
      'key-1',
    );

    expect(paymentProvider.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl:
          'https://app.example.test/commerce/checkout/success?order=507f1f77bcf86cd799439099',
        cancelUrl:
          'https://app.example.test/commerce/checkout/cancel?order=507f1f77bcf86cd799439099',
      }),
    );

    delete process.env.CUSTOMER_APP_URL;
  });
});

describe('CommerceService.updateOrderStatus security', () => {
  it('rejects marking an unpaid order fulfilled', async () => {
    const orderModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: '507f1f77bcf86cd799439099',
            status: 'pending_payment',
            payment_status: 'pending',
            items: [],
          }),
        }),
      }),
      findByIdAndUpdate: jest.fn(),
    };

    const service = new CommerceService(
      {} as never,
      {} as never,
      orderModel as never,
      {} as never,
      {} as never,
      { createCheckoutSession: jest.fn(), parseWebhook: jest.fn() } as never,
    );

    await expect(
      service.updateOrderStatus('507f1f77bcf86cd799439099', {
        status: 'fulfilled',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
