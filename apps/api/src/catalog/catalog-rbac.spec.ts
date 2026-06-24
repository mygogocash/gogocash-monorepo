import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';
import { ROLES_KEY } from '../admin/roles.decorator';
import { RolesGuard } from '../admin/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import {
  AdminCatalogController,
  AdminCommerceController,
  CatalogController,
  CommerceController,
  CommercePaymentsController,
} from './catalog.controller';

const guardsOnClass = (target: Function) => Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
const rolesOnClass = (target: Function) => Reflect.getMetadata(ROLES_KEY, target) ?? [];
const rolesOnMethod = (target: Function, method: string) =>
  Reflect.getMetadata(ROLES_KEY, target.prototype[method]) ?? [];

describe('catalog and commerce route guards', () => {
  it('leaves public catalog and payment webhook routes unauthenticated', () => {
    expect(guardsOnClass(CatalogController)).toEqual([]);
    expect(guardsOnClass(CommercePaymentsController)).toEqual([]);
  });

  it('protects admin catalog routes with admin auth and support-level role', () => {
    expect(guardsOnClass(AdminCatalogController)).toEqual(expect.arrayContaining([AuthAdminGuard, RolesGuard]));
    expect(rolesOnClass(AdminCatalogController)).toContain('support');
  });

  it('protects customer cart and checkout routes with Firebase auth', () => {
    expect(guardsOnClass(CommerceController)).toContain(FirebaseAuthGuard);
  });

  it('requires approver or higher for admin order status updates', () => {
    expect(guardsOnClass(AdminCommerceController)).toEqual(expect.arrayContaining([AuthAdminGuard, RolesGuard]));
    expect(rolesOnMethod(AdminCommerceController, 'updateOrderStatus')).toContain('approver');
  });
});
