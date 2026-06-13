import { IsIn, IsOptional } from 'class-validator';
import type { CustomerBillingLocale } from '../customer-billing.types';

export class CreateBillingPortalDto {
  @IsOptional()
  @IsIn(['en', 'th'])
  locale?: CustomerBillingLocale;
}
