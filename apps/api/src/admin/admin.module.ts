import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import { RolesGuard } from './roles.guard';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserAdminService } from './user-admin/user-admin-service';
import { AdminInviteService } from './admin-invite.service';
import { EmailModule } from 'src/email/email.module';
import { AdminToken, AdminTokenSchema } from './schemas/admin-token.schema';
import {
  AdminInviteState,
  AdminInviteStateSchema,
} from './schemas/admin-invite-state.schema';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';

// Phase 2A: Transactions
import { TransactionsController } from './transactions/transactions.controller';
import { TransactionsService } from './transactions/transactions.service';

// Phase 2B: Wallets
import { WalletsController } from './wallets/wallets.controller';
import { WalletsService } from './wallets/wallets.service';

// Phase 3A: Missing Orders
import { MissingOrdersController } from './missing-orders/missing-orders.controller';
import { MissingOrdersService } from './missing-orders/missing-orders.service';

// Phase 3B: Referrals
import { ReferralsController } from './referrals/referrals.controller';
import { ReferralsService } from './referrals/referrals.service';

// Phase 4A: Credit Scores
import { CreditScoresController } from './credit-scores/credit-scores.controller';
import { CreditScoresService } from './credit-scores/credit-scores.service';

// Phase 4B: Membership
import { MembershipController } from './membership/membership.controller';
import { MembershipService } from './membership/membership.service';

// Phase 5: Subscriptions
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

// Phase 6: Discover & Search
import { DiscoverController } from './discover/discover.controller';
import { DiscoverService } from './discover/discover.service';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { CommissionManagementController } from './commission-management/commission-management.controller';
import { CommissionManagementService } from './commission-management/commission-management.service';

import {
  UserAdmin,
  UserAdminSchema,
} from './user-admin/schemas/user-admin.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Withdraw, WithdrawSchema } from 'src/withdraw/schemas/withdraw.schema';
import { FeeRate, FeeRateSchema } from 'src/withdraw/schemas/feeRate.schema';
import { Offer, OfferSchema } from 'src/offer/schemas/offer.schema';
import { Category, CategorySchema } from 'src/offer/schemas/category.schema';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';
import {
  UserMyCashback,
  UserMyCashbackSchema,
} from 'src/user/schemas/user-my-cashback.schema';
import {
  ALL_BRAND_BANNER_COLLECTION,
  ALL_BRAND_BANNER_MODEL,
  Banner,
  BannerSchema,
} from 'src/offer/schemas/banner.schema';
import {
  SPECIFIC_PAGE_BANNER_COLLECTION,
  SPECIFIC_PAGE_BANNER_MODEL,
  SpecificPageBannerSchema,
} from 'src/offer/schemas/specific-page-banner.schema';
import {
  TopBrandConfig,
  TopBrandConfigSchema,
} from 'src/offer/schemas/top-brand-config.schema';
import { Deeplink, DeeplinkSchema } from 'src/involve/schemas/deeplink.schema';
import {
  WithdrawMethod,
  WithdrawMethodSchema,
} from 'src/withdraw/schemas/withdrawMethod.schema';
import { Coupon, CouponSchema } from 'src/offer/schemas/coupon.schema';
import {
  RewardList,
  RewardListSchema,
} from 'src/withdraw/schemas/rewardList.schema';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import {
  SocialReward,
  SocialRewardSchema,
} from 'src/point/schemas/social-reward.schema';
import {
  WalletAdjustment,
  WalletAdjustmentSchema,
} from './wallets/schemas/wallet-adjustment.schema';
import {
  MissingOrder,
  MissingOrderSchema,
} from './missing-orders/schemas/missing-order.schema';
import {
  ReferralConfig,
  ReferralConfigSchema,
} from './referrals/schemas/referral-config.schema';
import {
  CreditScoreConfig,
  CreditScoreConfigSchema,
} from './credit-scores/schemas/credit-score-config.schema';
import {
  CreditScoreAudit,
  CreditScoreAuditSchema,
} from './credit-scores/schemas/credit-score-audit.schema';
import {
  MembershipTier,
  MembershipTierSchema,
} from './membership/schemas/membership-tier.schema';
import {
  Membership,
  MembershipSchema,
} from './membership/schemas/membership.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './subscriptions/schemas/subscription-plan.schema';
import {
  Subscription,
  SubscriptionSchema,
} from './subscriptions/schemas/subscription.schema';
import {
  DiscoverSection,
  DiscoverSectionSchema,
} from './discover/schemas/discover-section.schema';
import {
  FeaturedSearchTerm,
  FeaturedSearchTermSchema,
} from './search/schemas/featured-term.schema';
import {
  SearchBoostRule,
  SearchBoostRuleSchema,
} from './search/schemas/boost-rule.schema';
import {
  SearchBlacklist,
  SearchBlacklistSchema,
} from './search/schemas/blacklist.schema';

