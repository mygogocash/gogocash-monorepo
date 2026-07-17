import { createHash } from 'node:crypto';
import { BSON } from 'mongodb';
import {
  buildMissionOrderCustomerSnapshot,
  buildMissionOrderDedupeKey,
} from '../../offer/mission-order.contract';

export { buildMissionOrderDedupeKey } from '../../offer/mission-order.contract';

/**
 * Pure migration policy for consolidating both historical missing-order shapes
 * into schema-version 2 documents in the canonical `missionorders` collection.
 * Database and CLI concerns deliberately live behind this small adapter.
 */
const MISSING_ORDERS_MIGRATION_VERSION = 1;
export const MISSING_ORDERS_UNSAFE_PREIMAGE_ERROR_CODE =
  'unsafe_missing_orders_preimage';

export type LegacyMissionOrderCollection = 'missionorders' | 'missingorders';

type Row = Record<string, any>;

export interface MissingOrdersMigrationStore {
  readLegacy(collection: LegacyMissionOrderCollection): Promise<Row[]>;
  readCanonical(): Promise<Row[]>;
  resolveOffersByObjectId(id: string): Promise<Row[]>;
  resolveOffersBySource(
    source: string,
    providerOfferId: number,
  ): Promise<Row[]>;
  resolveUserById(id: string): Promise<Row | null>;
  insertCanonical(document: Row): Promise<unknown>;
  replaceCanonical(id: string, document: Row, preimage: Row): Promise<boolean>;
  buildCanonicalPostimage?(id: string, document: Row): Row;
}

export interface MissingOrdersRollbackStore {
  readCanonicalById(id: string): Promise<Row | null>;
  deleteCanonical(id: string, preimage: Row): Promise<boolean>;
  restoreCanonical(id: string, document: Row, preimage: Row): Promise<boolean>;
}

export type MissingOrdersRollbackChange = {
  operation: 'delete_inserted' | 'restore_replaced';
  canonicalId: string;
  provenance: {
    legacyCollection: string;
    legacyId: string;
  };
  afterDocumentEjson: string;
  afterChecksum: string;
  beforeDocumentEjson?: string;
  beforeChecksum?: string;
  /** Present when a journaled compare-and-swap intent never reached Mongo. */
  journalState?: 'not_applied';
};

/**
 * A durable journal is written before a mutation can become visible.  Its
 * records are deliberately the same complete reverse-CAS snapshots carried by
 * the final report, so an interrupted stdout redirect never strands a write.
 */
export interface MissingOrdersRollbackJournal {
  append(change: MissingOrdersRollbackChange): Promise<void>;
  /** fsynced only after the corresponding Mongo mutation succeeds. */
  commit?(canonicalId: string): Promise<void>;
  /** fsynced after a CAS miss proves the prior intent was not applied. */
  markNotApplied?(canonicalId: string): Promise<void>;
  close(): Promise<void>;
}

export const MAX_MISSING_ORDERS_REPORT_BYTES = 50 * 1024 * 1024;

function assertGeneratedReportWithinLimit(report: unknown): void {
  if (
    Buffer.byteLength(JSON.stringify(report), 'utf8') >
    MAX_MISSING_ORDERS_REPORT_BYTES
  ) {
    throw new Error(
      'Generated migration report exceeds the 50 MiB safety limit',
    );
  }
}

type MigrationCount = {
  inserted: number;
  updated: number;
  skipped: number;
  quarantined: number;
  errors: number;
};

type MappingSuccess = {
  ok: true;
  document: Row;
  sourceUpdatedAt: Date;
};

type MappingFailure = {
  ok: false;
  kind: 'quarantine' | 'malformed';
  reason: string;
};

type OfferResolution = MappingFailure | { ok: true; offer: Row };

