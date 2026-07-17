import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { Offer, OfferSchema } from '../offer/schemas/offer.schema';
import { CategoryIntegrityModule } from 'src/policy/category-integrity.module';

/**
 * Brand parent collection + admin CRUD endpoints + customer variant resolver.
 * Imports the Offer model so the service can populate variants and mirror
 * visibility flags onto offer rows (denormalized for fast filtering).
 */
@Module({
  imports: [
    CategoryIntegrityModule,
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: Offer.name, schema: OfferSchema },
    ]),
  ],
  controllers: [BrandController],
  providers: [BrandService, JwtService],
  exports: [BrandService],
})
export class BrandModule {}