import { InvolveModule } from 'src/involve/involve.module';
import { AffiliateModule } from 'src/affiliate/affiliate.module';
import { UserService } from 'src/user/user.service';
import { MediaModule } from 'src/media/media.module';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { PointModule } from 'src/point/point.module';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    CacheModule.register(),
    AnalyticsModule,
    EmailModule,
    MediaModule,
    PointModule,
    // InvolveModule stays: JobService / WithdrawService (providers here) inject
    // InvolveService. AffiliateModule adds the seam CommissionManagementService
    // dispatches offer-refresh through.
    InvolveModule,
    AffiliateModule,
    MongooseModule.forFeature([
      { name: UserAdmin.name, schema: UserAdminSchema },
      { name: AdminToken.name, schema: AdminTokenSchema },
      { name: AdminInviteState.name, schema: AdminInviteStateSchema },
      { name: User.name, schema: UserSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
      { name: FeeRate.name, schema: FeeRateSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Conversion.name, schema: ConversionSchema },
      { name: UserMyCashback.name, schema: UserMyCashbackSchema },
      { name: Banner.name, schema: BannerSchema },
      {
        name: ALL_BRAND_BANNER_MODEL,
        schema: BannerSchema,
        collection: ALL_BRAND_BANNER_COLLECTION,
      },
      {
        name: SPECIFIC_PAGE_BANNER_MODEL,
        schema: SpecificPageBannerSchema,
        collection: SPECIFIC_PAGE_BANNER_COLLECTION,
      },
      { name: TopBrandConfig.name, schema: TopBrandConfigSchema },
      { name: Deeplink.name, schema: DeeplinkSchema },
      { name: WithdrawMethod.name, schema: WithdrawMethodSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: RewardList.name, schema: RewardListSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: Point.name, schema: PointSchema },
      { name: SocialReward.name, schema: SocialRewardSchema },
      // Phase 2B
      { name: WalletAdjustment.name, schema: WalletAdjustmentSchema },
      // Phase 3A
      { name: MissingOrder.name, schema: MissingOrderSchema },
      // Phase 3B
      { name: ReferralConfig.name, schema: ReferralConfigSchema },
      // Phase 4A
      { name: CreditScoreConfig.name, schema: CreditScoreConfigSchema },
      { name: CreditScoreAudit.name, schema: CreditScoreAuditSchema },
      // Phase 4B
      { name: MembershipTier.name, schema: MembershipTierSchema },
      { name: Membership.name, schema: MembershipSchema },
      // Phase 5
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      // Phase 6
      { name: DiscoverSection.name, schema: DiscoverSectionSchema },
      { name: FeaturedSearchTerm.name, schema: FeaturedSearchTermSchema },
      { name: SearchBoostRule.name, schema: SearchBoostRuleSchema },
      { name: SearchBlacklist.name, schema: SearchBlacklistSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_ADMIN_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    AdminController,
    DashboardController,
    TransactionsController,
    WalletsController,
    MissingOrdersController,
    ReferralsController,
    CreditScoresController,
    MembershipController,
    SubscriptionsController,
    DiscoverController,
    SearchController,
    CommissionManagementController,
  ],
  providers: [
    AdminService,
    UserAdminService,
    AdminInviteService,
    DashboardService,
    TransactionsService,
    WalletsService,
    MissingOrdersService,
    ReferralsService,
    CreditScoresService,
    MembershipService,
    SubscriptionsService,
    DiscoverService,
    SearchService,
    CommissionManagementService,
    JwtService,
    UserService,
    JobService,
    WithdrawService,
    RateLimitGuard,
    RolesGuard,
  ],
  exports: [AdminService, UserAdminService],
})
export class AdminModule {}
