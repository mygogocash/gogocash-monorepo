import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { CustomerBillingController } from './customer-billing.controller';
import { createCustomerBillingOptions } from './customer-billing.options';
import { CustomerBillingService } from './customer-billing.service';
import {
  CUSTOMER_BILLING_OPTIONS,
  CUSTOMER_BILLING_PROVIDER,
} from './customer-billing.types';
import { StripeCustomerBillingProvider } from './stripe-customer-billing.provider';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [CustomerBillingController],
  providers: [
    CustomerBillingService,
    JwtService,
    {
      provide: CUSTOMER_BILLING_OPTIONS,
      useFactory: createCustomerBillingOptions,
    },
    {
      provide: CUSTOMER_BILLING_PROVIDER,
      useClass: StripeCustomerBillingProvider,
    },
  ],
})
export class CustomerBillingModule {}
