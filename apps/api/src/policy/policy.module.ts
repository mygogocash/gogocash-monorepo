import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RolesGuard } from 'src/admin/roles.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { MediaModule } from 'src/media/media.module';
import { PolicyController } from './policy.controller';
import { PolicyAggregateService } from './policy-aggregate.service';
import { PolicyService } from './policy.service';
import { PolicyTransactionCapabilityGuard } from './policy-transaction-capability.guard';
import {
  PolicyCategorySource,
  PolicyCategorySourceSchema,
} from './schemas/policy-category-source.schema';
import {
  PolicyLifecycleCommand,
  PolicyLifecycleCommandSchema,
} from './schemas/policy-lifecycle-command.schema';
import {
  PolicyMediaCleanup,
  PolicyMediaCleanupSchema,
} from './schemas/policy-media-cleanup.schema';
import { Policy, PolicySchema } from './schemas/policy.schema';
import { CategoryIntegrityModule } from './category-integrity.module';
import { CategoryIntegrityReadinessGuard } from './category-integrity-readiness.guard';
import { PolicyQaFailureInjectionController } from './policy-qa-failure-injection.controller';
import { PolicyQaFailureInjectionGuard } from './policy-qa-failure-injection.guard';
import { PolicyQaFailureInjectionHook } from './policy-qa-failure-injection.hook';

/**
 * Self-contained module — registers the Policy collection plus a read-only
 * mount of Category (for the upsert "category exists?" check). JwtModule
 * is registered with the admin secret so AuthAdminGuard verifies admin
 * tokens on the PUT/DELETE routes (matches the pattern used in admin.module).
 */
@Module({
  imports: [
    MediaModule,
    CategoryIntegrityModule,
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: Category.name, schema: CategorySchema },
      {
        name: PolicyLifecycleCommand.name,
        schema: PolicyLifecycleCommandSchema,
      },
      {
        name: PolicyCategorySource.name,
        schema: PolicyCategorySourceSchema,
      },
      { name: PolicyMediaCleanup.name, schema: PolicyMediaCleanupSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_ADMIN_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PolicyController, PolicyQaFailureInjectionController],
  providers: [
    PolicyService,
    PolicyAggregateService,
    PolicyTransactionCapabilityGuard,
    CategoryIntegrityReadinessGuard,
    PolicyQaFailureInjectionGuard,
    PolicyQaFailureInjectionHook,
    AuthAdminGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [
    PolicyService,
    CategoryIntegrityModule,
    PolicyQaFailureInjectionHook,
  ],
})
export class PolicyModule {}