export type LegacyMissionOrderMapping = MappingSuccess | MappingFailure;

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (
    value &&
    typeof value === 'object' &&
    'toHexString' in value &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  ) {
    return (value as { toHexString(): string }).toHexString();
  }

  if (value && typeof value === 'object' && '_bsontype' in value) {
    const bsonType = String((value as { _bsontype: unknown })._bsontype);
    if (bsonType === 'Int32' || bsonType === 'Double') {
      return Number(value);
    }
    if (bsonType === 'Long') {
      return { $numberLong: String(value) };
    }
    if (bsonType === 'Decimal128') {
      return { $numberDecimal: String(value) };
    }
    return stableValue(BSON.EJSON.serialize(value, { relaxed: false }));
  }

  if (Array.isArray(value)) return value.map(stableValue);

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        if (record[key] !== undefined) result[key] = stableValue(record[key]);
        return result;
      }, {});
  }

  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' && !Number.isFinite(value))
    return String(value);
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function checksum(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function checksumRows(rows: Row[]): string {
  return checksum(rows.map(stableJson).sort());
}

function bsonDocumentChecksum(document: Row): string {
  return checksum(BSON.EJSON.serialize(document, { relaxed: false }));
}

function encodeRollbackDocument(document: Row): string {
  return BSON.EJSON.stringify(document, { relaxed: false });
}

function decodeRollbackDocument(value: string, label: string): Row {
  try {
    const document = BSON.EJSON.parse(value, { relaxed: false });
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new Error('snapshot is not a document');
    }
    return document as Row;
  } catch (error) {
    throw new Error(
      `${label} is not valid canonical Extended JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function rollbackChange(input: {
  operation: MissingOrdersRollbackChange['operation'];
  canonicalId: string;
  provenance: MissingOrdersRollbackChange['provenance'];
  afterDocument: Row;
  beforeDocument?: Row;
}): MissingOrdersRollbackChange {
  const change: MissingOrdersRollbackChange = {
    operation: input.operation,
    canonicalId: input.canonicalId,
    provenance: input.provenance,
    afterDocumentEjson: encodeRollbackDocument(input.afterDocument),
    afterChecksum: bsonDocumentChecksum(input.afterDocument),
  };
  if (input.beforeDocument) {
    change.beforeDocumentEjson = encodeRollbackDocument(input.beforeDocument);
    change.beforeChecksum = bsonDocumentChecksum(input.beforeDocument);
  }
  return change;
}

async function recordJournaledCasMiss(
  journal: MissingOrdersRollbackJournal | undefined,
  change: MissingOrdersRollbackChange,
): Promise<MissingOrdersRollbackChange> {
  await journal?.markNotApplied?.(change.canonicalId);
  return { ...change, journalState: 'not_applied' };
}

async function recordJournalCommit(
  journal: MissingOrdersRollbackJournal | undefined,
  canonicalId: string,
): Promise<void> {
  await journal?.commit?.(canonicalId);
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
  if (value && typeof value === 'object' && '_id' in value) {
    return idString((value as Row)._id);
  }
  return value == null ? '' : String(value).trim();
}

function validDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStatus(
  value: unknown,
): 'pending' | 'under_review' | 'approved' | 'rejected' {
  if (value === 'investigating') return 'under_review';
  if (
    value === 'pending' ||
    value === 'under_review' ||
    value === 'approved' ||
    value === 'rejected'
  ) {
    return value;
  }
  return 'pending';
}

function normalizedStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry) => entry != null).map(String)
    : [];
}

function normalizeNotes(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((note) => note && typeof note === 'object')
    .map((note: Row) => {
      const normalized: Row = {
        admin_id: idString(note.admin_id ?? note.adminId),
        admin_name: String(note.admin_name ?? note.adminName ?? ''),
        text: String(note.text ?? note.note ?? ''),
      };
      const createdAt = validDate(note.created_at ?? note.createdAt);
      if (createdAt) normalized.created_at = createdAt;
      return normalized;
    });
}

function migrationChecksum(document: Row): string {
  const content = { ...document };
  delete content._id;
  delete content.migration_checksum;
  // The execution timestamp must not turn a rerun into a data change.
  delete content.migrated_at;
  return checksum(content);
}

function provenanceKey(collection: string, legacyId: string): string {
  return `${collection}\u0000${legacyId}`;
}

function documentProvenance(document: Row) {
  return {
    legacyCollection: String(document.legacy_collection ?? ''),
    legacyId: String(document.legacy_id ?? ''),
  };
}

function countTemplate(): MigrationCount {
  return {
    inserted: 0,
    updated: 0,
    skipped: 0,
    quarantined: 0,
    errors: 0,
  };
}

function unsafePreimageDetail(error: unknown): string | null {
  if (
    !error ||
    typeof error !== 'object' ||
    !('code' in error) ||
    error.code !== MISSING_ORDERS_UNSAFE_PREIMAGE_ERROR_CODE
  ) {
    return null;
  }
  return error instanceof Error ? error.message : String(error);
}

function isObjectIdReference(value: unknown): boolean {
  if (
    value &&
    typeof value === 'object' &&
    'toHexString' in value &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  ) {
    return true;
  }
  return /^[a-f\d]{24}$/i.test(idString(value));
}

function mappingFailure(
  kind: MappingFailure['kind'],
  reason: string,
): MappingFailure {
  return { ok: false, kind, reason };
}

async function resolveOffer(
  row: Row,
  store: MissingOrdersMigrationStore,
): Promise<OfferResolution> {
  const rawOfferId = row.offer_id ?? row.offerId ?? row.merchant_id;

  if (rawOfferId == null || rawOfferId === '') {
    return mappingFailure('malformed', 'missing offer_id');
  }

  let matches: Row[];
  if (isObjectIdReference(rawOfferId)) {
    matches = await store.resolveOffersByObjectId(idString(rawOfferId));
  } else {
    const providerOfferId = finiteNumber(rawOfferId);
    if (providerOfferId == null) {
      return mappingFailure('malformed', 'invalid offer_id');
    }

    const rawSource = row.source ?? row.offer_source;
    if (rawSource == null || rawSource === '') {
      return mappingFailure('quarantine', 'missing_offer_source');
    }
    if (typeof rawSource !== 'string') {
      return mappingFailure('quarantine', 'ambiguous_offer_source');
    }

    const source = rawSource.trim();
    if (!source) {
      return mappingFailure('quarantine', 'missing_offer_source');
    }
    matches = await store.resolveOffersBySource(source, providerOfferId);
  }

  if (matches.length === 0) {
    return mappingFailure('quarantine', 'offer_not_found');
  }
  if (matches.length !== 1) {
    return mappingFailure('quarantine', 'multiple_offer_matches');
  }
  return { ok: true, offer: matches[0] };
}

/**
 * The business identity is intentionally independent of collection and legacy
 * document id, so aliases of the same claim cannot create two canonical rows.
 */
export async function mapLegacyMissionOrder(
  input: { collection: LegacyMissionOrderCollection; row: Row },
  store: MissingOrdersMigrationStore,
  options: { migratedAt: Date },
): Promise<LegacyMissionOrderMapping> {
  const { collection, row } = input;
  const legacyId = idString(row._id);
  const userId = idString(row.user_id ?? row.userId);
  const orderId = idString(row.order_id ?? row.orderId);
  const amountValue = row.order_amount ?? row.amount;
  const amount = finiteNumber(amountValue);
  const problems: string[] = [];

  if (!legacyId) problems.push('missing legacy _id');
  if (!userId) problems.push('missing user_id');
  if (!orderId) problems.push('missing order_id');
  if (amount == null) problems.push('invalid order_amount');
  if (problems.length > 0) {
    return mappingFailure('malformed', problems.join('; '));
  }

  const rawPurchaseDate =
    row.purchase_date ?? row.purchaseDate ?? row.order_date ?? row.orderDate;
  const purchaseDate = validDate(rawPurchaseDate);
  if (rawPurchaseDate != null && rawPurchaseDate !== '' && !purchaseDate) {
    return mappingFailure('malformed', 'invalid purchase_date');
  }

  const [user, resolvedOffer] = await Promise.all([
    store.resolveUserById(userId),
    resolveOffer(row, store),
  ]);

  if (!user) return mappingFailure('malformed', `user_id ${userId} not found`);
  if (resolvedOffer.ok === false) return resolvedOffer;

  const offer = resolvedOffer.offer;
  const offerId = idString(offer._id);
  const providerOfferId = finiteNumber(
    offer.offer_id ?? offer.provider_offer_id ?? row.offer_id,
  );
  const offerSource = String(offer.source ?? row.source ?? '').trim();
  if (!offerId || providerOfferId == null || !offerSource) {
    return mappingFailure(
      'malformed',
      'resolved offer is missing canonical fields',
    );
  }

  const sourceUpdatedAt =
    validDate(row.updatedAt ?? row.updated_at) ??
    validDate(row.createdAt ?? row.created_at) ??
    new Date(0);
  const createdAt = validDate(row.createdAt ?? row.created_at);
  const resolvedAt = validDate(row.resolved_at ?? row.resolvedAt);

  const document: Row = {
    user_id: userId,
    offer_id: offerId,
    customer_snapshot: buildMissionOrderCustomerSnapshot(user),
    offer_snapshot: {
      source: offerSource,
      provider_offer_id: providerOfferId,
      name: String(offer.offer_name ?? offer.name ?? row.offer_name ?? ''),
    },
    order_id: orderId,
    order_amount: amount,
    currency: String(row.currency ?? 'THB'),
    remarks: String(row.remarks ?? row.note ?? ''),
    evidence_refs: normalizedStringArray(row.evidence_refs ?? row.attachments),
    notes: normalizeNotes(row.notes),
    assigned_to: row.assigned_to ?? row.assignedTo ?? null,
    resolution_note: row.resolution_note ?? row.resolutionNote ?? null,
    rejection_reason: row.rejection_reason ?? row.rejectionReason ?? null,
    resolved_at: resolvedAt,
    status: normalizeStatus(row.status),
    schema_version: 2,
    legacy_collection: collection,
    legacy_id: legacyId,
    dedupe_key: buildMissionOrderDedupeKey(userId, offerId, orderId),
    source_updated_at: sourceUpdatedAt,
    migrated_at: new Date(options.migratedAt.getTime()),
  };

  if (purchaseDate) document.purchase_date = purchaseDate;
  if (createdAt) document.createdAt = createdAt;
  document.updatedAt = sourceUpdatedAt;
  document.migration_checksum = migrationChecksum(document);

  return { ok: true, document, sourceUpdatedAt };
}

function sourceDate(document: Row): Date | null {
  return (
    validDate(document.source_updated_at) ??
    validDate(document.updatedAt ?? document.updated_at) ??
    validDate(document.createdAt ?? document.created_at)
  );
}

function canonicalWasUnchanged(document: Row): boolean {
  const updatedAt = validDate(document.updatedAt ?? document.updated_at);
  const migratedAt = validDate(document.migrated_at);
  return (
    !updatedAt || (!!migratedAt && updatedAt.getTime() <= migratedAt.getTime())
  );
}

function sameMigrationContent(existing: Row, incoming: Row): boolean {
  if (
    typeof existing.migration_checksum === 'string' &&
    existing.migration_checksum === incoming.migration_checksum
  ) {
    return true;
  }
  return migrationChecksum(existing) === incoming.migration_checksum;
}

function newerThanCanonical(sourceUpdatedAt: Date, canonical: Row): boolean {
  const canonicalSourceDate = sourceDate(canonical);
  return !canonicalSourceDate || sourceUpdatedAt > canonicalSourceDate;
}

function rowId(row: Row): string {
  return idString(row._id);
}

function migrationPostimage(
  store: MissingOrdersMigrationStore,
  canonicalId: string,
  document: Row,
): Row {
  return store.buildCanonicalPostimage
    ? store.buildCanonicalPostimage(canonicalId, document)
    : { ...document, _id: document._id ?? canonicalId };
}

export function buildMissingOrdersRollbackManifestChecksum(report: Row) {
  const changes = Array.isArray(report.rollback?.changes)
    ? report.rollback.changes.map((change: Row) => ({
        operation: change.operation,
        canonicalId: change.canonicalId,
        provenance: change.provenance,
        afterDocumentEjson: change.afterDocumentEjson,
        afterChecksum: change.afterChecksum,
        beforeDocumentEjson: change.beforeDocumentEjson,
        beforeChecksum: change.beforeChecksum,
        journalState: change.journalState,
      }))
    : report.rollback?.changes;
  return checksum({
    migrationVersion: report.version,
    runId: report.runId,
    mode: report.mode,
    generatedAt: report.generatedAt,
    sourceCounts: report.sourceCounts,
    canonicalCounts: report.canonicalCounts,
    checksums: report.checksums,
    execution: report.execution,
    changes,
  });
}

export async function runMissingOrdersMigration(
  store: MissingOrdersMigrationStore,
  options: {
    apply?: boolean;
    now?: Date;
    runId?: string;
    rollbackJournal?: MissingOrdersRollbackJournal;
    execution?: {
      target: 'development' | 'staging';
      databaseIdentity?: string;
    };
  } = {},
) {
  const apply = options.apply === true;
  const now = options.now ? new Date(options.now.getTime()) : new Date();
  const runId = options.runId ?? `missing-orders-${now.toISOString()}`;

  const [missionorders, missingorders, canonicalBeforeRaw] = await Promise.all([
    store.readLegacy('missionorders'),
    store.readLegacy('missingorders'),
    store.readCanonical(),
  ]);
  const canonicalBefore = canonicalBeforeRaw.map((row) => ({ ...row }));
  const canonicalState = canonicalBefore.map((row) => ({ ...row }));
  const planned = countTemplate();
  const applied = countTemplate();
  const quarantine: Row[] = [];
  const malformed: Row[] = [];
  const conflicts: Row[] = [];
  const rollbackChanges: MissingOrdersRollbackChange[] = [];
  let collectedReportEvidenceBytes = 0;
  const reserveReportEvidence = (value: unknown): void => {
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (
      collectedReportEvidenceBytes + bytes >
      MAX_MISSING_ORDERS_REPORT_BYTES - 1024 * 1024
    ) {
      throw new Error(
        'Generated migration report exceeds the 50 MiB safety limit',
      );
    }
    collectedReportEvidenceBytes += bytes;
  };
  const collectReportEvidence = <T>(collection: T[], value: T): T => {
    reserveReportEvidence(value);
    collection.push(value);
    return value;
  };

  const legacyEntries = [
    ...missionorders.map((row, index) => ({
      collection: 'missionorders' as const,
      row,
      index,
    })),
    ...missingorders.map((row, index) => ({
      collection: 'missingorders' as const,
      row,
      index: missionorders.length + index,
    })),
  ];

  const mappedEntries = await Promise.all(
    legacyEntries.map(async (entry) => ({
      ...entry,
      mapped: await mapLegacyMissionOrder(entry, store, { migratedAt: now }),
    })),
  );

  const candidates: Array<
    (typeof mappedEntries)[number] & { mapped: MappingSuccess }
  > = [];

  for (const entry of mappedEntries) {
    if (entry.mapped.ok === true) {
      candidates.push(
        entry as (typeof mappedEntries)[number] & { mapped: MappingSuccess },
      );
      continue;
    }

    const failure = entry.mapped as MappingFailure;
    const summary = {
      legacyCollection: entry.collection,
      legacyId: idString(entry.row._id),
      reason: failure.reason,
    };
    if (failure.kind === 'quarantine') {
      planned.quarantined += 1;
      if (apply) applied.quarantined += 1;
      collectReportEvidence(quarantine, summary);
    } else {
      planned.errors += 1;
      if (apply) applied.errors += 1;
      collectReportEvidence(malformed, summary);
    }
  }

  // Newest source wins when two legacy aliases compete, with stable tie-breakers.
  candidates.sort((left, right) => {
    const dateDifference =
      right.mapped.sourceUpdatedAt.getTime() -
      left.mapped.sourceUpdatedAt.getTime();
    if (dateDifference !== 0) return dateDifference;
    const collectionDifference = left.collection.localeCompare(
      right.collection,
    );
    if (collectionDifference !== 0) return collectionDifference;
    const idDifference = idString(left.row._id).localeCompare(
      idString(right.row._id),
    );
    return idDifference || left.index - right.index;
  });

  const seenProvenance = new Set<string>();
  const claimedLegacyDedupe = new Map<string, Row>();

  let abortedAfterCasConflict: Row | undefined;
  for (const entry of candidates) {
    const { document, sourceUpdatedAt } = entry.mapped;
    const provenance = documentProvenance(document);
    const provenanceIdentity = provenanceKey(
      provenance.legacyCollection,
      provenance.legacyId,
    );

    if (seenProvenance.has(provenanceIdentity)) {
      const conflict = { ...provenance, reason: 'provenance_collision' };
      collectReportEvidence(conflicts, conflict);
      collectReportEvidence(quarantine, conflict);
      planned.quarantined += 1;
      if (apply) applied.quarantined += 1;
      continue;
    }
    seenProvenance.add(provenanceIdentity);

    // Sorting establishes the winner before any database write. Reserve that
    // identity now so a failed write cannot let an older alias take its place.
    const priorDedupeWinner = claimedLegacyDedupe.get(document.dedupe_key);
    if (priorDedupeWinner) {
      planned.skipped += 1;
      if (apply) applied.skipped += 1;
      collectReportEvidence(conflicts, {
        ...provenance,
        reason: 'legacy_dedupe_conflict',
        winnerLegacyCollection: priorDedupeWinner.legacyCollection,
        winnerLegacyId: priorDedupeWinner.legacyId,
      });
      continue;
    }
    claimedLegacyDedupe.set(document.dedupe_key, provenance);

    const byProvenance = canonicalState.find(
      (canonical) =>
        String(canonical.legacy_collection ?? '') ===
          provenance.legacyCollection &&
        String(canonical.legacy_id ?? '') === provenance.legacyId,
    );
    const byDedupe = canonicalState.find(
      (canonical) => canonical.dedupe_key === document.dedupe_key,
    );

    if (byProvenance) {
      if (sameMigrationContent(byProvenance, document)) {
        planned.skipped += 1;
        if (apply) applied.skipped += 1;
        continue;
      }

      if (byDedupe && byDedupe !== byProvenance) {
        planned.skipped += 1;
        if (apply) applied.skipped += 1;
        collectReportEvidence(conflicts, {
          ...provenance,
          reason: 'canonical_dedupe_conflict',
          canonicalId: rowId(byDedupe),
        });
        continue;
      }

      if (
        !newerThanCanonical(sourceUpdatedAt, byProvenance) ||
        !canonicalWasUnchanged(byProvenance)
      ) {
        planned.skipped += 1;
        if (apply) applied.skipped += 1;
        collectReportEvidence(conflicts, {
          ...provenance,
          reason: 'canonical_newer_or_modified',
          canonicalId: rowId(byProvenance),
        });
        continue;
      }

      planned.updated += 1;
      if (apply) {
        try {
          const canonicalId = rowId(byProvenance);
          const rollbackEntry = rollbackChange({
            operation: 'restore_replaced',
            canonicalId,
            provenance,
            beforeDocument: byProvenance,
            afterDocument: migrationPostimage(store, canonicalId, document),
          });
          reserveReportEvidence(rollbackEntry);
          await options.rollbackJournal?.append(rollbackEntry);
          const replaced = await store.replaceCanonical(
            canonicalId,
            document,
            byProvenance,
          );
          if (!replaced) {
            const conflict = {
              ...provenance,
              reason: 'concurrent_write_conflict',
              canonicalId,
            };
            abortedAfterCasConflict = conflict;
            applied.skipped += 1;
            collectReportEvidence(conflicts, conflict);
            try {
              rollbackChanges.push(
                await recordJournaledCasMiss(
                  options.rollbackJournal,
                  rollbackEntry,
                ),
              );
            } catch (error) {
              applied.errors += 1;
              collectReportEvidence(malformed, {
                ...provenance,
                canonicalId,
                reason: `journal not_applied finalization failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              });
            }
            break;
          }
          await recordJournalCommit(options.rollbackJournal, canonicalId);
          applied.updated += 1;
          rollbackChanges.push(rollbackEntry);
        } catch (error) {
          const unsafePreimage = unsafePreimageDetail(error);
          if (unsafePreimage) {
            planned.updated -= 1;
            planned.quarantined += 1;
            applied.quarantined += 1;
            collectReportEvidence(quarantine, {
              ...provenance,
              reason: 'unsafe_preimage',
              detail: unsafePreimage,
            });
            continue;
          }
          applied.errors += 1;
          collectReportEvidence(malformed, {
            ...provenance,
            reason: `replace failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
          continue;
        }
      }

      const canonicalIndex = canonicalState.indexOf(byProvenance);
      canonicalState[canonicalIndex] = {
        ...document,
        _id: byProvenance._id,
      };
      continue;
    }

    if (byDedupe) {
      planned.skipped += 1;
      if (apply) applied.skipped += 1;
      collectReportEvidence(conflicts, {
        ...provenance,
        reason: 'canonical_dedupe_conflict',
        canonicalId: rowId(byDedupe),
      });
      continue;
    }

    // Legacy customer claims already live in the target collection. Replace
    // that document at its existing _id; inserting would collide with itself.
    if (entry.collection === 'missionorders') {
      const canonicalId = rowId(entry.row);
      planned.updated += 1;
      if (apply) {
        try {
          const rollbackEntry = rollbackChange({
            operation: 'restore_replaced',
            canonicalId,
            provenance,
            beforeDocument: entry.row,
            afterDocument: migrationPostimage(store, canonicalId, document),
          });
          reserveReportEvidence(rollbackEntry);
          await options.rollbackJournal?.append(rollbackEntry);
          const replaced = await store.replaceCanonical(
            canonicalId,
            document,
            entry.row,
          );
          if (!replaced) {
            const conflict = {
              ...provenance,
              reason: 'concurrent_write_conflict',
              canonicalId,
            };
            abortedAfterCasConflict = conflict;
            applied.skipped += 1;
            collectReportEvidence(conflicts, conflict);
            try {
              rollbackChanges.push(
                await recordJournaledCasMiss(
                  options.rollbackJournal,
                  rollbackEntry,
                ),
              );
            } catch (error) {
              applied.errors += 1;
              collectReportEvidence(malformed, {
                ...provenance,
                canonicalId,
                reason: `journal not_applied finalization failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              });
            }
            break;
          }
          await recordJournalCommit(options.rollbackJournal, canonicalId);
          applied.updated += 1;
          rollbackChanges.push(rollbackEntry);
        } catch (error) {
          const unsafePreimage = unsafePreimageDetail(error);
          if (unsafePreimage) {
            planned.updated -= 1;
            planned.quarantined += 1;
            applied.quarantined += 1;
            collectReportEvidence(quarantine, {
              ...provenance,
              reason: 'unsafe_preimage',
              detail: unsafePreimage,
            });
            continue;
          }
          applied.errors += 1;
          collectReportEvidence(malformed, {
            ...provenance,
            reason: `replace failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
          continue;
        }
      }
      canonicalState.push({ ...document, _id: canonicalId });
      continue;
    }

    planned.inserted += 1;
    const preallocatedCanonicalId = new BSON.ObjectId();
    let canonicalId = `dry-run:${provenance.legacyCollection}:${provenance.legacyId}`;
    if (apply) {
      try {
        const documentWithId = { ...document, _id: preallocatedCanonicalId };
        canonicalId = idString(preallocatedCanonicalId);
        const rollbackEntry = rollbackChange({
          operation: 'delete_inserted',
          canonicalId,
          provenance,
          afterDocument: migrationPostimage(store, canonicalId, documentWithId),
        });
        reserveReportEvidence(rollbackEntry);
        await options.rollbackJournal?.append(rollbackEntry);
        const insertedId = idString(
          await store.insertCanonical(documentWithId),
        );
        if (insertedId !== canonicalId) {
          throw new Error(
            `insert did not preserve preallocated canonical _id ${canonicalId}`,
          );
        }
        await recordJournalCommit(options.rollbackJournal, canonicalId);
        applied.inserted += 1;
        rollbackChanges.push(rollbackEntry);
      } catch (error) {
        applied.errors += 1;
        collectReportEvidence(malformed, {
          ...provenance,
          reason: `insert failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        continue;
      }
    }
    canonicalState.push({ ...document, _id: canonicalId });
  }

  let canonicalAfter = canonicalBefore;
  if (apply) {
    try {
      canonicalAfter = (await store.readCanonical()).map((row) => ({ ...row }));
    } catch (error) {
      // Writes already have fsynced reverse-CAS entries. Return a usable report
      // instead of throwing it away solely because the verification read failed.
      applied.errors += 1;
      collectReportEvidence(malformed, {
        reason: `final canonical read failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      canonicalAfter = canonicalState.map((row) => ({ ...row }));
    }
  }

  const report = {
    version: MISSING_ORDERS_MIGRATION_VERSION,
    runId,
    mode: apply ? 'apply' : 'dry-run',
    generatedAt: now,
    execution: options.execution,
    sourceCounts: {
      missionorders: missionorders.length,
      missingorders: missingorders.length,
      total: missionorders.length + missingorders.length,
    },
    canonicalCounts: {
      before: canonicalBefore.length,
      after: canonicalAfter.length,
      projectedAfter: canonicalState.length,
    },
    planned,
    applied,
    checksums: {
      legacy: {
        missionorders: checksumRows(missionorders),
        missingorders: checksumRows(missingorders),
      },
      canonical: {
        before: checksumRows(canonicalBefore),
        after: checksumRows(canonicalAfter),
        projected: checksumRows(canonicalState),
      },
    },
    backup: {
      runId,
      createdAt: now,
      collections: [
        {
          name: 'missionorders',
          count: missionorders.length,
          checksum: checksumRows(missionorders),
        },
        {
          name: 'missingorders',
          count: missingorders.length,
          checksum: checksumRows(missingorders),
        },
      ],
      canonical: {
        count: canonicalBefore.length,
        checksum: checksumRows(canonicalBefore),
      },
    },
    quarantine,
    malformed,
    conflicts,
    rollback: {
      version: 1,
      runId,
      changes: rollbackChanges,
    },
  };

  const completedReport = {
    ...report,
    rollback: {
      ...report.rollback,
      manifestChecksum: buildMissingOrdersRollbackManifestChecksum(report),
    },
    ok:
      report.applied.errors === 0 &&
      !report.conflicts.some(
        (conflict) => conflict.reason === 'concurrent_write_conflict',
      ),
  };
  if (abortedAfterCasConflict) {
    (completedReport as Row).aborted = {
      reason: 'concurrent_write_conflict',
      conflict: abortedAfterCasConflict,
    };
  }
  assertGeneratedReportWithinLimit(completedReport);
  return completedReport;
}

type ValidatedRollbackChange = {
  change: MissingOrdersRollbackChange;
  afterDocument: Row;
  beforeDocument?: Row;
};

function requiredRecord(value: unknown, label: string): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Row;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredChecksum(value: unknown, label: string): string {
  const candidate = requiredString(value, label);
  if (!/^[a-f0-9]{64}$/.test(candidate)) {
    throw new Error(`${label} must be a lowercase SHA-256 checksum`);
  }
  return candidate;
}

function validateMissingOrdersApplyReport(input: unknown): {
  report: Row;
  changes: ValidatedRollbackChange[];
} {
  const report = requiredRecord(input, 'apply report');
  if (report.version !== MISSING_ORDERS_MIGRATION_VERSION) {
    throw new Error(
      `apply report migration version must be ${MISSING_ORDERS_MIGRATION_VERSION}`,
    );
  }
  if (report.mode !== 'apply') {
    throw new Error('rollback requires an apply-mode migration report');
  }
  const runId = requiredString(report.runId, 'apply report runId');
  if (!validDate(report.generatedAt)) {
    throw new Error('apply report generatedAt must be a valid date');
  }

  const checksums = requiredRecord(report.checksums, 'apply report checksums');
  const legacy = requiredRecord(checksums.legacy, 'legacy checksums');
  const canonical = requiredRecord(checksums.canonical, 'canonical checksums');
  requiredChecksum(legacy.missionorders, 'legacy missionorders checksum');
  requiredChecksum(legacy.missingorders, 'legacy missingorders checksum');
  requiredChecksum(canonical.before, 'canonical before checksum');
  requiredChecksum(canonical.after, 'canonical after checksum');
  requiredChecksum(canonical.projected, 'canonical projected checksum');

  const rollback = requiredRecord(report.rollback, 'rollback manifest');
  if (rollback.version !== 1) {
    throw new Error('rollback manifest version must be 1');
  }
  if (requiredString(rollback.runId, 'rollback runId') !== runId) {
    throw new Error('rollback runId does not match the apply report runId');
  }
  const manifestChecksum = requiredChecksum(
    rollback.manifestChecksum,
    'rollback manifest checksum',
  );
  const expectedManifestChecksum =
    buildMissingOrdersRollbackManifestChecksum(report);
  if (manifestChecksum !== expectedManifestChecksum) {
    throw new Error(
      `rollback manifest checksum mismatch: expected ${expectedManifestChecksum}`,
    );
  }
  if (!Array.isArray(rollback.changes)) {
    throw new Error('rollback changes must be an array');
  }

  const seenCanonicalIds = new Set<string>();
  const changes = rollback.changes.map(
    (rawChange: unknown, index: number): ValidatedRollbackChange => {
      const label = `rollback changes[${index}]`;
      const change = requiredRecord(rawChange, label);
      if (
        change.operation !== 'delete_inserted' &&
        change.operation !== 'restore_replaced'
      ) {
        throw new Error(`${label}.operation is unsupported`);
      }
      if (
        change.journalState !== undefined &&
        change.journalState !== 'not_applied'
      ) {
        throw new Error(`${label}.journalState is unsupported`);
      }
      const canonicalId = requiredString(
        change.canonicalId,
        `${label}.canonicalId`,
      );
      if (seenCanonicalIds.has(canonicalId)) {
        throw new Error(`rollback has duplicate canonicalId ${canonicalId}`);
      }
      seenCanonicalIds.add(canonicalId);

      const provenance = requiredRecord(
        change.provenance,
        `${label}.provenance`,
      );
      const legacyCollection = requiredString(
        provenance.legacyCollection,
        `${label}.provenance.legacyCollection`,
      );
      const legacyId = requiredString(
        provenance.legacyId,
        `${label}.provenance.legacyId`,
      );
      if (
        legacyCollection !== 'missionorders' &&
        legacyCollection !== 'missingorders'
      ) {
        throw new Error(`${label} has an unsupported legacy collection`);
      }

      const afterDocumentEjson = requiredString(
        change.afterDocumentEjson,
        `${label}.afterDocumentEjson`,
      );
      const afterDocument = decodeRollbackDocument(
        afterDocumentEjson,
        `${label}.afterDocumentEjson`,
      );
      const afterChecksum = requiredChecksum(
        change.afterChecksum,
        `${label}.afterChecksum`,
      );
      if (bsonDocumentChecksum(afterDocument) !== afterChecksum) {
        throw new Error(`${label}.afterChecksum does not match its snapshot`);
      }
      if (idString(afterDocument._id) !== canonicalId) {
        throw new Error(
          `${label} after snapshot _id does not match canonicalId`,
        );
      }
      if (
        String(afterDocument.legacy_collection ?? '') !== legacyCollection ||
        String(afterDocument.legacy_id ?? '') !== legacyId
      ) {
        throw new Error(`${label} after snapshot provenance does not match`);
      }

      let beforeDocument: Row | undefined;
      if (change.operation === 'restore_replaced') {
        const beforeDocumentEjson = requiredString(
          change.beforeDocumentEjson,
          `${label}.beforeDocumentEjson`,
        );
        beforeDocument = decodeRollbackDocument(
          beforeDocumentEjson,
          `${label}.beforeDocumentEjson`,
        );
        const beforeChecksum = requiredChecksum(
          change.beforeChecksum,
          `${label}.beforeChecksum`,
        );
        if (bsonDocumentChecksum(beforeDocument) !== beforeChecksum) {
          throw new Error(
            `${label}.beforeChecksum does not match its snapshot`,
          );
        }
        if (idString(beforeDocument._id) !== canonicalId) {
          throw new Error(
            `${label} before snapshot _id does not match canonicalId`,
          );
        }
      } else if (
        change.beforeDocumentEjson !== undefined ||
        change.beforeChecksum !== undefined
      ) {
        throw new Error(`${label} delete operation must not have a preimage`);
      }

      return {
        change: change as MissingOrdersRollbackChange,
        afterDocument,
        beforeDocument,
      };
    },
  );

  return { report, changes };
}

export function assertMissingOrdersRollbackReport(input: unknown): void {
  validateMissingOrdersApplyReport(input);
}

export async function runMissingOrdersRollback(
  store: MissingOrdersRollbackStore,
  applyReport: unknown,
  options: { apply?: boolean; now?: Date } = {},
) {
  const validated = validateMissingOrdersApplyReport(applyReport);
  const apply = options.apply === true;
  const planned = { deleted: 0, restored: 0 };
  const applied = { deleted: 0, restored: 0 };
  const skipped = {
    alreadyReverted: 0,
    concurrentModified: 0,
    concurrentWriteConflict: 0,
  };
  const errors: Row[] = [];
  const changes: Row[] = [];

  for (const entry of validated.changes) {
    const { change, beforeDocument } = entry;
    if (change.journalState === 'not_applied') {
      skipped.alreadyReverted += 1;
      changes.push({
        ...change.provenance,
        canonicalId: change.canonicalId,
        outcome: 'journaled_not_applied',
      });
      continue;
    }
    let current: Row | null;
    try {
      current = await store.readCanonicalById(change.canonicalId);
    } catch (error) {
      errors.push({
        canonicalId: change.canonicalId,
        operation: change.operation,
        reason: 'read_failed',
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (!current) {
      if (change.operation === 'delete_inserted') {
        skipped.alreadyReverted += 1;
        changes.push({
          ...change.provenance,
          canonicalId: change.canonicalId,
          outcome: 'already_reverted',
        });
      } else {
        skipped.concurrentModified += 1;
        changes.push({
          ...change.provenance,
          canonicalId: change.canonicalId,
          outcome: 'missing_replaced_row',
        });
      }
      continue;
    }

    const currentChecksum = bsonDocumentChecksum(current);
    if (
      change.operation === 'restore_replaced' &&
      currentChecksum === change.beforeChecksum
    ) {
      skipped.alreadyReverted += 1;
      changes.push({
        ...change.provenance,
        canonicalId: change.canonicalId,
        outcome: 'already_reverted',
      });
      continue;
    }
    if (currentChecksum !== change.afterChecksum) {
      skipped.concurrentModified += 1;
      changes.push({
        ...change.provenance,
        canonicalId: change.canonicalId,
        outcome: 'concurrent_modified',
        expectedAfterChecksum: change.afterChecksum,
        observedChecksum: currentChecksum,
      });
      continue;
    }

    if (change.operation === 'delete_inserted') planned.deleted += 1;
    else planned.restored += 1;
    if (!apply) {
      changes.push({
        ...change.provenance,
        canonicalId: change.canonicalId,
        outcome:
          change.operation === 'delete_inserted'
            ? 'would_delete'
            : 'would_restore',
      });
      continue;
    }

    try {
      const changed =
        change.operation === 'delete_inserted'
          ? await store.deleteCanonical(change.canonicalId, current)
          : await store.restoreCanonical(
              change.canonicalId,
              beforeDocument!,
              current,
            );
      if (!changed) {
        skipped.concurrentWriteConflict += 1;
        changes.push({
          ...change.provenance,
          canonicalId: change.canonicalId,
          outcome: 'concurrent_write_conflict',
        });
        break;
      }
      if (change.operation === 'delete_inserted') applied.deleted += 1;
      else applied.restored += 1;
      changes.push({
        ...change.provenance,
        canonicalId: change.canonicalId,
        outcome:
          change.operation === 'delete_inserted' ? 'deleted' : 'restored',
      });
    } catch (error) {
      errors.push({
        canonicalId: change.canonicalId,
        operation: change.operation,
        reason: 'write_failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    version: 1,
    mode: apply ? 'apply' : 'dry-run',
    generatedAt: options.now ?? new Date(),
    sourceRunId: validated.report.runId,
    sourceManifestChecksum: validated.report.rollback.manifestChecksum,
    sourceChecksums: validated.report.checksums,
    planned,
    applied,
    skipped,
    errors,
    changes,
    ok:
      errors.length === 0 &&
      skipped.concurrentModified === 0 &&
      skipped.concurrentWriteConflict === 0,
  };
}
