import { IsIn, IsOptional } from 'class-validator';
import type {
  CustomerBillingInterval,
  CustomerBillingLocale,
  CustomerBillingTier,
} from '../customer-billing.types';

export class CreateCheckoutSessionDto {
  @IsIn(['starter', 'plus', 'pro'])
  tier: CustomerBillingTier;

  @IsIn(['month', 'year'])
  interval: CustomerBillingInterval;

  @IsOptional()
  @IsIn(['en', 'th'])
  locale?: CustomerBillingLocale;
}
