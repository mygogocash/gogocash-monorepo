import 'reflect-metadata';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { WalletsController } from './wallets/wallets.controller';
import { CreditScoresController } from './credit-scores/credit-scores.controller';
import { MissingOrdersController } from './missing-orders/missing-orders.controller';
import { ReferralsController } from './referrals/referrals.controller';
import { TransactionsController } from './transactions/transactions.controller';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { MembershipController } from './membership/membership.controller';
import { DiscoverController } from './discover/discover.controller';
import { CommissionManagementController } from './commission-management/commission-management.controller';
import { SearchController } from './search/search.controller';
import { AdminController } from './admin.controller';
import { PointController } from 'src/point/point.controller';
import { OfferController } from 'src/offer/offer.controller';
import { BrandController } from 'src/brand/brand.controller';
import { AuthAdminGuard } from './jwt-auth-admin.guard';

const GUARDS = '__guards__';
const rolesOnMethod = (C: unknown, m: string): string[] => {
  const proto = (C as { prototype: Record<string, unknown> }).prototype;
  return (Reflect.getMetadata(ROLES_KEY, proto[m] as object) as string[]) ?? [];
};
const rolesOnClass = (C: unknown): string[] =>
  (Reflect.getMetadata(ROLES_KEY, C as object) as string[]) ?? [];
const classGuards = (C: unknown): unknown[] =>
  (Reflect.getMetadata(GUARDS, C as object) as unknown[]) ?? [];
const methodGuards = (C: unknown, m: string): unknown[] => {
  const proto = (C as { prototype: Record<string, unknown> }).prototype;
  return (Reflect.getMetadata(GUARDS, proto[m] as object) as unknown[]) ?? [];
};

/**
 * Regression guard for the Phase-1 server-side RBAC rollout. If a future edit
 * removes RolesGuard or a @Roles tier from a money/sensitive admin route, this
 * fails CI instead of silently re-opening it to any authenticated admin.
 */
describe('Admin money/sensitive controllers enforce roles', () => {
  const sensitiveControllers = [
    WalletsController,
    CreditScoresController,
    MissingOrdersController,
    ReferralsController,
    TransactionsController,
    SubscriptionsController,
    MembershipController,
    DiscoverController,
    SearchController,
    CommissionManagementController,
  ];

  it('all attach RolesGuard at the class level', () => {
    for (const C of sensitiveControllers) {
      expect(classGuards(C)).toContain(RolesGuard);
    }
  });

  it('per-route money tiers are declared', () => {
    expect(rolesOnMethod(WalletsController, 'adjust')).toContain('superadmin');
    expect(rolesOnMethod(WalletsController, 'freeze')).toContain('approver');
    expect(rolesOnMethod(WalletsController, 'unfreeze')).toContain('approver');
    expect(rolesOnMethod(CreditScoresController, 'updateConfig')).toContain(
      'superadmin',
    );
    expect(rolesOnMethod(CreditScoresController, 'override')).toContain(
      'approver',
    );
    expect(rolesOnMethod(MissingOrdersController, 'approve')).toContain(
      'approver',
    );
    expect(rolesOnMethod(MissingOrdersController, 'reject')).toContain(
      'approver',
    );
    expect(rolesOnMethod(ReferralsController, 'approve')).toContain('approver');
    expect(rolesOnMethod(ReferralsController, 'updateConfig')).toContain(
      'superadmin',
    );
    expect(rolesOnMethod(TransactionsController, 'flagTransaction')).toContain(
      'approver',
    );
  });

  it('config controllers carry a class-level minimum tier', () => {
    expect(rolesOnClass(SubscriptionsController)).toContain('superadmin');
    expect(rolesOnClass(MembershipController)).toContain('superadmin');
    expect(rolesOnClass(DiscoverController)).toContain('support');
    expect(rolesOnClass(SearchController)).toContain('support');
    expect(rolesOnClass(CommissionManagementController)).toContain('support');
  });
});

