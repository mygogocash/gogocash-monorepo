import fs from 'node:fs';
import path from 'node:path';

const apiRoot = path.resolve(__dirname, '..');

const mongoSearchSources = [
  'src/admin/admin.service.ts',
  'src/admin/transactions/transactions.service.ts',
  'src/offer/offer.service.ts',
  'src/user/user.service.ts',
] as const;

/** Services flagged by CodeQL that must route regex/search through mongo-query helpers. */
const mongoQueryHelperSources = [
  'src/admin/admin.service.ts',
  'src/admin/credit-scores/credit-scores.service.ts',
  'src/admin/membership/membership.service.ts',
  'src/admin/missing-orders/missing-orders.service.ts',
  'src/admin/referrals/referrals.service.ts',
  'src/admin/search/search.service.ts',
  'src/admin/subscriptions/subscriptions.service.ts',
  'src/admin/transactions/transactions.service.ts',
  'src/brand/brand.service.ts',
  'src/catalog/catalog.service.ts',
  'src/catalog/commerce.service.ts',
  'src/catalog/media.service.ts',
  'src/gototrack/gototrack.service.ts',
  'src/offer/offer.service.ts',
  'src/point/point.service.ts',
  'src/telegram-bot/telegram-auth.controller.ts',
  'src/withdraw/withdraw.service.ts',
] as const;

describe('mongo search regex safety', () => {
  it.each(mongoSearchSources)(
    'given %s > then user search terms use escapeRegexLiteral before $regex',
    (relativePath) => {
      const source = fs.readFileSync(path.join(apiRoot, relativePath), 'utf8');

      expect(source).toContain('escapeRegexLiteral');
      expect(source).not.toMatch(/\{\s*\$regex:\s*search,/);
    },
  );

  it.each(mongoQueryHelperSources)(
    'given %s > then imports mongo-query helpers',
    (relativePath) => {
      const source = fs.readFileSync(path.join(apiRoot, relativePath), 'utf8');

      expect(source).toMatch(/from ['"]src\/common\/mongo-query['"]/);
    },
  );
});
