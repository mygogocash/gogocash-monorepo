import { roleHasAccess } from './user-admin.schema';

/**
 * Guards the privilege boundary for `@Roles('superadmin')` (admin invite).
 * Must hold across BOTH role vocabularies — API (viewer/support/approver/
 * superadmin) and admin-UI (super_admin/admin/editor/viewer).
 */
describe('roleHasAccess > superadmin gate', () => {
  it('allows top-tier roles in either vocabulary', () => {
    expect(roleHasAccess('superadmin', 'superadmin')).toBe(true);
    expect(roleHasAccess('super_admin', 'superadmin')).toBe(true);
  });

  it('allows legacy accounts with no role (backward compat)', () => {
    expect(roleHasAccess(undefined, 'superadmin')).toBe(true);
    expect(roleHasAccess(null, 'superadmin')).toBe(true);
  });

  it('DENIES every non-superadmin role (privilege escalation guard)', () => {
    for (const r of ['viewer', 'support', 'approver', 'admin', 'editor']) {
      expect(roleHasAccess(r, 'superadmin')).toBe(false);
    }
  });

  it('still ranks lower tiers correctly for non-superadmin gates', () => {
    expect(roleHasAccess('approver', 'support')).toBe(true); // approver ≥ support
    expect(roleHasAccess('admin', 'support')).toBe(true); // admin→approver ≥ support
    expect(roleHasAccess('editor', 'approver')).toBe(false); // editor→support < approver
    expect(roleHasAccess('viewer', 'support')).toBe(false);
  });
});
