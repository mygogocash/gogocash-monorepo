import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';
import { ROLES_KEY } from '../admin/roles.decorator';
import { RolesGuard } from '../admin/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RateLimitGuard } from '../auth/rate-limit.guard';
import {
  AdminCatalogController,
  AdminCommerceController,
  CatalogController,
  CommerceController,
  CommercePaymentsController,
} from './catalog.controller';

type ControllerClass = abstract new (...args: never[]) => unknown;

const guardsOnClass = (target: ControllerClass) =>
  Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
const rolesOnClass = (target: ControllerClass) =>
  Reflect.getMetadata(ROLES_KEY, target) ?? [];
const rolesOnMethod = (target: ControllerClass, method: string) =>
  Reflect.getMetadata(ROLES_KEY, target.prototype[method]) ?? [];

describe('catalog and commerce route guards', () => {
  it('leaves public catalog and payment webhook routes unauthenticated', () => {
    expect(guardsOnClass(CatalogController)).toEqual(
      expect.arrayContaining([RateLimitGuard]),
    );
    expect(guardsOnClass(CommercePaymentsController)).toEqual([]);
  });

  it('rate-limits customer checkout while keeping Firebase auth', () => {
    expect(guardsOnClass(CommerceController)).toEqual(
      expect.arrayContaining([FirebaseAuthGuard, RateLimitGuard]),
    );
  });

  it('protects admin catalog reads with admin auth and viewer-level role', () => {
    expect(guardsOnClass(AdminCatalogController)).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
    expect(rolesOnClass(AdminCatalogController)).toContain('viewer');
  });

  it('requires approver or higher for admin catalog mutations', () => {
    expect(rolesOnMethod(AdminCatalogController, 'createBanner')).toContain(
      'approver',
    );
    expect(rolesOnMethod(AdminCatalogController, 'updateBanner')).toContain(
      'approver',
    );
    expect(rolesOnMethod(AdminCatalogController, 'archiveBanner')).toContain(
      'approver',
    );
    expect(rolesOnMethod(AdminCatalogController, 'updateShop')).toContain(
      'approver',
    );
    expect(rolesOnMethod(AdminCatalogController, 'createProduct')).toContain(
      'approver',
    );
    expect(rolesOnMethod(AdminCatalogController, 'updateProduct')).toContain(
      'approver',
    );
    expect(rolesOnMethod(AdminCatalogController, 'archiveProduct')).toContain(
      'approver',
    );
    expect(
      rolesOnMethod(AdminCatalogController, 'createMediaUpload'),
    ).toContain('approver');
  });

  it('requires approver or higher for admin order status updates', () => {
    expect(guardsOnClass(AdminCommerceController)).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
    expect(rolesOnClass(AdminCommerceController)).toContain('viewer');
    expect(
      rolesOnMethod(AdminCommerceController, 'updateOrderStatus'),
    ).toContain('approver');
  });
});
