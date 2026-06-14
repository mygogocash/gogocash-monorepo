/**
 * One-shot (idempotent) migration: convert existing `users.country` values
 * from full English names ("Thailand") to ISO-3166-1 alpha-2 ("TH").
 *
 * Why
 * ───
 * The customer-app country picker historically wrote `selectCountry?.label`
 * (full name) instead of `selectCountry?.code` (ISO-2). Affiliate feeds ship
 * ISO-2, so the two never compared equal — every signed-in customer saw zero
 * brand cards on every discovery surface until the read-time fix landed.
 *
 * The read-time fix is now superseded by:
 *   1. All client writers send ISO-2 (this PR).
 *   2. Server-side normalisation in `UserService` / `AuthService`
 *      (`toIso2Server`), so any legacy client still sending "Thailand" is
 *      coerced before persistence.
 *   3. This migration: a single backfill so existing rows match new ones.
 *
 * Strategy
 * ────────
 * For every user document:
 *   1. Skip if `country` is already a 2-character uppercase string (canonical).
 *   2. Look up the lowercased trimmed value in `LABEL_TO_ISO2`. If found,
 *      $set the ISO-2 value.
 *   3. If unmappable, log it and skip (no blind uppercase — admins should
 *      eyeball edge cases, e.g. "Thailand 🇹🇭", typos, free-text leaks from
 *      the admin UI).
 *
 * Idempotency
 * ───────────
 *   - Re-running is safe; canonical rows are skipped.
 *   - `--dry-run` prints what would change without writing.
 *
 * Run
 * ───
 *   npm run migrate:country:dry      # preview
 *   npm run migrate:country          # apply
 *
 * Reads `MONGO_URI` from the environment.
 *
 * Backups
 * ───────
 * Take a `mongodump` (or equivalent snapshot) before running APPLY mode.
 * The change is reversible per-row (full-name backups are in the dry-run
 * log) but a snapshot is the cheapest insurance.
 */

import 'dotenv/config';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../src/user/schemas/user.schema';
import { LABEL_TO_ISO2 } from '../src/utils/country';

interface MigrationStats {
  scanned: number;
  alreadyCanonical: number;
  mapped: number;
  unmappable: { id: string; value: string }[];
  errors: { id: string; error: string }[];
}

function isCanonicalIso2(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length === 2 && trimmed === trimmed.toUpperCase();
}

function tryMap(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const mapped = LABEL_TO_ISO2[trimmed.toLowerCase()];
  return mapped ?? null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(
    `[migrate-country] connecting (${dryRun ? 'DRY RUN' : 'APPLY'})…`,
  );
  await mongoose.connect(mongoUri);

  const UserModel = (mongoose.models[User.name] ??
    mongoose.model(User.name, UserSchema)) as Model<User>;

  const stats: MigrationStats = {
    scanned: 0,
    alreadyCanonical: 0,
    mapped: 0,
    unmappable: [],
    errors: [],
  };

  // Track every change so dry-run output is auditable and apply mode prints
  // the same picture before touching the DB.
  const changes: { id: string; from: string; to: string }[] = [];

  const cursor = UserModel.find({}).lean().cursor();
  for await (const doc of cursor) {
    stats.scanned += 1;
    const current = (doc as { country?: string }).country ?? '';
    const id = String((doc as { _id: unknown })._id);

    try {
      if (!current) {
        // Empty / missing country — leave it alone. Schema default ('TH') only
        // applies on insert; a backfill that overwrites legitimate empties
        // would be a different decision and is out of scope here.
        continue;
      }
      if (isCanonicalIso2(current)) {
        stats.alreadyCanonical += 1;
        continue;
      }
      const next = tryMap(current);
      if (!next) {
        stats.unmappable.push({ id, value: current });
        continue;
      }
      changes.push({ id, from: current, to: next });
      if (!dryRun) {
        await UserModel.updateOne(
          { _id: doc._id },
          { $set: { country: next } },
        );
      }
      stats.mapped += 1;
    } catch (err) {
      stats.errors.push({
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log('[migrate-country] done');
  console.table({
    'Users scanned': stats.scanned,
    'Already canonical (skipped)': stats.alreadyCanonical,
    [dryRun ? 'Would map' : 'Mapped']: stats.mapped,
    'Unmappable (manual review)': stats.unmappable.length,
    'Empty country (skipped)':
      stats.scanned -
      stats.alreadyCanonical -
      stats.mapped -
      stats.unmappable.length -
      stats.errors.length,
    Errors: stats.errors.length,
  });

  // Always show the change list — small migrations are fully auditable, and
  // for large ones we cap at 50 to keep CI logs sane.
  if (changes.length > 0) {
    console.log(
      `\n[migrate-country] ${dryRun ? 'Pending' : 'Applied'} changes (${changes.length}):`,
    );
    for (const c of changes.slice(0, 50)) {
      console.log(`  - ${c.id}: "${c.from}" → "${c.to}"`);
    }
    if (changes.length > 50) {
      console.log(`  … ${changes.length - 50} more`);
    }
  }

  if (stats.unmappable.length > 0) {
    console.log(
      '\n[migrate-country] Unmappable values (manual review required):',
    );
    for (const u of stats.unmappable.slice(0, 50)) {
      console.log(`  - ${u.id}: "${u.value}"`);
    }
    if (stats.unmappable.length > 50) {
      console.log(`  … ${stats.unmappable.length - 50} more`);
    }
    console.log(
      '\n  These were NOT changed. Add the missing label→ISO-2 entry to ' +
        'src/utils/country.ts (and the matching entry on the customer-app ' +
        'side in src/lib/countries/canonical.ts), then re-run.',
    );
  }

  if (stats.errors.length > 0) {
    console.log('\n[migrate-country] Errors:');
    for (const e of stats.errors.slice(0, 20)) {
      console.log(`  - ${e.id}: ${e.error}`);
    }
    if (stats.errors.length > 20) {
      console.log(`  … ${stats.errors.length - 20} more`);
    }
  }

  await mongoose.disconnect();
  // Exit non-zero on errors OR unmappables so CI / on-call notice rather than
  // silently moving on.
  process.exit(
    stats.errors.length > 0 ? 2 : stats.unmappable.length > 0 ? 3 : 0,
  );
}

main().catch((err) => {
  console.error('[migrate-country] fatal error:', err);
  process.exit(1);
});
