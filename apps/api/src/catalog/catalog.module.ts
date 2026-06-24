import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Brand, BrandSchema } from '../brand/schemas/brand.schema';
import {
  AdminCatalogController,
  AdminCommerceController,
  CatalogController,
  CommerceController,
  CommercePaymentsController,
} from './catalog.controller';
import { CatalogMediaService } from './media.service';
import { CatalogService } from './catalog.service';
import { CommerceService } from './commerce.service';
import { COMMERCE_PAYMENT_PROVIDER } from './providers/commerce-payment.provider';
import { StripeCommercePaymentProvider } from './providers/stripe-commerce-payment.provider';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CatalogBanner, CatalogBannerSchema } from './schemas/catalog-banner.schema';
import { CatalogProduct, CatalogProductSchema } from './schemas/catalog-product.schema';
import { CommerceOrder, CommerceOrderSchema } from './schemas/order.schema';
import { InventoryReservation, InventoryReservationSchema } from './schemas/inventory-reservation.schema';
import { PaymentAttempt, PaymentAttemptSchema } from './schemas/payment-attempt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: CatalogBanner.name, schema: CatalogBannerSchema },
      { name: CatalogProduct.name, schema: CatalogProductSchema },
      { name: Cart.name, schema: CartSchema },
      { name: CommerceOrder.name, schema: CommerceOrderSchema },
      { name: InventoryReservation.name, schema: InventoryReservationSchema },
      { name: PaymentAttempt.name, schema: PaymentAttemptSchema },
    ]),
  ],
  controllers: [
    CatalogController,
    AdminCatalogController,
    CommerceController,
    AdminCommerceController,
    CommercePaymentsController,
  ],
  providers: [
    CatalogService,
    CommerceService,
    CatalogMediaService,
    {
      provide: COMMERCE_PAYMENT_PROVIDER,
      useClass: StripeCommercePaymentProvider,
    },
  ],
  exports: [CatalogService, CommerceService],
})
export class CatalogModule {}
