import fs from 'node:fs';
import path from 'node:path';

const apiRoot = path.resolve(__dirname, '..');

const mongoSearchSources = [
  'src/admin/admin.service.ts',
  'src/admin/transactions/transactions.service.ts',
  'src/offer/offer.service.ts',
  'src/user/user.service.ts',
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
});
