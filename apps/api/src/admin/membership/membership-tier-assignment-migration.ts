import { randomUUID } from 'node:crypto';

import mongoose, { Model } from 'mongoose';

import {
  Membership,
  MembershipDocument,
  MembershipSchema,
} from './schemas/membership.schema';

export const MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION =
  'APPLY_ISSUE_353_MEMBERSHIP_TIER_ASSIGNMENT_BOUNDARY';

export const MEMBERSHIP_TIER_ASSIGNMENT_MISSING_FILTER = Object.freeze({
  tier_assignment_started_at: { $exists: false },
});

type Target = 'development' | 'staging' | 'production';

export type MembershipTierAssignmentInventory = {
  total: number;
  missing: number;
  valid: number;
  malformed: number;
};

export interface MembershipTierAssignmentMigrationStore {
  inventory(): Promise<MembershipTierAssignmentInventory>;
  backfillMissing(
    baseline: Date,
  ): Promise<{ matched: number; modified: number }>;
}

export interface MembershipTierAssignmentMigrationRuntime {
  connect(uri: string): Promise<unknown>;
  disconnect(): Promise<unknown>;
  databaseName(): string;
  now(): Date;
  randomUUID(): string;
  createStore(): MembershipTierAssignmentMigrationStore;
}

export type MembershipTierAssignmentMigrationResult = {
  issue: 353;
  operation: 'membership-tier-assignment-boundary-backfill';
  mode: 'dry-run' | 'apply';
  run_id: string;
  captured_at_utc: string;
  baseline_utc: string;
  target: Target;
  database: string;
  before: MembershipTierAssignmentInventory;
  applied: { matched: number; modified: number };
  rerun: { matched: number; modified: number } | null;
  after: MembershipTierAssignmentInventory;
  remaining: { missing: number; malformed: number };
  remaining_missing: number;
  remaining_malformed: number;
  ready_to_enable_task_v2: boolean;
};

type ParsedCommand = {
  apply: boolean;
  target: Target;
  database: string;
  baseline: Date;
};

const MAX_BASELINE_AGE_MS = 15 * 60 * 1_000;

function option(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

function strictUtcBaseline(value: string | undefined, now: Date): Date {
  if (!value) {
    throw new Error(
      'Migration requires an explicit --baseline=<strict ISO UTC rollout timestamp>.',
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error('--baseline must be a strict ISO UTC timestamp.');
  }
  const baseline = new Date(value);
  if (
    Number.isNaN(baseline.getTime()) ||
    baseline.toISOString() !== value ||
    baseline.getTime() > now.getTime() ||
    now.getTime() - baseline.getTime() > MAX_BASELINE_AGE_MS
  ) {
    throw new Error(
      '--baseline must be finite, strict ISO UTC, not in the future, and no more than 15 minutes old.',
    );
  }
  return baseline;
}

function parseCommand(argv: string[], now: Date): ParsedCommand {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run');
  if (apply && dryRun)
    throw new Error('Choose --apply or --dry-run, not both.');

  const knownFlags = new Set([
    '--apply',
    '--dry-run',
    '--backup-confirmed',
    '--allow-production',
  ]);
  const knownOptions = [
    '--target=',
    '--confirm-database=',
    '--baseline=',
    '--confirm=',
  ];
  const unknown = argv.find(
    (argument) =>
      !knownFlags.has(argument) &&
      !knownOptions.some((prefix) => argument.startsWith(prefix)),
  );
  if (unknown) throw new Error(`Unknown argument: ${unknown}`);

  const target = option(argv, 'target');
  if (
    target !== 'development' &&
    target !== 'staging' &&
    target !== 'production'
  ) {
    throw new Error(
      'Migration requires --target=development, --target=staging, or --target=production.',
    );
  }
  const database = option(argv, 'confirm-database');
  if (!database) {
    throw new Error(
      'Migration requires --confirm-database=<exact target database name>.',
    );
  }
  const productionLike =
    target === 'production' ||
    database.toLowerCase() === 'gogocash' ||
    /(^|[-_])(prod|production)([-_]|$)/i.test(database);
  if (productionLike && !argv.includes('--allow-production')) {
    throw new Error(
      'Refusing a production-like target without --allow-production.',
    );
  }

  if (apply) {
    if (!argv.includes('--backup-confirmed')) {
      throw new Error('Apply requires --backup-confirmed.');
    }
    if (
      option(argv, 'confirm') !== MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION
    ) {
      throw new Error(
        `Apply requires --confirm=${MEMBERSHIP_TIER_ASSIGNMENT_APPLY_CONFIRMATION}.`,
      );
    }
  }

  return {
    apply,
    target,
    database,
    baseline: strictUtcBaseline(option(argv, 'baseline'), now),
  };
}

export function redactMongoCredentials(message: string): string {
  return message.replace(
    /(mongodb(?:\+srv)?:\/\/)([^@\s/]+)@/gi,
    '$1[credentials-redacted]@',
  );
}

export function mongoUriLooksProduction(uri: string): boolean {
  const authority = uri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)/i)?.[1];
  if (!authority) {
    throw new Error('MONGO_URI is not a valid MongoDB connection string.');
  }
  const hosts = authority
    .slice(authority.lastIndexOf('@') + 1)
    .split(',')
    .map(
      (host) =>
        host
          .trim()
          .replace(/^\[|\]$/g, '')
          .split(':')[0],
    )
    .filter(Boolean);
  if (hosts.length === 0) {
    throw new Error('MONGO_URI does not contain a MongoDB hostname.');
  }
  return hosts.some((rawHost) => {
    const host = rawHost.toLowerCase();
    if (host.startsWith('gogocash-staging.')) return false;
    return (
      /(^|[.-])(prod|production)([.-]|$)/.test(host) ||
      /^gogocash\.[^.]+\.mongodb\.net$/.test(host) ||
      /^gogocash-prod(?:[.-]|$)/.test(host)
    );
  });
}

