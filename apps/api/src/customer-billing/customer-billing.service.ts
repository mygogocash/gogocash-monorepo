import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import type { CreateBillingPortalDto } from './dto/create-billing-portal.dto';
import type { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import {
  CUSTOMER_BILLING_OPTIONS,
  CUSTOMER_BILLING_PROVIDER,
  type CustomerBillingOptions,
  type CustomerBillingProvider,
  type CustomerBillingTier,
  type CustomerBillingInterval,
  type CustomerBillingLocale,
} from './customer-billing.types';

type BillingUser = {
  userId: string;
  email: string;
};

@Injectable()
export class CustomerBillingService {
  private readonly logger = new Logger(CustomerBillingService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @Inject(CUSTOMER_BILLING_PROVIDER)
    private readonly provider: CustomerBillingProvider,
    @Inject(CUSTOMER_BILLING_OPTIONS)
    private readonly options: CustomerBillingOptions,
  ) {}

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    assertValidCheckoutInput(dto);
    this.assertEnabled();
    const priceId = this.resolvePriceId(dto.tier, dto.interval);
    const user = await this.getBillingUser(userId);
    const locale = normalizeLocale(dto.locale);
    const origin = normalizeOrigin(this.options.frontendUrl);
    const session = await this.provider.createCheckoutSession({
      cancelUrl: `${origin}/${locale}/membership?checkout=cancel`,
      customerEmail: user.email,
      interval: dto.interval,
      priceId,
      successUrl: `${origin}/${locale}/membership?checkout=success`,
      tier: dto.tier,
      userId: user.userId,
    });

    if (!session.url) {
      throw new InternalServerErrorException(
        'Checkout session missing redirect URL',
      );
    }

    return { url: session.url };
  }

  async createBillingPortalSession(
    userId: string,
    dto: CreateBillingPortalDto,
  ): Promise<{ url: string }> {
    assertValidLocale(dto.locale);
    this.assertEnabled();
    const user = await this.getBillingUser(userId);
    const locale = normalizeLocale(dto.locale);
    const origin = normalizeOrigin(this.options.frontendUrl);
    const session = await this.provider.createBillingPortalSession({
      customerEmail: user.email,
      returnUrl: `${origin}/${locale}/membership`,
      userId: user.userId,
    });

    if (!session) {
      throw new NotFoundException(
        'No Stripe customer found for this account. Subscribe once from membership first.',
      );
    }

    return session;
  }

  async getSubscriptionStatus(userId: string) {
    if (!this.options.enabled) {
      return {
        enabled: false,
        status: 'disabled',
      };
    }

    let user: (User & { _id?: unknown }) | null;
    try {
      user = await this.userModel.findById(userId).lean();
    } catch {
      throw new UnauthorizedException('User not found');
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const email = user.email?.trim();
    if (!email) {
      return {
        enabled: false,
        status: 'email_required',
      };
    }

    return this.provider.getSubscriptionStatus({
      customerEmail: email,
      userId: String(user._id ?? userId),
    });
  }

  private assertEnabled() {
    if (!this.options.enabled) {
      throw new ForbiddenException(
        'Billing is temporarily unavailable. Please try again later or contact support.',
      );
    }
  }

  private resolvePriceId(
    tier: CustomerBillingTier,
    interval: CustomerBillingInterval,
  ): string {
    const priceId = this.options.priceIds[`${tier}:${interval}`];

    if (!priceId) {
      // Keep the unconfigured plan key in server logs for ops.
      this.logger.error(
        `Billing price is not configured for plan "${tier}:${interval}".`,
      );
      throw new ServiceUnavailableException(
        "This plan isn't available right now. Please try again later or contact support.",
      );
    }

    return priceId;
  }

  private async getBillingUser(userId: string): Promise<BillingUser> {
    let user: (User & { _id?: unknown }) | null;

    try {
      user = await this.userModel.findById(userId).lean();
    } catch {
      throw new UnauthorizedException('User not found');
    }

    const email = user?.email?.trim();
    if (!user || !email) {
      throw new UnauthorizedException('User email is required for billing');
    }

    return {
      email,
      userId: String(user._id ?? userId),
    };
  }
}

function normalizeOrigin(frontendUrl: string): string {
  const trimmed = frontendUrl.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeLocale(
  locale?: CustomerBillingLocale,
): CustomerBillingLocale {
  return locale === 'th' ? 'th' : 'en';
}

function assertValidCheckoutInput(dto: CreateCheckoutSessionDto) {
  if (!isBillingTier(dto.tier) || !isBillingInterval(dto.interval)) {
    throw new BadRequestException('Invalid request body');
  }

  assertValidLocale(dto.locale);
}

function assertValidLocale(locale?: string) {
  if (locale !== undefined && locale !== 'en' && locale !== 'th') {
    throw new BadRequestException('Invalid request body');
  }
}

function isBillingTier(value: string): value is CustomerBillingTier {
  return value === 'starter' || value === 'plus' || value === 'pro';
}

function isBillingInterval(value: string): value is CustomerBillingInterval {
  return value === 'month' || value === 'year';
}
