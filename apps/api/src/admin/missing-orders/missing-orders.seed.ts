import { createHash } from 'node:crypto';

import {
  buildMissionOrderCustomerSnapshot,
  buildMissionOrderDedupeKey,
} from '../../offer/mission-order.contract';

export const MISSING_ORDERS_SEED_APPLY_CONFIRMATION =
  'SEED_MISSING_CONVERSIONS_QA';
export const MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION =
  'CLEANUP_MISSING_CONVERSIONS_QA';

export type MissingOrdersSeedTarget = 'development' | 'staging';
export type MissingOrdersSeedMode = 'dry-run' | 'apply' | 'cleanup';

export type MissingOrdersSeedCommand = {
  mode: MissingOrdersSeedMode;
  target?: MissingOrdersSeedTarget;
  marker?: string;
  userId?: string;
  offerId?: string;
  confirmation?: string;
  help: boolean;
};

type Row = Record<string, any>;

export interface MissingOrdersSeedStore {
  upsertBySeedRecordKey(record: Row): Promise<{ created: boolean }>;
  deleteByExactMarker(filter: { seed_marker: string }): Promise<number>;
}

function option(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = argv.find((argument) => argument.startsWith(prefix));
  return value?.slice(prefix.length).trim() || undefined;
}

export function parseMissingOrdersSeedArgs(
  argv: string[],
): MissingOrdersSeedCommand {
  const help = argv.includes('--help') || argv.includes('-h');
  const apply = argv.includes('--apply');
  const cleanup = argv.includes('--cleanup');
  if (apply && cleanup) {
    throw new Error('Choose exactly one write mode: --apply or --cleanup');
  }

  const knownFlags = new Set(['--help', '-h', '--apply', '--cleanup']);
  const knownOptions = [
    '--target=',
    '--marker=',
    '--user-id=',
    '--offer-id=',
    '--confirm=',
  ];
  const unknown = argv.find(
    (argument) =>
      !knownFlags.has(argument) &&
      !knownOptions.some((prefix) => argument.startsWith(prefix)),
  );
  if (unknown) throw new Error(`Unknown argument: ${unknown}`);

  return {
    mode: cleanup ? 'cleanup' : apply ? 'apply' : 'dry-run',
    target: option(argv, 'target') as MissingOrdersSeedTarget | undefined,
    marker: option(argv, 'marker'),
    userId: option(argv, 'user-id'),
    offerId: option(argv, 'offer-id'),
    confirmation: option(argv, 'confirm'),
    help,
  };
}

function normalizeEnvironmentName(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'dev') return 'development';
  return normalized;
}

function assertMarker(marker: string | undefined, target: string | undefined) {
  if (
    !marker ||
    !/^issue-351-(development|staging)-[a-f\d]{16,64}$/.test(marker) ||
    !marker.startsWith(`issue-351-${target}-`)
  ) {
    throw new Error(
      'A unique marker is required: issue-351-<target>-<16-64 lowercase hex characters>',
    );
  }
}

/**
 * Fail-closed write fence. NODE_ENV=production is allowed only when Railway
 * positively identifies the deployment as staging; NODE_ENV alone does not
 * distinguish the staging and production API builds.
 */
export function assertMissingOrdersSeedCommandAllowed(
  command: MissingOrdersSeedCommand,
  env: NodeJS.ProcessEnv,
) {
  if (command.help) return;
  if (command.target !== 'development' && command.target !== 'staging') {
    throw new Error('--target must be development or staging');
  }
  assertMarker(command.marker, command.target);

  if (command.mode !== 'cleanup' && (!command.userId || !command.offerId)) {
    throw new Error('--user-id and --offer-id are required for seed planning');
  }

  const deployment = normalizeEnvironmentName(
    env.RAILWAY_ENVIRONMENT_NAME ?? env.DEPLOY_ENV ?? env.APP_ENV,
  );
  if (deployment === 'production') {
    throw new Error('Refusing to seed or clean up a production deployment');
  }
  if (env.NODE_ENV === 'production' && !deployment) {
    throw new Error(
      'NODE_ENV=production cannot prove a non-production target; set RAILWAY_ENVIRONMENT_NAME=staging',
    );
  }
  if (
    (deployment === 'development' || deployment === 'staging') &&
    deployment !== command.target
  ) {
    throw new Error(
      `--target=${command.target} does not match deployment ${deployment}`,
    );
  }

  if (
    command.mode === 'apply' &&
    command.confirmation !== MISSING_ORDERS_SEED_APPLY_CONFIRMATION
  ) {
    throw new Error(
      `Apply requires --confirm=${MISSING_ORDERS_SEED_APPLY_CONFIRMATION}`,
    );
  }
  if (
    command.mode === 'cleanup' &&
    command.confirmation !== MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION
  ) {
    throw new Error(
      `Cleanup requires --confirm=${MISSING_ORDERS_SEED_CLEANUP_CONFIRMATION}`,
    );
  }
}

