import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Brand, BrandSchema } from 'src/brand/schemas/brand.schema';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { MediaModule } from 'src/media/media.module';

import { CategoryIntegrityService } from './category-integrity.service';
import { PolicyIntegrityFenceService } from './policy-integrity-fence.service';
import { PolicyMediaAssetRegistryService } from './policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from './policy-media-cleanup.service';
import { PolicyMediaWriteService } from './policy-media-write.service';
import {
  PolicyCategorySource,
  PolicyCategorySourceSchema,
} from './schemas/policy-category-source.schema';
import {
  PolicyIntegrityState,
  PolicyIntegrityStateSchema,
} from './schemas/policy-integrity-state.schema';
import {
  PolicyLifecycleCommand,
  PolicyLifecycleCommandSchema,
} from './schemas/policy-lifecycle-command.schema';
import {
  PolicyMediaAssetRegistry,
  PolicyMediaAssetRegistrySchema,
} from './schemas/policy-media-asset-registry.schema';
import {
  PolicyMediaCleanup,
  PolicyMediaCleanupSchema,
} from './schemas/policy-media-cleanup.schema';
import {
  PolicyMediaWriteCommand,
  PolicyMediaWriteCommandSchema,
} from './schemas/policy-media-write-command.schema';
import { Policy, PolicySchema } from './schemas/policy.schema';

/**
 * Neutral category integrity boundary. It imports no feature module, so Offer,
 * Admin, Involve, and Policy can all consume it without a module cycle.
 */
@Module({
  imports: [
    MediaModule,
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Policy.name, schema: PolicySchema },
      { name: PolicyCategorySource.name, schema: PolicyCategorySourceSchema },
      { name: PolicyIntegrityState.name, schema: PolicyIntegrityStateSchema },
      {
        name: PolicyLifecycleCommand.name,
        schema: PolicyLifecycleCommandSchema,
      },
      {
        name: PolicyMediaAssetRegistry.name,
        schema: PolicyMediaAssetRegistrySchema,
      },
      { name: PolicyMediaCleanup.name, schema: PolicyMediaCleanupSchema },
      {
        name: PolicyMediaWriteCommand.name,
        schema: PolicyMediaWriteCommandSchema,
      },
    ]),
  ],
  providers: [
    PolicyIntegrityFenceService,
    CategoryIntegrityService,
    PolicyMediaAssetRegistryService,
    PolicyMediaCleanupService,
    PolicyMediaWriteService,
  ],
  exports: [
    MongooseModule,
    PolicyIntegrityFenceService,
    CategoryIntegrityService,
    PolicyMediaAssetRegistryService,
    PolicyMediaCleanupService,
    PolicyMediaWriteService,
  ],
})
export class CategoryIntegrityModule {}
