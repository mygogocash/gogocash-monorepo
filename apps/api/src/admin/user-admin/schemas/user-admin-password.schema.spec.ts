import { UserAdminSchema } from './user-admin.schema';

describe('UserAdmin password projection', () => {
  it('excludes password hashes from queries unless authentication opts in', () => {
    expect(UserAdminSchema.path('password').options.select).toBe(false);
  });

  it('starts legacy-compatible credential generations at zero', () => {
    expect(UserAdminSchema.path('session_version').options).toEqual(
      expect.objectContaining({ default: 0, min: 0 }),
    );
  });
});
