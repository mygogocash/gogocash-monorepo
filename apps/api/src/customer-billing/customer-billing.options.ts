import type {
  CustomerBillingInterval,
  CustomerBillingOptions,
  CustomerBillingTier,
} from './customer-billing.types';

const DEFAULT_FRONTEND_URL = 'https://app.gogocash.co';

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value !== 'undefined' && value !== 'null' ? value : undefined;
}

function truthy(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function priceFor(
  tier: CustomerBillingTier,
  interval: CustomerBillingInterval,
): string | undefined {
  if (interval === 'month') {
    if (tier === 'starter' || tier === 'plus') {
      const sharedThb = readEnv('STRIPE_PRICE_THB_MONTHLY');
      if (sharedThb) return sharedThb;
    }
    if (tier === 'starter') return readEnv('STRIPE_PRICE_STARTER_MONTHLY');
    if (tier === 'plus') return readEnv('STRIPE_PRICE_PLUS_MONTHLY');
    return readEnv('STRIPE_PRICE_PRO_MONTHLY');
  }

  if (tier === 'starter' || tier === 'plus') {
    const sharedThb = readEnv('STRIPE_PRICE_THB_ANNUAL');
    if (sharedThb) return sharedThb;
  }
  if (tier === 'starter') {
    return (
      readEnv('STRIPE_PRICE_STARTER_ANNUAL') ??
      readEnv('STRIPE_PRICE_STARTER_YEARLY')
    );
  }
  if (tier === 'plus') return readEnv('STRIPE_PRICE_PLUS_YEARLY');
  return readEnv('STRIPE_PRICE_PRO_YEARLY');
}

export function createCustomerBillingOptions(): CustomerBillingOptions {
  return {
    enabled:
      truthy(readEnv('STRIPE_BILLING_ENABLED')) ||
      truthy(readEnv('NEXT_PUBLIC_FEATURE_STRIPE_BILLING')),
    frontendUrl:
      readEnv('CUSTOMER_FRONTEND_URL') ??
      readEnv('NEXT_PUBLIC_FRONTEND_URL') ??
      DEFAULT_FRONTEND_URL,
    priceIds: {
      'starter:month': priceFor('starter', 'month'),
      'starter:year': priceFor('starter', 'year'),
      'plus:month': priceFor('plus', 'month'),
      'plus:year': priceFor('plus', 'year'),
      'pro:month': priceFor('pro', 'month'),
      'pro:year': priceFor('pro', 'year'),
    },
  };
}
