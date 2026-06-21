import 'reflect-metadata';
import { AdminController } from './admin.controller';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthAdminGuard } from './jwt-auth-admin.guard';

/**
 * Pins the admin-controller authorization contract so a future edit that drops
 * a guard fails CI instead of silently re-opening a route. (Phase 0 RBAC fix.)
 */
const proto = AdminController.prototype as unknown as Record<string, unknown>;
const GUARDS_METADATA = '__guards__';

function rolesOf(method: string): string[] {
  return (
    (Reflect.getMetadata(ROLES_KEY, proto[method] as object) as string[]) ?? []
  );
}
function isPublic(method: string): boolean {
  return Reflect.getMetadata(IS_PUBLIC_KEY, proto[method] as object) === true;
}

describe('AdminController RBAC wiring', () => {
  it('protects the controller class with AuthAdminGuard by default (fail-closed)', () => {
    const guards =
      (Reflect.getMetadata(GUARDS_METADATA, AdminController) as unknown[]) ??
      [];
    expect(guards).toContain(AuthAdminGuard);
  });

  describe("superadmin-only routes require @Roles('superadmin')", () => {
    for (const method of ['update', 'remove', 'register', 'invite']) {
      it(`${method}`, () => {
        expect(rolesOf(method)).toContain('superadmin');
      });
    }
  });

  describe('public routes are @Public (token/credential authenticated, no admin JWT)', () => {
    for (const method of [
      'login',
      'acceptInvite',
      'forgotPassword',
      'resetPassword',
    ]) {
      it(`${method}`, () => {
        expect(isPublic(method)).toBe(true);
      });
    }
  });
});
