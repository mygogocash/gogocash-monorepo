export type CustomerBillingTier = 'starter' | 'plus' | 'pro';
export type CustomerBillingInterval = 'month' | 'year';
export type CustomerBillingLocale = 'en' | 'th';
export type CustomerBillingPriceKey =
  `${CustomerBillingTier}:${CustomerBillingInterval}`;

export type CustomerBillingOptions = {
  enabled: boolean;
  frontendUrl: string;
  priceIds: Partial<Record<CustomerBillingPriceKey, string>>;
};

export type CreateCheckoutSessionInput = {
  userId: string;
  customerEmail: string;
  priceId: string;
  tier: CustomerBillingTier;
  interval: CustomerBillingInterval;
  successUrl: string;
  cancelUrl: string;
};

export type CreateBillingPortalSessionInput = {
  userId: string;
  customerEmail: string;
  returnUrl: string;
};

export type CustomerSubscriptionStatus = {
  enabled: boolean;
  status: string;
  currentPeriodEnd?: string;
};

export type CustomerBillingProvider = {
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<{ url?: string | null }>;
  createBillingPortalSession(
    input: CreateBillingPortalSessionInput,
  ): Promise<{ url: string } | null>;
  getSubscriptionStatus(input: {
    userId: string;
    customerEmail: string;
  }): Promise<CustomerSubscriptionStatus>;
};

export const CUSTOMER_BILLING_OPTIONS = Symbol('CUSTOMER_BILLING_OPTIONS');
export const CUSTOMER_BILLING_PROVIDER = Symbol('CUSTOMER_BILLING_PROVIDER');