/**
 * Phase 2: routes the Phase-1 pass left unguarded (fail-open to viewer) or
 * under-tiered. RolesGuard is opt-in per route, so an undecorated mutation is
 * reachable by ANY authenticated admin (viewer floor). These assertions pin the
 * closed tiers so a future edit can't silently re-open them.
 */
describe('Admin Phase-2 RBAC gap closures', () => {
  it('AdminController attaches RolesGuard at the class level', () => {
    expect(classGuards(AdminController)).toContain(RolesGuard);
  });

  it('previously-unguarded mutations now require a tier', () => {
    // Homepage "top brands" merchandising (writes the banner config).
    expect(rolesOnMethod(AdminController, 'saveTopBrands')).toContain(
      'approver',
    );
    // Internal case notes — a read-only viewer must not be able to write them.
    expect(rolesOnMethod(MissingOrdersController, 'addNote')).toContain(
      'support',
    );
    // Dead create() stub — guarded so it cannot be silently implemented open.
    expect(rolesOnMethod(AdminController, 'create')).toContain('superadmin');
  });

  it('update-offer is raised to superadmin (edits commission_store/max_cap)', () => {
    expect(rolesOnMethod(AdminController, 'updateOffer')).toContain(
      'superadmin',
    );
    // The raise must REPLACE approver: @Roles(...) passes if the role meets ANY
    // listed tier, so leaving 'approver' in would keep the weaker bar.
    expect(rolesOnMethod(AdminController, 'updateOffer')).not.toContain(
      'approver',
    );
  });

  it('quest task updates require superadmin because they edit point economics', () => {
    expect(rolesOnMethod(PointController, 'updateQuestTasks')).toContain(
      'superadmin',
    );
  });

  it('quest reward updates require superadmin because they edit payouts', () => {
    expect(rolesOnMethod(PointController, 'updateQuestRewards')).toContain(
      'superadmin',
    );
  });

  it('quest campaign create and close require superadmin because they control public campaigns', () => {
    expect(rolesOnMethod(PointController, 'createQuest')).toContain(
      'superadmin',
    );
    expect(rolesOnMethod(PointController, 'closeQuest')).toContain(
      'superadmin',
    );
  });

  it('bulk transaction CSV export is restricted to support+', () => {
    expect(rolesOnMethod(TransactionsController, 'exportCsv')).toContain(
      'support',
    );
  });

  it('manual point award route requires authenticated superadmin access', () => {
    expect(methodGuards(PointController, 'savePoint')).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
    expect(rolesOnMethod(PointController, 'savePoint')).toContain('superadmin');
  });

  it('admin offer inventory is not publicly reachable', () => {
    expect(methodGuards(OfferController, 'findAllAdmin')).toContain(
      AuthAdminGuard,
    );
  });

  it('brand write routes require support+ because they control customer-visible brand records', () => {
    for (const method of ['create', 'update', 'remove']) {
      expect(methodGuards(BrandController, method)).toEqual(
        expect.arrayContaining([AuthAdminGuard, RolesGuard]),
      );
      expect(rolesOnMethod(BrandController, method)).toContain('support');
    }
  });

  it('policy category create requires support+ (mutation; a viewer must not mint categories)', () => {
    expect(rolesOnMethod(AdminController, 'createCategory')).toContain(
      'support',
    );
  });

  it('update banner home requires support+ to align with admin banner:manage', () => {
    expect(rolesOnMethod(AdminController, 'updateBannerHome')).toContain(
      'support',
    );
    expect(rolesOnMethod(AdminController, 'updateBannerHome')).not.toContain(
      'superadmin',
    );
  });

  it('create offer requires approver+ to align with admin brands:manage', () => {
    expect(methodGuards(OfferController, 'createOffer')).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
    expect(rolesOnMethod(OfferController, 'createOffer')).toContain('approver');
    expect(rolesOnMethod(OfferController, 'createOffer')).not.toContain(
      'superadmin',
    );
  });

  it('commission fetch-best and deeplink updates require approver+', () => {
    expect(
      rolesOnMethod(CommissionManagementController, 'fetchBest'),
    ).toContain('approver');
    expect(
      rolesOnMethod(CommissionManagementController, 'updateDeeplink'),
    ).toContain('approver');
  });
});
