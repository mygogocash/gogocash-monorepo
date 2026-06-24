export type CheckoutLineItem = {
  name: string;
  quantity: number;
  unitAmount: number;
  currency: string;
};

export type CreateCommerceCheckoutInput = {
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  lineItems: CheckoutLineItem[];
};

export type CommerceCheckoutSession = {
  provider: string;
  providerSessionId: string;
  checkoutUrl: string;
};

export type CommerceWebhookEvent = {
  id: string;
  type: string;
  providerSessionId?: string;
};

export interface CommercePaymentProvider {
  createCheckoutSession(
    input: CreateCommerceCheckoutInput,
  ): Promise<CommerceCheckoutSession>;
  parseWebhook(
    payload: unknown,
    signature?: string,
  ): Promise<CommerceWebhookEvent>;
}

export const COMMERCE_PAYMENT_PROVIDER = Symbol('COMMERCE_PAYMENT_PROVIDER');
