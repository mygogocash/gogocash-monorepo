import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerBillingService } from './customer-billing.service';
import type {
  CustomerBillingOptions,
  CustomerBillingProvider,
} from './customer-billing.types';

function makeQueryResult<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
  };
}

function makeService(
  overrides: {
    enabled?: boolean;
    priceIds?: CustomerBillingOptions['priceIds'];
    user?: { _id: string; email?: string | null } | null;
  } = {},
) {
  const user = overrides.user ?? {
    _id: 'user-1',
    email: 'member@gogocash.co',
  };
  const userModel = {
    findById: jest.fn().mockReturnValue(makeQueryResult(user)),
  };
  const provider = {
    createCheckoutSession: jest.fn(async () => ({
      url: 'https://checkout.stripe.com/session/test',
    })),
    createBillingPortalSession: jest.fn(async () => ({
      url: 'https://billing.stripe.com/session/test',
    })),
    getSubscriptionStatus: jest.fn(async () => ({
      enabled: true,
      status: 'active',
      currentPeriodEnd: '2026-06-23T00:00:00.000Z',
    })),
  } satisfies CustomerBillingProvider;
  const options: CustomerBillingOptions = {
    enabled: overrides.enabled ?? true,
    frontendUrl: 'https://app.gogocash.co',
    priceIds: overrides.priceIds ?? {
      'starter:month': 'price_starter_month',
      'starter:year': 'price_starter_year',
      'plus:month': 'price_plus_month',
      'plus:year': 'price_plus_year',
      'pro:month': 'price_pro_month',
      'pro:year': 'price_pro_year',
    },
  };

  return {
    options,
    provider,
    service: new CustomerBillingService(userModel as any, provider, options),
    userModel,
  };
}

describe('CustomerBillingService checkout', () => {
  it('customer billing checkout > given billing disabled > rejects with ForbiddenException', async () => {
    const { provider, service } = makeService({ enabled: false });

    await expect(
      service.createCheckoutSession('user-1', {
        interval: 'month',
        locale: 'en',
        tier: 'starter',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('customer billing checkout > given missing price id > rejects with ServiceUnavailableException', async () => {
    const { provider, service } = makeService({ priceIds: {} });

    await expect(
      service.createCheckoutSession('user-1', {
        interval: 'month',
        locale: 'en',
        tier: 'starter',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('customer billing checkout > given invalid tier > rejects with BadRequestException', async () => {
    const { provider, service } = makeService();

    await expect(
      service.createCheckoutSession('user-1', {
        interval: 'month',
        locale: 'en',
        tier: 'enterprise',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('customer billing checkout > given authenticated user without email > rejects with UnauthorizedException', async () => {
    const { provider, service } = makeService({
      user: { _id: 'user-1', email: '' },
    });

    await expect(
      service.createCheckoutSession('user-1', {
        interval: 'month',
        locale: 'en',
        tier: 'starter',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('customer billing checkout > given configured provider > returns checkout url', async () => {
    const { provider, service } = makeService();

    await expect(
      service.createCheckoutSession('user-1', {
        interval: 'month',
        locale: 'th',
        tier: 'starter',
      }),
    ).resolves.toEqual({
      url: 'https://checkout.stripe.com/session/test',
    });
    expect(provider.createCheckoutSession).toHaveBeenCalledWith({
      cancelUrl: 'https://app.gogocash.co/th/membership?checkout=cancel',
      customerEmail: 'member@gogocash.co',
      interval: 'month',
      priceId: 'price_starter_month',
      successUrl: 'https://app.gogocash.co/th/membership?checkout=success',
      tier: 'starter',
      userId: 'user-1',
    });
  });
});

describe('CustomerBillingService portal', () => {
  it('customer billing portal > given provider customer missing > rejects with NotFoundException', async () => {
    const { provider, service } = makeService();
    provider.createBillingPortalSession.mockResolvedValueOnce(null);

    await expect(
      service.createBillingPortalSession('user-1', {
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