function defaultRuntime(): MembershipTierAssignmentMigrationRuntime {
  return {
    connect: (uri) => mongoose.connect(uri),
    disconnect: () => mongoose.disconnect(),
    databaseName: () => mongoose.connection.db?.databaseName ?? '',
    now: () => new Date(),
    randomUUID,
    createStore: () => {
      const membershipModel = (mongoose.models[Membership.name] ??
        mongoose.model(
          Membership.name,
          MembershipSchema,
        )) as Model<MembershipDocument>;
      return {
        async inventory() {
          const [total, missing, valid] = await Promise.all([
            membershipModel.countDocuments({}),
            membershipModel.countDocuments(
              MEMBERSHIP_TIER_ASSIGNMENT_MISSING_FILTER,
            ),
            membershipModel.countDocuments({
              tier_assignment_started_at: { $type: 'date' },
            }),
          ]);
          return {
            total,
            missing,
            valid,
            malformed: total - missing - valid,
          };
        },
        async backfillMissing(baseline) {
          const result = await membershipModel.updateMany(
            MEMBERSHIP_TIER_ASSIGNMENT_MISSING_FILTER,
            { $set: { tier_assignment_started_at: baseline } },
          );
          return {
            matched: result.matchedCount,
            modified: result.modifiedCount,
          };
        },
      };
    },
  };
}

/**
 * Runs the #353 migration contract. Omitting --apply is always a zero-write
 * dry run. Every write uses the absent-only filter and one explicit rollout
 * baseline, regardless of membership status.
 */
export async function executeMembershipTierAssignmentMigration(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
  runtime: MembershipTierAssignmentMigrationRuntime = defaultRuntime(),
): Promise<MembershipTierAssignmentMigrationResult> {
  const capturedAt = runtime.now();
  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error('Migration runtime returned an invalid current time.');
  }
  const command = parseCommand(argv, capturedAt);
  const mongoUri = env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set. Aborting.');
  if (
    mongoUriLooksProduction(mongoUri) &&
    !argv.includes('--allow-production')
  ) {
    throw new Error(
      'Refusing a production-like MongoDB host without --allow-production.',
    );
  }

  let connected = false;
  try {
    await runtime.connect(mongoUri);
    connected = true;
    const actualDatabase = runtime.databaseName();
    if (!actualDatabase || actualDatabase !== command.database) {
      throw new Error(
        `Target database confirmation failed: connected database is ${actualDatabase || '[unknown]'}, not ${command.database}.`,
      );
    }

    const store = runtime.createStore();
    const before = await store.inventory();
    const zero = { matched: 0, modified: 0 };
    if (!command.apply) {
      return {
        issue: 353,
        operation: 'membership-tier-assignment-boundary-backfill',
        mode: 'dry-run',
        run_id: runtime.randomUUID(),
        captured_at_utc: capturedAt.toISOString(),
        baseline_utc: command.baseline.toISOString(),
        target: command.target,
        database: actualDatabase,
        before,
        applied: zero,
        rerun: null,
        after: before,
        remaining: { missing: before.missing, malformed: before.malformed },
        remaining_missing: before.missing,
        remaining_malformed: before.malformed,
        ready_to_enable_task_v2: before.missing === 0 && before.malformed === 0,
      };
    }

    if (before.malformed !== 0) {
      throw new Error(
        `Refusing apply: ${before.malformed} membership boundary value(s) are malformed and require manual review.`,
      );
    }

    const applied = await store.backfillMissing(command.baseline);
    if (
      applied.matched !== before.missing ||
      applied.modified !== before.missing
    ) {
      throw new Error(
        'Membership rows changed after inventory; keep task-v2 disabled and investigate the CAS mismatch.',
      );
    }
    const rerun = await store.backfillMissing(command.baseline);
    const after = await store.inventory();
    if (
      rerun.matched !== 0 ||
      rerun.modified !== 0 ||
      after.missing !== 0 ||
      after.malformed !== 0
    ) {
      throw new Error(
        'Membership boundary apply did not reach an idempotent zero-remaining state; keep task-v2 disabled.',
      );
    }

    return {
      issue: 353,
      operation: 'membership-tier-assignment-boundary-backfill',
      mode: 'apply',
      run_id: runtime.randomUUID(),
      captured_at_utc: capturedAt.toISOString(),
      baseline_utc: command.baseline.toISOString(),
      target: command.target,
      database: actualDatabase,
      before,
      applied,
      rerun,
      after,
      remaining: { missing: after.missing, malformed: after.malformed },
      remaining_missing: after.missing,
      remaining_malformed: after.malformed,
      ready_to_enable_task_v2: true,
    };
  } finally {
    if (connected) await runtime.disconnect();
  }
}
