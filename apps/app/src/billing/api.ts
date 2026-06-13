export type CustomerBillingTier = "starter" | "plus" | "pro";
export type CustomerBillingInterval = "month" | "year";
export type CustomerBillingLocale = "en" | "th";

export type CustomerBillingCheckoutRequest = {
  tier: CustomerBillingTier;
  interval: CustomerBillingInterval;
  locale?: CustomerBillingLocale;
};

export type CustomerBillingPortalRequest = {
  locale?: CustomerBillingLocale;
};

export type CustomerBillingRedirectResponse = {
  url: string;
};

export type CustomerSubscriptionStatus = {
  enabled: boolean;
  status: string;
  currentPeriodEnd?: string;
};

export type CustomerBillingBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown>(path: string, body?: unknown): Promise<TResponse>;
};

export function createCustomerBillingApi(client: CustomerBillingBaseClient) {
  return {
    createCheckoutSession(request: CustomerBillingCheckoutRequest) {
      return client.post<CustomerBillingRedirectResponse>("/customer-billing/checkout", request);
    },
    createBillingPortalSession(request: CustomerBillingPortalRequest = {}) {
      return client.post<CustomerBillingRedirectResponse>("/customer-billing/portal", request);
    },
    getSubscriptionStatus() {
      return client.get<CustomerSubscriptionStatus>("/customer-billing/subscription");
    },
  };
}
