import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { Policy, PolicySchema } from './schemas/policy.schema';

/**
 * Self-contained module — registers the Policy collection plus a read-only
 * mount of Category (for the upsert "category exists?" check). JwtModule
 * is registered with the admin secret so AuthAdminGuard verifies admin
 * tokens on the PUT/DELETE routes (matches the pattern used in admin.module).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_ADMIN_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PolicyController],
  providers: [PolicyService, AuthAdminGuard, RateLimitGuard],
  exports: [PolicyService],
})
export class PolicyModule {}
