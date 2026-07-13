import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import type {
  CreateBillingPortalSessionInput,
  CreateCheckoutSessionInput,
  CustomerBillingProvider,
  CustomerSubscriptionStatus,
} from './customer-billing.types';

@Injectable()
export class StripeCustomerBillingProvider implements CustomerBillingProvider {
  private readonly logger = new Logger(StripeCustomerBillingProvider.name);
  private stripe: Stripe | null = null;

  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    const session = await this.getStripe().checkout.sessions.create({
      cancel_url: input.cancelUrl,
      client_reference_id: input.userId,
      customer_email: input.customerEmail,
      line_items: [{ price: input.priceId, quantity: 1 }],
      metadata: {
        gogocash_user_id: input.userId,
        interval: input.interval,
        tier: input.tier,
      },
      mode: 'subscription',
      subscription_data: {
        metadata: {
          gogocash_user_id: input.userId,
          interval: input.interval,
          tier: input.tier,
        },
      },
      success_url: input.successUrl,
    });

    return { url: session.url };
  }

  async createBillingPortalSession(input: CreateBillingPortalSessionInput) {
    const customer = await this.findCustomer(input.customerEmail, input.userId);
    if (!customer) return null;

    const session = await this.getStripe().billingPortal.sessions.create({
      customer: customer.id,
      return_url: input.returnUrl,
    });

    return { url: session.url };
  }

  async getSubscriptionStatus(input: {
    userId: string;
    customerEmail: string;
  }): Promise<CustomerSubscriptionStatus> {
    const customer = await this.findCustomer(input.customerEmail, input.userId);
    if (!customer) {
      return {
        enabled: true,
        status: 'none',
      };
    }

    const subscriptions = await this.getStripe().subscriptions.list({
      customer: customer.id,
      limit: 1,
      status: 'all',
    });
    const subscription = subscriptions.data[0];
    if (!subscription) {
      return {
        enabled: true,
        status: 'none',
      };
    }

    return {
      currentPeriodEnd: subscription.items.data[0]?.current_period_end
        ? new Date(
            subscription.items.data[0].current_period_end * 1000,
          ).toISOString()
        : undefined,
      enabled: true,
      status: subscription.status,
    };
  }

  private async findCustomer(email: string, userId: string) {
    const customers = await this.getStripe().customers.list({
      email,
      limit: 10,
    });

    return (
      customers.data.find(
        (customer) => customer.metadata?.gogocash_user_id === userId,
      ) ?? customers.data[0]
    );
  }

  private getStripe(): Stripe {
    if (this.stripe) return this.stripe;

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      this.logger.error(
        'Customer billing is not configured (missing STRIPE_SECRET_KEY).',
      );
      throw new ServiceUnavailableException(
        'Billing is temporarily unavailable. Please try again later or contact support.',
      );
    }

    this.stripe = new Stripe(secretKey);
    return this.stripe;
  }
}
