import 'reflect-metadata';
import { ROLES_KEY } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { SearchController } from './search.controller';

const GUARDS = '__guards__';
const classGuards = (C: unknown): unknown[] =>
  (Reflect.getMetadata(GUARDS, C as object) as unknown[]) ?? [];
// Mirrors RolesGuard's `getAllAndOverride(ROLES_KEY, [handler, class])`:
// handler metadata wins; the class value only applies when the handler has none.
const effectiveRoles = (C: unknown, m: string): string[] | undefined => {
  const proto = (C as { prototype: Record<string, unknown> }).prototype;
  const onHandler = Reflect.getMetadata(ROLES_KEY, proto[m] as object) as
    string[] | undefined;
  if (onHandler !== undefined) return onHandler;
  return Reflect.getMetadata(ROLES_KEY, C as object) as string[] | undefined;
};

const READ_HANDLERS = [
  'getRules',
  'getFeaturedTerms',
  'getBoostRules',
  'getBlacklist',
];
const MUTATION_HANDLERS = [
  'createRule',
  'updateRule',
  'deleteRule',
  'createFeaturedTerm',
  'reorderFeaturedTerms',
  'updateFeaturedTerm',
  'deleteFeaturedTerm',
  'createBoostRule',
  'updateBoostRule',
  'deleteBoostRule',
  'createBlacklistEntry',
  'deleteBlacklistEntry',
  'bulkImportBlacklist',
];

/**
 * Issue #279: the class-level @Roles('support') made every /admin/search/*
 * route — including plain GETs — 403 for a 'viewer' admin, so the Search
 * Management tab could never load. Reads must be open to any authenticated
 * admin (RolesGuard is a no-op without roles metadata); writes stay
 * support-gated because they control user-facing search results.
 */
describe('SearchController RBAC (#279)', () => {
  it('keeps AuthAdminGuard and RolesGuard at the class level', () => {
    expect(classGuards(SearchController)).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
  });

  it.each(READ_HANDLERS)(
    'GET handler %s > requires no role (readable by any authenticated admin)',
    (handler) => {
      expect(effectiveRoles(SearchController, handler)).toBeUndefined();
    },
  );

  it.each(MUTATION_HANDLERS)(
    'mutation handler %s > effective required role is support',
    (handler) => {
      expect(effectiveRoles(SearchController, handler)).toContain('support');
    },
  );
});
