import 'dotenv/config';

import { createHash } from 'node:crypto';
import { open, readFile, stat } from 'node:fs/promises';

import mongoose, { Types } from 'mongoose';

import {
  assertMissingOrdersRollbackReport,
  buildMissingOrdersRollbackManifestChecksum,
  type LegacyMissionOrderCollection,
  MISSING_ORDERS_UNSAFE_PREIMAGE_ERROR_CODE,
  type MissingOrdersMigrationStore,
  type MissingOrdersRollbackChange,
  type MissingOrdersRollbackJournal,
  type MissingOrdersRollbackStore,
  runMissingOrdersMigration,
  runMissingOrdersRollback,
} from './missing-orders.migration';
import {
  assertMissingOrdersSeedCommandAllowed,
  buildMissingOrdersSeedCleanupFilter,
  type MissingOrdersSeedStore,
  parseMissingOrdersSeedArgs,
  runMissingOrdersSeed,
} from './missing-orders.seed';

export const MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION =
  'APPLY_MISSING_ORDERS_SCHEMA_V2';
export const MISSING_ORDERS_ROLLBACK_APPLY_CONFIRMATION =
  'ROLLBACK_MISSING_ORDERS_SCHEMA_V2';

type Row = Record<string, any>;
type Target = 'development' | 'staging';
type MigrationCommand = {
  apply: boolean;
  target?: Target;
  confirmation?: string;
  runId?: string;
  rollbackJournalPath?: string;
  help: boolean;
};
type RollbackCommand = {
  apply: boolean;
  target?: Target;
  confirmation?: string;
  reportPath?: string;
  reportSha256?: string;
  journalPath?: string;
  journalSha256?: string;
  help: boolean;
};

export interface MissingOrdersCliRuntime {
  connect(uri: string): Promise<void>;
  disconnect(): Promise<void>;
  readReportFile(path: string): Promise<Buffer>;
  statReportFile(path: string): Promise<{ size: number }>;
  createRollbackJournal(
    path: string,
    header: Row,
  ): Promise<MissingOrdersRollbackJournal>;
  createMigrationStore(): MissingOrdersMigrationStore;
  createRollbackStore(): MissingOrdersRollbackStore;
  createSeedStore(): MissingOrdersSeedStore;
  findSeedUser(id: string): Promise<Row | null>;
  findSeedOffer(id: string): Promise<Row | null>;
  now(): Date;
}

const MAX_ROLLBACK_ARTIFACT_BYTES = 50 * 1024 * 1024;
export const MAX_MISSING_ORDERS_CLI_OUTPUT_BYTES = 50 * 1024 * 1024;
const PRESERVE_BSON_SUBTYPES = { promoteValues: false, promoteLongs: false };

function unsafePreimageError(message: string) {
  return Object.assign(new Error(message), {
    code: MISSING_ORDERS_UNSAFE_PREIMAGE_ERROR_CODE,
  });
}

const HELP = `Usage:
  node dist/admin/missing-orders/missing-orders.cli.js migrate \\
    --target=development [--dry-run] [--run-id=<id>]
  node dist/admin/missing-orders/missing-orders.cli.js migrate \\
    --target=development --apply \\
    --confirm=${MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION} \\
    --rollback-journal=<new-restricted.ndjson>
  node dist/admin/missing-orders/missing-orders.cli.js rollback \\
    --target=development --report=<migration-apply.json> \\
    --report-sha256=<exact-file-sha256> [--dry-run]
  node dist/admin/missing-orders/missing-orders.cli.js rollback \\
    --target=development --report=<migration-apply.json> \\
    --report-sha256=<exact-file-sha256> --apply \\
    --confirm=${MISSING_ORDERS_ROLLBACK_APPLY_CONFIRMATION}
  node dist/admin/missing-orders/missing-orders.cli.js rollback \\
    --target=development --journal=<migration-reverse-cas.ndjson> \\
    --journal-sha256=<exact-file-sha256> [--dry-run|--apply]
  node dist/admin/missing-orders/missing-orders.cli.js seed \\
    --target=development --marker=<unique-marker> \\
    --user-id=<object-id> --offer-id=<object-id> [--apply --confirm=SEED_MISSING_CONVERSIONS_QA]
  node dist/admin/missing-orders/missing-orders.cli.js seed \\
    --target=development --marker=<exact-marker> --cleanup \\
    --confirm=CLEANUP_MISSING_CONVERSIONS_QA

The compiled CommonJS entry uses plain Node.js and never requires a TypeScript
loader. Migration, rollback, and seed default to zero-write dry-run. Production
is refused.`;

