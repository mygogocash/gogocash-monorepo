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
import { SearchController } from './search/search.controller';

const GUARDS = '__guards__';
const rolesOnMethod = (C: unknown, m: string): string[] => {
  const proto = (C as { prototype: Record<string, unknown> }).prototype;
  return (Reflect.getMetadata(ROLES_KEY, proto[m] as object) as string[]) ?? [];
};
const rolesOnClass = (C: unknown): string[] =>
  (Reflect.getMetadata(ROLES_KEY, C as object) as string[]) ?? [];
const classGuards = (C: unknown): unknown[] =>
  (Reflect.getMetadata(GUARDS, C as object) as unknown[]) ?? [];

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
    expect(rolesOnMethod(CreditScoresController, 'updateConfig')).toContain('superadmin');
    expect(rolesOnMethod(CreditScoresController, 'override')).toContain('approver');
    expect(rolesOnMethod(MissingOrdersController, 'approve')).toContain('approver');
    expect(rolesOnMethod(MissingOrdersController, 'reject')).toContain('approver');
    expect(rolesOnMethod(ReferralsController, 'approve')).toContain('approver');
    expect(rolesOnMethod(ReferralsController, 'updateConfig')).toContain('superadmin');
    expect(rolesOnMethod(TransactionsController, 'flagTransaction')).toContain('approver');
  });

  it('config controllers carry a class-level minimum tier', () => {
    expect(rolesOnClass(SubscriptionsController)).toContain('superadmin');
    expect(rolesOnClass(MembershipController)).toContain('superadmin');
    expect(rolesOnClass(DiscoverController)).toContain('support');
    expect(rolesOnClass(SearchController)).toContain('support');
  });
});
