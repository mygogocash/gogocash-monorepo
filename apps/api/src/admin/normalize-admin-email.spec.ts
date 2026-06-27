import { adminEmailEquals, normalizeAdminEmail } from './normalize-admin-email';

describe('normalizeAdminEmail', () => {
  it('trims and lowercases admin emails', () => {
    expect(normalizeAdminEmail('  Lady.Kirsah@gmail.com ')).toBe(
      'lady.kirsah@gmail.com',
    );
  });

  it('compares mailbox addresses case-insensitively', () => {
    expect(
      adminEmailEquals('Lady.Kirsah@gmail.com', 'lady.kirsah@gmail.com'),
    ).toBe(true);
  });
});