function idString(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toHexString' in value &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  ) {
    return (value as { toHexString(): string }).toHexString();
  }
  return value == null ? '' : String(value).trim();
}

function markerDigest(marker: string): string {
  return createHash('sha256').update(marker).digest('hex').slice(0, 12);
}

export function buildMissingOrdersSeedRecords(input: {
  marker: string;
  user: Row;
  offer: Row;
  now: Date;
}): Row[] {
  const userId = idString(input.user._id);
  const offerId = idString(input.offer._id);
  const providerOfferId = Number(
    input.offer.offer_id ?? input.offer.provider_offer_id,
  );
  const source = String(input.offer.source ?? '').trim();
  if (!userId || !offerId || !source || !Number.isFinite(providerOfferId)) {
    throw new Error(
      'Canonical User and source-aware Offer fields are required',
    );
  }

  const base = {
    user_id: input.user._id,
    offer_id: input.offer._id,
    customer_snapshot: buildMissionOrderCustomerSnapshot(input.user),
    offer_snapshot: {
      source,
      provider_offer_id: providerOfferId,
      name: String(input.offer.offer_name ?? input.offer.name ?? ''),
    },
    purchase_date: new Date(input.now.getTime() - 86_400_000),
    order_amount: 351,
    currency: 'THB',
    evidence_refs: [],
    schema_version: 2,
    seed_marker: input.marker,
    createdAt: new Date(input.now.getTime()),
    updatedAt: new Date(input.now.getTime()),
  };
  const digest = markerDigest(input.marker);
  const cases: Array<{
    key: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    fields?: Row;
  }> = [
    { key: 'pending', status: 'pending' },
    {
      key: 'approved',
      status: 'approved',
      fields: {
        resolution_note: 'QA approval workflow verified; no reward was posted.',
        resolved_at: new Date(input.now.getTime()),
      },
    },
    {
      key: 'rejected',
      status: 'rejected',
      fields: {
        rejection_reason: 'QA rejection workflow verified.',
        resolution_note: 'QA rejection workflow verified.',
        resolved_at: new Date(input.now.getTime()),
      },
    },
    {
      key: 'note-history',
      status: 'under_review',
      fields: {
        assigned_to: 'issue-351-qa-operator',
        notes: [
          {
            admin_id: 'issue-351-qa-operator',
            admin_name: 'Issue 351 QA',
            text: 'Claim received by QA.',
            created_at: new Date(input.now.getTime() - 120_000),
          },
          {
            admin_id: 'issue-351-qa-operator',
            admin_name: 'Issue 351 QA',
            text: 'Source-aware offer mapping verified.',
            created_at: new Date(input.now.getTime() - 60_000),
          },
        ],
      },
    },
  ];

  return cases.map((seedCase) => {
    const orderId = `ISSUE-351-${digest}-${seedCase.key.toUpperCase()}`;
    return {
      ...base,
      order_id: orderId,
      remarks: `Issue #351 ${seedCase.key} QA fixture`,
      notes: [],
      assigned_to: null,
      resolution_note: null,
      rejection_reason: null,
      resolved_at: null,
      status: seedCase.status,
      seed_record_key: `${input.marker}:${seedCase.key}`,
      dedupe_key: buildMissionOrderDedupeKey(userId, offerId, orderId),
      ...seedCase.fields,
    };
  });
}

export function buildMissingOrdersSeedCleanupFilter(marker: string): {
  seed_marker: string;
} {
  return { seed_marker: marker };
}

export async function runMissingOrdersSeed(
  store: MissingOrdersSeedStore,
  input: {
    mode: MissingOrdersSeedMode;
    marker: string;
    user?: Row;
    offer?: Row;
    now: Date;
  },
) {
  if (input.mode === 'cleanup') {
    const deleted = await store.deleteByExactMarker(
      buildMissingOrdersSeedCleanupFilter(input.marker),
    );
    return { mode: input.mode, planned: 0, written: 0, deleted };
  }
  if (!input.user || !input.offer) {
    throw new Error('Canonical User and Offer are required');
  }

  const records = buildMissingOrdersSeedRecords({
    marker: input.marker,
    user: input.user,
    offer: input.offer,
    now: input.now,
  });
  if (input.mode === 'dry-run') {
    return {
      mode: input.mode,
      planned: records.length,
      written: 0,
      created: 0,
      updated: 0,
      records,
    };
  }

  let created = 0;
  for (const record of records) {
    const result = await store.upsertBySeedRecordKey(record);
    if (result.created) created += 1;
  }
  return {
    mode: input.mode,
    planned: records.length,
    written: records.length,
    created,
    updated: records.length - created,
    records,
  };
}