function assertExactPreimageValue(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): void {
  if (value === undefined) {
    throw unsafePreimageError(
      `Cannot compare undefined migration preimage value at ${path}`,
    );
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    throw unsafePreimageError(
      `Cannot compare unsupported migration preimage at ${path}`,
    );
  }
  if (value === null || typeof value !== 'object') return;
  if (
    value instanceof Date ||
    value instanceof RegExp ||
    ArrayBuffer.isView(value) ||
    ('_bsontype' in value && typeof value._bsontype === 'string')
  ) {
    return;
  }
  if (ancestors.has(value)) {
    throw unsafePreimageError(
      `Cannot compare cyclic migration preimage at ${path}`,
    );
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw unsafePreimageError(
          `Cannot compare sparse migration preimage array at ${path}[${index}]`,
        );
      }
      assertExactPreimageValue(value[index], `${path}[${index}]`, ancestors);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw unsafePreimageError(
        `Cannot compare unsupported migration preimage at ${path}`,
      );
    }
    for (const [key, nestedValue] of Object.entries(value)) {
      assertExactPreimageValue(nestedValue, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}

/**
 * Compare the complete BSON preimage, independent of top-level field order.
 * The `_id` anchor keeps the replacement index-selective; `$setEquals` over
 * `$objectToArray` rejects every changed, removed, or newly added field.
 */
export function buildMissingOrdersMigrationCasFilter(
  id: unknown,
  preimage: Row,
) {
  const exactPreimage = Object.prototype.hasOwnProperty.call(preimage, '_id')
    ? preimage
    : { _id: id, ...preimage };
  const entries = Object.entries(exactPreimage).map(([key, value]) => {
    assertExactPreimageValue(value, key, new Set());
    return { k: key, v: value };
  });

  return {
    _id: id,
    $expr: {
      $setEquals: [{ $objectToArray: '$$ROOT' }, { $literal: entries }],
    },
  };
}

function option(argv: string[], name: string) {
  const prefix = `--${name}=`;
  return argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

function parseMissingOrdersMigrationArgs(argv: string[]): MigrationCommand {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run');
  if (apply && dryRun) throw new Error('Choose --apply or --dry-run, not both');

  const knownFlags = new Set(['--help', '-h', '--apply', '--dry-run']);
  const knownOptions = [
    '--target=',
    '--confirm=',
    '--run-id=',
    '--rollback-journal=',
  ];
  const unknown = argv.find(
    (argument) =>
      !knownFlags.has(argument) &&
      !knownOptions.some((prefix) => argument.startsWith(prefix)),
  );
  if (unknown) throw new Error(`Unknown argument: ${unknown}`);

  return {
    apply,
    target: option(argv, 'target') as Target | undefined,
    confirmation: option(argv, 'confirm'),
    runId: option(argv, 'run-id'),
    rollbackJournalPath: option(argv, 'rollback-journal'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function parseMissingOrdersRollbackArgs(argv: string[]): RollbackCommand {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run');
  if (apply && dryRun) throw new Error('Choose --apply or --dry-run, not both');

  const knownFlags = new Set(['--help', '-h', '--apply', '--dry-run']);
  const knownOptions = [
    '--target=',
    '--confirm=',
    '--report=',
    '--report-sha256=',
    '--journal=',
    '--journal-sha256=',
  ];
  const unknown = argv.find(
    (argument) =>
      !knownFlags.has(argument) &&
      !knownOptions.some((prefix) => argument.startsWith(prefix)),
  );
  if (unknown) throw new Error(`Unknown argument: ${unknown}`);

  return {
    apply,
    target: option(argv, 'target') as Target | undefined,
    confirmation: option(argv, 'confirm'),
    reportPath: option(argv, 'report'),
    reportSha256: option(argv, 'report-sha256'),
    journalPath: option(argv, 'journal'),
    journalSha256: option(argv, 'journal-sha256'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function normalizedEnvironment(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'dev' ? 'development' : normalized;
}

function assertMissingOrdersMigrationAllowed(
  command: MigrationCommand,
  env: NodeJS.ProcessEnv,
) {
  if (command.help) return;
  if (command.target !== 'development' && command.target !== 'staging') {
    throw new Error('--target must be development or staging');
  }
  const deployment = normalizedEnvironment(
    env.RAILWAY_ENVIRONMENT_NAME ?? env.DEPLOY_ENV ?? env.APP_ENV,
  );
  if (deployment === 'production') {
    throw new Error('Refusing to migrate a production deployment');
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
    command.apply &&
    command.confirmation !== MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION
  ) {
    throw new Error(
      `Apply requires --confirm=${MISSING_ORDERS_MIGRATION_APPLY_CONFIRMATION}`,
    );
  }
  if (command.apply && !command.rollbackJournalPath) {
    throw new Error(
      'Apply requires --rollback-journal=<new restricted append-only journal>',
    );
  }
}

function databaseIdentityFromMongoUri(uri: string): string | undefined {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/#]+)/i.exec(uri);
  if (!match) return undefined;
  try {
    const database = decodeURIComponent(match[1]).trim();
    return database || undefined;
  } catch {
    throw new Error('MONGO_URI has an invalid database name');
  }
}

function assertRollbackAuthorityTarget(
  applyReport: unknown,
  target: Target | undefined,
  databaseIdentity: string | undefined,
) {
  if (!applyReport || typeof applyReport !== 'object') {
    throw new Error('Rollback report is not an object');
  }
  const execution = (applyReport as Row).execution;
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) {
    throw new Error('Rollback report is missing bound execution target');
  }
  if ((execution as Row).target !== target) {
    throw new Error(
      `Rollback report target ${(execution as Row).target ?? 'missing'} does not match --target=${target}`,
    );
  }
  if (
    typeof (execution as Row).databaseIdentity !== 'string' ||
    !(execution as Row).databaseIdentity.trim()
  ) {
    throw new Error('Rollback report is missing a non-empty database identity');
  }
  if ((execution as Row).databaseIdentity !== databaseIdentity) {
    throw new Error(
      'Rollback report database identity does not match MONGO_URI',
    );
  }
}

function requiredDatabaseIdentity(mongoUri: string): string {
  const identity = databaseIdentityFromMongoUri(mongoUri);
  if (!identity) {
    throw new Error('MONGO_URI must include a non-empty database identity');
  }
  return identity;
}

function assertMissingOrdersRollbackAllowed(
  command: RollbackCommand,
  env: NodeJS.ProcessEnv,
) {
  if (command.help) return;
  assertMissingOrdersMigrationAllowed(
    {
      apply: false,
      target: command.target,
      help: false,
    },
    env,
  );
  const reportProvided = Boolean(command.reportPath || command.reportSha256);
  const journalProvided = Boolean(command.journalPath || command.journalSha256);
  if (reportProvided === journalProvided) {
    throw new Error(
      'Rollback requires exactly one complete --report/--report-sha256 or --journal/--journal-sha256 authority pair',
    );
  }
  const authorityPath = command.reportPath ?? command.journalPath;
  const authoritySha256 = command.reportSha256 ?? command.journalSha256;
  if (!authorityPath) {
    throw new Error('Rollback authority path is required');
  }
  if (!authoritySha256 || !/^[a-f0-9]{64}$/.test(authoritySha256)) {
    throw new Error(
      'Rollback requires --report-sha256=<lowercase SHA-256 of the exact apply report>',
    );
  }
  if (
    command.apply &&
    command.confirmation !== MISSING_ORDERS_ROLLBACK_APPLY_CONFIRMATION
  ) {
    throw new Error(
      `Rollback apply requires --confirm=${MISSING_ORDERS_ROLLBACK_APPLY_CONFIRMATION}`,
    );
  }
}

function reportFromRollbackJournal(bytes: Buffer): Row {
  if (bytes.byteLength === 0) throw new Error('Rollback journal is empty');
  const text = bytes.toString('utf8');
  const hasTerminatingNewline = text.endsWith('\n');
  const lines = text.split('\n');
  if (hasTerminatingNewline) lines.pop();
  if (lines.length === 0) throw new Error('Rollback journal is empty');
  let header: Row;
  try {
    header = JSON.parse(lines[0]);
  } catch {
    throw new Error('Rollback journal header is not valid JSON');
  }
  if (
    header.kind !== 'missing-orders-reverse-cas-journal' ||
    header.version !== 1 ||
    typeof header.runId !== 'string' ||
    !header.execution ||
    typeof header.execution !== 'object'
  ) {
    throw new Error('Rollback journal header is invalid');
  }
  const changes: MissingOrdersRollbackChange[] = [];
  const byCanonicalId = new Map<string, MissingOrdersRollbackChange>();
  const terminalStateByCanonicalId = new Map<
    string,
    'pending' | 'commit' | 'not_applied'
  >();
  for (let index = 1; index < lines.length; index += 1) {
    if (!lines[index]) {
      throw new Error(`Rollback journal record ${index} is invalid`);
    }
    let record: Row;
    try {
      record = JSON.parse(lines[index]);
    } catch {
      if (index === lines.length - 1 && !hasTerminatingNewline) {
        break;
      }
      throw new Error(`Rollback journal record ${index} is not valid JSON`);
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Rollback journal record ${index} is invalid`);
    }
    if (
      record.kind === 'change' &&
      record.change &&
      typeof record.change === 'object'
    ) {
      const change = record.change as MissingOrdersRollbackChange;
      if (!change.canonicalId || byCanonicalId.has(change.canonicalId)) {
        throw new Error(`Rollback journal record ${index} is invalid`);
      }
      byCanonicalId.set(change.canonicalId, change);
      terminalStateByCanonicalId.set(change.canonicalId, 'pending');
      changes.push(change);
      continue;
    }
    if (
      (record.kind === 'commit' || record.kind === 'not_applied') &&
      typeof record.canonicalId === 'string' &&
      byCanonicalId.has(record.canonicalId)
    ) {
      if (terminalStateByCanonicalId.get(record.canonicalId) !== 'pending') {
        throw new Error(
          `Rollback journal canonicalId ${record.canonicalId} has multiple terminal records`,
        );
      }
      terminalStateByCanonicalId.set(record.canonicalId, record.kind);
      if (record.kind === 'not_applied') {
        const change = byCanonicalId.get(record.canonicalId)!;
        change.journalState = 'not_applied';
      }
      continue;
    }
    throw new Error(`Rollback journal record ${index} is invalid`);
  }
  const report: Row = {
    version: 1,
    runId: header.runId,
    mode: 'apply',
    generatedAt: header.generatedAt,
    execution: header.execution,
    checksums: {
      legacy: { missionorders: '0'.repeat(64), missingorders: '0'.repeat(64) },
      canonical: {
        before: '0'.repeat(64),
        after: '0'.repeat(64),
        projected: '0'.repeat(64),
      },
    },
    rollback: { version: 1, runId: header.runId, changes },
  };
  report.rollback.manifestChecksum =
    buildMissingOrdersRollbackManifestChecksum(report);
  return report;
}

function objectId(value: string, field: string) {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`${field} must be a canonical Mongo ObjectId`);
  }
  return new Types.ObjectId(value);
}

function mongoDocument(document: Row, id?: string) {
  return {
    ...document,
    ...(id ? { _id: objectId(id, 'mission order _id') } : {}),
    user_id: objectId(String(document.user_id), 'user_id'),
    offer_id: objectId(String(document.offer_id), 'offer_id'),
  };
}

export function createMongooseMissingOrdersCliRuntime(): MissingOrdersCliRuntime {
  const db = () => {
    if (!mongoose.connection.db)
      throw new Error('Mongo connection is unavailable');
    return mongoose.connection.db;
  };

  return {
    connect: async (uri) => {
      await mongoose.connect(uri);
    },
    disconnect: async () => {
      await mongoose.disconnect();
    },
    readReportFile: async (path) => readFile(path),
    statReportFile: async (path) => stat(path),
    async createRollbackJournal(path, header) {
      const headerLine = Buffer.from(`${JSON.stringify(header)}\n`, 'utf8');
      if (headerLine.byteLength > MAX_ROLLBACK_ARTIFACT_BYTES) {
        throw new Error(
          'Rollback journal header exceeds the 50 MiB safety limit',
        );
      }
      try {
        const existing = await stat(path);
        if (existing.size > 0) {
          throw new Error('Rollback journal path must be a new empty file');
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      const handle = await open(path, 'wx', 0o600);
      try {
        await handle.writeFile(headerLine);
        await handle.sync();
      } catch (error) {
        await handle.close();
        throw error;
      }
      let closed = false;
      return {
        async append(change: MissingOrdersRollbackChange) {
          if (closed) throw new Error('Rollback journal is closed');
          const line = Buffer.from(
            `${JSON.stringify({ kind: 'change', change })}\n`,
            'utf8',
          );
          const beforeWrite = await handle.stat();
          if (
            beforeWrite.size + line.byteLength >
            MAX_ROLLBACK_ARTIFACT_BYTES
          ) {
            throw new Error('Rollback journal exceeds the 50 MiB safety limit');
          }
          await handle.writeFile(line);
          await handle.sync();
        },
        async commit(canonicalId: string) {
          if (closed) throw new Error('Rollback journal is closed');
          const line = Buffer.from(
            `${JSON.stringify({ kind: 'commit', canonicalId })}\n`,
            'utf8',
          );
          const beforeWrite = await handle.stat();
          if (
            beforeWrite.size + line.byteLength >
            MAX_ROLLBACK_ARTIFACT_BYTES
          ) {
            throw new Error('Rollback journal exceeds the 50 MiB safety limit');
          }
          await handle.writeFile(line);
          await handle.sync();
        },
        async markNotApplied(canonicalId: string) {
          if (closed) throw new Error('Rollback journal is closed');
          const line = Buffer.from(
            `${JSON.stringify({ kind: 'not_applied', canonicalId })}\n`,
            'utf8',
          );
          const beforeWrite = await handle.stat();
          if (
            beforeWrite.size + line.byteLength >
            MAX_ROLLBACK_ARTIFACT_BYTES
          ) {
            throw new Error('Rollback journal exceeds the 50 MiB safety limit');
          }
          await handle.writeFile(line);
          await handle.sync();
        },
        async close() {
          if (closed) return;
          closed = true;
          await handle.sync();
          await handle.close();
        },
      };
    },
    now: () => new Date(),
    createMigrationStore() {
      const missionorders = db().collection('missionorders');
      const missingorders = db().collection('missingorders');
      const offers = db().collection('offers');
      const users = db().collection('users');
      return {
        async readLegacy(collection: LegacyMissionOrderCollection) {
          return collection === 'missionorders'
            ? missionorders
                .find({ schema_version: { $ne: 2 } }, PRESERVE_BSON_SUBTYPES)
                .toArray()
            : missingorders.find({}, PRESERVE_BSON_SUBTYPES).toArray();
        },
        async readCanonical() {
          return missionorders
            .find({ schema_version: 2 }, PRESERVE_BSON_SUBTYPES)
            .toArray();
        },
        async resolveOffersByObjectId(id: string) {
          if (!Types.ObjectId.isValid(id)) return [];
          return offers
            .find({ _id: new Types.ObjectId(id) }, PRESERVE_BSON_SUBTYPES)
            .limit(2)
            .toArray();
        },
        async resolveOffersBySource(source: string, providerOfferId: number) {
          return offers
            .find({ source, offer_id: providerOfferId }, PRESERVE_BSON_SUBTYPES)
            .limit(2)
            .toArray();
        },
        async resolveUserById(id: string) {
          if (!Types.ObjectId.isValid(id)) return null;
          return users.findOne(
            { _id: new Types.ObjectId(id) },
            PRESERVE_BSON_SUBTYPES,
          );
        },
        async insertCanonical(document: Row) {
          const result = await missionorders.insertOne(mongoDocument(document));
          return result.insertedId;
        },
        async replaceCanonical(id: string, document: Row, preimage: Row) {
          const canonicalId = objectId(id, 'mission order _id');
          const result = await missionorders.replaceOne(
            buildMissingOrdersMigrationCasFilter(canonicalId, preimage),
            mongoDocument(document, id),
          );
          return result.matchedCount === 1;
        },
        buildCanonicalPostimage(id: string, document: Row) {
          return mongoDocument(document, id);
        },
      };
    },
    createRollbackStore() {
      const missionorders = db().collection('missionorders');
      return {
        async readCanonicalById(id: string) {
          return missionorders.findOne(
            {
              _id: objectId(id, 'mission order _id'),
            },
            PRESERVE_BSON_SUBTYPES,
          );
        },
        async deleteCanonical(id: string, preimage: Row) {
          const canonicalId = objectId(id, 'mission order _id');
          const result = await missionorders.deleteOne(
            buildMissingOrdersMigrationCasFilter(canonicalId, preimage),
          );
          return result.deletedCount === 1;
        },
        async restoreCanonical(id: string, document: Row, preimage: Row) {
          const canonicalId = objectId(id, 'mission order _id');
          const restoredId =
            document._id && typeof document._id.toHexString === 'function'
              ? document._id.toHexString()
              : String(document._id ?? '');
          if (restoredId !== id) {
            throw new Error('Rollback snapshot _id does not match canonicalId');
          }
          const result = await missionorders.replaceOne(
            buildMissingOrdersMigrationCasFilter(canonicalId, preimage),
            document,
          );
          return result.matchedCount === 1;
        },
      };
    },
    createSeedStore() {
      const missionorders = db().collection('missionorders');
      return {
        async upsertBySeedRecordKey(record: Row) {
          const result = await missionorders.updateOne(
            { seed_record_key: String(record.seed_record_key) },
            { $set: record },
            { upsert: true },
          );
          return { created: result.upsertedCount === 1 };
        },
        async deleteByExactMarker(filter: { seed_marker: string }) {
          const result = await missionorders.deleteMany(filter);
          return result.deletedCount;
        },
      };
    },
    async findSeedUser(id: string) {
      return db()
        .collection('users')
        .findOne({ _id: objectId(id, 'user-id') }, PRESERVE_BSON_SUBTYPES);
    },
    async findSeedOffer(id: string) {
      return db()
        .collection('offers')
        .findOne({ _id: objectId(id, 'offer-id') }, PRESERVE_BSON_SUBTYPES);
    },
  };
}

function summarizeSeedRecords(records: Row[] | undefined) {
  return (records ?? []).map((record) => ({
    seed_record_key: record.seed_record_key,
    order_id: record.order_id,
    status: record.status,
    note_count: Array.isArray(record.notes) ? record.notes.length : 0,
    evidence_ref_count: Array.isArray(record.evidence_refs)
      ? record.evidence_refs.length
      : 0,
  }));
}

export async function executeMissingOrdersCli(
  argv: string[],
  env: NodeJS.ProcessEnv,
  runtime: MissingOrdersCliRuntime = createMongooseMissingOrdersCliRuntime(),
): Promise<Row> {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { command: 'help', output: HELP };
  }

  const [operation, ...operationArgs] = argv;
  if (
    operation !== 'migrate' &&
    operation !== 'rollback' &&
    operation !== 'seed'
  ) {
    throw new Error('First argument must be migrate, rollback, or seed');
  }

  if (operation === 'migrate') {
    const command = parseMissingOrdersMigrationArgs(operationArgs);
    if (command.help) return { command: 'help', output: HELP };
    assertMissingOrdersMigrationAllowed(command, env);
    const mongoUri = env.MONGO_URI?.trim();
    if (!mongoUri) throw new Error('MONGO_URI is required');
    const databaseIdentity = command.apply
      ? requiredDatabaseIdentity(mongoUri)
      : databaseIdentityFromMongoUri(mongoUri);
    const now = runtime.now();
    const runId = command.runId ?? `missing-orders-${now.toISOString()}`;
    const execution = {
      target: command.target!,
      databaseIdentity,
    };
    const rollbackJournal = command.apply
      ? await runtime.createRollbackJournal(command.rollbackJournalPath!, {
          kind: 'missing-orders-reverse-cas-journal',
          version: 1,
          runId,
          generatedAt: now.toISOString(),
          execution,
        })
      : undefined;

    let result: Row | undefined;
    let operationError: unknown;
    let connected = false;
    try {
      await runtime.connect(mongoUri);
      connected = true;
      const report = await runMissingOrdersMigration(
        runtime.createMigrationStore(),
        {
          apply: command.apply,
          runId,
          now,
          execution,
          rollbackJournal,
        },
      );
      result = {
        ok: report.ok,
        command: operation,
        target: command.target,
        ...report,
      };
    } catch (error) {
      operationError = error;
    } finally {
      const teardownErrors: string[] = [];
      if (rollbackJournal) {
        try {
          await rollbackJournal.close();
        } catch (error) {
          teardownErrors.push(
            `rollback journal close failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      if (connected) {
        try {
          await runtime.disconnect();
        } catch (error) {
          teardownErrors.push(
            `disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      if (result && teardownErrors.length > 0) {
        result.ok = false;
        result.operationalErrors = teardownErrors;
      } else if (!operationError && teardownErrors.length > 0) {
        operationError = new Error(teardownErrors.join('; '));
      }
    }
    if (operationError) throw operationError;
    return result!;
  }

  if (operation === 'rollback') {
    const command = parseMissingOrdersRollbackArgs(operationArgs);
    if (command.help) return { command: 'help', output: HELP };
    assertMissingOrdersRollbackAllowed(command, env);
    const authorityPath = command.reportPath ?? command.journalPath!;
    const expectedAuthoritySha256 =
      command.reportSha256 ?? command.journalSha256!;
    const reportStat = await runtime.statReportFile(authorityPath);
    if (reportStat.size > MAX_ROLLBACK_ARTIFACT_BYTES) {
      throw new Error('Rollback report exceeds the 50 MiB safety limit');
    }
    const reportBytes = await runtime.readReportFile(authorityPath);
    if (reportBytes.byteLength > MAX_ROLLBACK_ARTIFACT_BYTES) {
      throw new Error('Rollback report exceeds the 50 MiB safety limit');
    }
    const observedReportSha256 = createHash('sha256')
      .update(reportBytes)
      .digest('hex');
    if (observedReportSha256 !== expectedAuthoritySha256) {
      throw new Error(
        `Rollback authority SHA-256 mismatch: expected ${expectedAuthoritySha256}, observed ${observedReportSha256}`,
      );
    }
    let applyReport: unknown;
    try {
      applyReport = command.journalPath
        ? reportFromRollbackJournal(reportBytes)
        : JSON.parse(reportBytes.toString('utf8'));
    } catch (error) {
      throw new Error(
        `Rollback authority is not valid: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const mongoUri = env.MONGO_URI?.trim();
    if (!mongoUri) throw new Error('MONGO_URI is required');
    const databaseIdentity = requiredDatabaseIdentity(mongoUri);
    assertRollbackAuthorityTarget(
      applyReport,
      command.target,
      databaseIdentity,
    );
    assertMissingOrdersRollbackReport(applyReport);

    await runtime.connect(mongoUri);
    try {
      const report = await runMissingOrdersRollback(
        runtime.createRollbackStore(),
        applyReport,
        { apply: command.apply, now: runtime.now() },
      );
      return {
        command: operation,
        target: command.target,
        sourceAuthoritySha256: observedReportSha256,
        sourceAuthority: command.journalPath ? 'journal' : 'report',
        ...report,
      };
    } finally {
      await runtime.disconnect();
    }
  }

  const command = parseMissingOrdersSeedArgs(operationArgs);
  if (command.help) return { command: 'help', output: HELP };
  assertMissingOrdersSeedCommandAllowed(command, env);
  const mongoUri = env.MONGO_URI?.trim();
  if (!mongoUri) throw new Error('MONGO_URI is required');

  await runtime.connect(mongoUri);
  try {
    let user: Row | undefined;
    let offer: Row | undefined;
    if (command.mode !== 'cleanup') {
      user = (await runtime.findSeedUser(command.userId!)) ?? undefined;
      offer = (await runtime.findSeedOffer(command.offerId!)) ?? undefined;
      if (!user) throw new Error(`Canonical User ${command.userId} not found`);
      if (!offer)
        throw new Error(`Canonical Offer ${command.offerId} not found`);
    }

    const result = await runMissingOrdersSeed(runtime.createSeedStore(), {
      mode: command.mode,
      marker: command.marker!,
      user,
      offer,
      now: runtime.now(),
    });
    const records = 'records' in result ? result.records : undefined;
    return {
      ok: true,
      command: operation,
      target: command.target,
      marker: command.marker,
      ...result,
      records: summarizeSeedRecords(records),
      cleanupFilter:
        command.mode === 'cleanup'
          ? buildMissingOrdersSeedCleanupFilter(command.marker!)
          : undefined,
      financialWrites: 0,
    };
  } finally {
    await runtime.disconnect();
  }
}

export async function runMissingOrdersCliProcess(
  argv = process.argv.slice(2),
  env = process.env,
) {
  const result = await executeMissingOrdersCli(argv, env);
  if (result.command === 'help') {
    console.log(result.output);
    return;
  }
  process.stdout.write(serializeMissingOrdersCliOutput(result));
  if (result.ok === false) process.exitCode = 1;
}

export function serializeMissingOrdersCliOutput(result: Row): Buffer {
  const output = Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (
    (result.command === 'migrate' || result.command === 'rollback') &&
    output.byteLength > MAX_MISSING_ORDERS_CLI_OUTPUT_BYTES
  ) {
    throw new Error(`${result.command} stdout exceeds the 50 MiB safety limit`);
  }
  return output;
}

if (require.main === module) {
  void runMissingOrdersCliProcess().catch((error) => {
    console.error(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
