import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';

import {
  CommerceCheckoutSession,
  CommercePaymentProvider,
  CommerceWebhookEvent,
  CreateCommerceCheckoutInput,
} from './commerce-payment.provider';

@Injectable()
export class StripeCommercePaymentProvider implements CommercePaymentProvider {
  private readonly logger = new Logger(StripeCommercePaymentProvider.name);
  private stripe?: Stripe;

  async createCheckoutSession(
    input: CreateCommerceCheckoutInput,
  ): Promise<CommerceCheckoutSession> {
    const stripe = this.getStripe();

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.orderId,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          order_id: input.orderId,
          order_number: input.orderNumber,
          user_id: input.userId,
        },
        line_items: input.lineItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.unitAmount,
            product_data: {
              name: item.name,
            },
          },
        })),
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (!session.url) {
      this.logger.error(
        'Commerce checkout session returned no redirect URL from the payment provider.',
      );
      throw new ServiceUnavailableException(
        'Payments are temporarily unavailable. Please try again later or contact support.',
      );
    }

    return {
      provider: 'stripe',
      providerSessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async parseWebhook(
    payload: unknown,
    signature?: string,
  ): Promise<CommerceWebhookEvent> {
    const webhookSecret = process.env.STRIPE_COMMERCE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    if (webhookSecret) {
      if (!signature) {
        throw new ServiceUnavailableException('Missing Stripe signature');
      }
      const body =
        typeof payload === 'string' || Buffer.isBuffer(payload)
          ? payload
          : JSON.stringify(payload);
      event = this.getStripe().webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );
    } else {
      event = payload as Stripe.Event;
    }

    const dataObject = event.data?.object as { id?: string } | undefined;
    return {
      id: event.id,
      type: event.type,
      providerSessionId: dataObject?.id,
    };
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      const apiKey = process.env.STRIPE_SECRET_KEY;
      if (!apiKey) {
        this.logger.error(
          'Commerce payments are not configured (missing STRIPE_SECRET_KEY).',
        );
        throw new ServiceUnavailableException(
          'Payments are temporarily unavailable. Please try again later or contact support.',
        );
      }
      this.stripe = new Stripe(apiKey, { apiVersion: '2026-06-24.dahlia' });
    }
    return this.stripe;
  }
}
