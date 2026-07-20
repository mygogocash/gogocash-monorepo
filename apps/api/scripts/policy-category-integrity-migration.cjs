'use strict';

const { createHash, randomUUID } = require('node:crypto');
const {
  closeSync,
  constants: fsConstants,
  fstatSync,
  openSync,
  readSync,
} = require('node:fs');

const STATE_KEY = 'category-integrity';
const MIGRATION_VERSION = 2;
const WRITER_DRAIN_EVIDENCE_MAX_BYTES = 64 * 1024;
const WRITER_DRAIN_EVIDENCE_MAX_AGE_MS = 30 * 60 * 1000;

function normalize(value) {
  if (typeof value !== 'string') return null;
  const display = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!display) return null;
  return { display, normalized: display.toLocaleLowerCase('en-US') };
}

function normalizePolicyMediaUrl(value) {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  return url || null;
}

function policyMediaUrlHash(value) {
  const url = normalizePolicyMediaUrl(value);
  if (!url) throw new Error('A policy media URL is required.');
  return createHash('sha256').update(url).digest('hex');
}

function commandOwnedMediaAsset(value) {
  if (!value || typeof value !== 'object') return null;
  const url = normalizePolicyMediaUrl(value.url);
  if (
    value.provider !== 'r2' ||
    value.ownership !== 'command-owned' ||
    typeof value.owner_key !== 'string' ||
    !value.owner_key ||
    typeof value.owner_attempt_token !== 'string' ||
    !value.owner_attempt_token ||
    !url ||
    typeof value.bucket !== 'string' ||
    !value.bucket ||
    typeof value.object_key !== 'string' ||
    !value.object_key ||
    typeof value.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.sha256) ||
    typeof value.original_name !== 'string' ||
    !value.original_name
  ) {
    return null;
  }
  return {
    url_hash: policyMediaUrlHash(url),
    url,
    state: 'active',
    revision: 1,
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: value.owner_key,
    owner_attempt_token: value.owner_attempt_token,
    bucket: value.bucket,
    object_key: value.object_key,
    content_sha256: value.sha256,
    original_name: value.original_name,
    ...(typeof value.content_type === 'string' && value.content_type
      ? { content_type: value.content_type }
      : {}),
  };
}

function registryAssetIdentity(value) {
  if (!value || typeof value !== 'object') return null;
  const url = normalizePolicyMediaUrl(value.url);
  if (
    value.provider !== 'r2' ||
    value.ownership !== 'command-owned' ||
    typeof value.owner_key !== 'string' ||
    !value.owner_key ||
    typeof value.owner_attempt_token !== 'string' ||
    !value.owner_attempt_token ||
    !url ||
    typeof value.bucket !== 'string' ||
    !value.bucket ||
    typeof value.object_key !== 'string' ||
    !value.object_key ||
    typeof value.content_sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.content_sha256) ||
    typeof value.original_name !== 'string' ||
    !value.original_name
  ) {
    return null;
  }
  return {
    url_hash: policyMediaUrlHash(url),
    url,
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: value.owner_key,
    owner_attempt_token: value.owner_attempt_token,
    bucket: value.bucket,
    object_key: value.object_key,
    content_sha256: value.content_sha256,
    original_name: value.original_name,
    ...(typeof value.content_type === 'string' && value.content_type
      ? { content_type: value.content_type }
      : {}),
  };
}

function sameRegistryIdentity(left, right) {
  return [
    'url_hash',
    'url',
    'provider',
    'ownership',
    'owner_key',
    'owner_attempt_token',
    'bucket',
    'object_key',
    'content_sha256',
    'original_name',
    'content_type',
  ].every((field) => left?.[field] === right?.[field]);
}

function commandProofCandidate(asset, source, command, plan, context) {
  const plannedIdentity = commandOwnedMediaAsset(plan.asset);
  if (!plannedIdentity || !sameRegistryIdentity(plannedIdentity, asset)) {
    return null;
  }
  const commandId = id(command._id);
  if (source === 'media-write') {
    const expectedOwnerKey = `${command.request_key}:${context.role}`;
    const validOperation =
      context.owner_type === 'category'
        ? command.operation === 'category-update'
        : ['offer-create', 'offer-update'].includes(command.operation);
    return {
      source,
      command_id: commandId,
      committed: command.status === 'committed',
      valid:
        plan.role === context.role &&
        plan.upload_state === 'confirmed' &&
        command.owner_type === context.owner_type &&
        canonicalReferenceId(command.owner_id) ===
          canonicalReferenceId(context.owner_id) &&
        validOperation &&
        typeof command.request_key === 'string' &&
        command.request_key.length > 0 &&
        asset.owner_key === expectedOwnerKey &&
        command.attempt_token === asset.owner_attempt_token,
    };
  }
  return {
    source,
    command_id: commandId,
    committed: command.status === 'committed',
    valid:
      context.owner_type === 'category' &&
      context.field === 'banner_asset' &&
      command.operation === 'aggregate-save' &&
      plan.upload_state === 'confirmed' &&
      canonicalReferenceId(command.category_id) ===
        canonicalReferenceId(context.owner_id) &&
      typeof command.request_key === 'string' &&
      command.request_key.length > 0 &&
      asset.owner_key === command.request_key &&
      command.attempt_token === asset.owner_attempt_token,
  };
}

function durableCommandProof(snapshot, context, asset) {
  const candidates = [];
  for (const command of snapshot.mediaWriteCommands ?? []) {
    for (const plan of command.planned_assets ?? []) {
      const candidate = commandProofCandidate(
        asset,
        'media-write',
        command,
        plan,
        context,
      );
      if (candidate) candidates.push(candidate);
    }
  }
  for (const command of snapshot.lifecycleCommands ?? []) {
    if (!command.planned_asset) continue;
    const candidate = commandProofCandidate(
      asset,
      'lifecycle',
      command,
      {
        asset: command.planned_asset,
        upload_state: command.upload_state,
      },
      context,
    );
    if (candidate) candidates.push(candidate);
  }
  if (candidates.length === 0) {
    return { kind: 'missing-committed-media-command-proof' };
  }
  if (candidates.length > 1) {
    return {
      kind: 'ambiguous-media-command-proof',
      command_ids: candidates.map((candidate) => candidate.command_id).sort(),
    };
  }
  const candidate = candidates[0];
  if (!candidate.committed) {
    return {
      kind: 'uncommitted-media-command-proof',
      command_id: candidate.command_id,
    };
  }
  if (!candidate.valid) {
    return {
      kind: 'invalid-media-command-proof',
      command_id: candidate.command_id,
    };
  }
  return { kind: 'proven', command: candidate };
}

function id(value) {
  return value == null ? '' : String(value);
}

function canonicalReferenceId(value) {
  const reference = id(value).trim();
  return /^[a-f0-9]{24}$/i.test(reference)
    ? reference.toLowerCase()
    : reference;
}

function indexKeyEquals(candidate, expected) {
  return JSON.stringify(candidate?.key ?? {}) === JSON.stringify(expected);
}

function describeMongoTarget(mongoUri) {
  let parsed;
  try {
    parsed = new URL(mongoUri);
  } catch {
    throw new Error('MONGO_URI is invalid');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('MONGO_URI must use mongodb:// or mongodb+srv://');
  }
  const host = parsed.host.toLowerCase();
  const database = decodeURIComponent(
    parsed.pathname.replace(/^\//, ''),
  ).trim();
  const fingerprint = createHash('sha256')
    .update(`${host}/${database || '<implicit-test>'}`)
    .digest('hex')
    .slice(0, 16);
  return {
    host,
    database,
    fingerprint,
    sanitized: `${parsed.protocol}//${host}/${database || '<implicit-test>'}`,
  };
}

function loadWriterDrainEvidence(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error(
      'Apply requires POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_FILE.',
    );
  }
  const path = filePath.trim();
  let descriptor;
  try {
    descriptor = openSync(
      path,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    );
  } catch {
    throw new Error(
      'Writer-drain evidence must be an accessible non-symlink regular file.',
    );
  }
  let raw;
  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size > WRITER_DRAIN_EVIDENCE_MAX_BYTES) {
      throw new Error(
        `Writer-drain evidence must be a regular file no larger than ${WRITER_DRAIN_EVIDENCE_MAX_BYTES} bytes.`,
      );
    }
    const buffer = Buffer.alloc(WRITER_DRAIN_EVIDENCE_MAX_BYTES + 1);
    let offset = 0;
    while (offset < buffer.byteLength) {
      const bytesRead = readSync(
        descriptor,
        buffer,
        offset,
        buffer.byteLength - offset,
        null,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > WRITER_DRAIN_EVIDENCE_MAX_BYTES) {
      throw new Error(
        `Writer-drain evidence must be no larger than ${WRITER_DRAIN_EVIDENCE_MAX_BYTES} bytes.`,
      );
    }
    raw = buffer.subarray(0, offset);
  } finally {
    closeSync(descriptor);
  }
  let evidence;
  try {
    evidence = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new Error('Writer-drain evidence must be valid JSON.');
  }
  return {
    evidence,
    sha256: createHash('sha256').update(raw).digest('hex'),
  };
}

/**
 * Reviewed production Atlas target for #407 / policy integrity rollout.
 * Fingerprint = sha256(`${host}/${database}`).slice(0, 16) from describeMongoTarget.
 * Do not broaden this without a fresh dry-run review.
 */
const REVIEWED_PRODUCTION_ATLAS_FINGERPRINT = 'f3a5dff559dda931';

function looksLikeProductionMongoTarget(target) {
  return (
    /(?:^|[-_.])(prod|production)(?:[-_.]|$)/i.test(target.host) ||
    /^(?:gogocash[-_]?prod(?:uction)?|prod(?:uction)?)$/i.test(
      target.database,
    ) ||
    target.fingerprint === REVIEWED_PRODUCTION_ATLAS_FINGERPRINT
  );
}

function assertPolicyCategoryIntegrityApplyGate(
  target,
  env = process.env,
  writerDrainEvidence,
  writerDrainEvidenceSha256,
) {
  const environment = env.POLICY_CATEGORY_INTEGRITY_ENVIRONMENT;
  const confirmation = env.POLICY_CATEGORY_INTEGRITY_CONFIRM;
  const targetFingerprint = env.POLICY_CATEGORY_INTEGRITY_TARGET_FINGERPRINT;
  const candidateSha = env.POLICY_CATEGORY_INTEGRITY_CANDIDATE_SHA;
  const writerDrain = env.POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM;
  const expectedEvidenceSha256 =
    env.POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_SHA256;
  const productionAuthorize =
    env.POLICY_CATEGORY_INTEGRITY_PRODUCTION_AUTHORIZE;

  if (!target.database) {
    throw new Error(
      'Apply refuses an implicit MongoDB database; add the exact database path to MONGO_URI.',
    );
  }
  // Accidental prod hits stay refused unless the operator opts into the
  // production environment + reviewed Atlas fingerprint + authorize sentinel.
  if (looksLikeProductionMongoTarget(target) && environment !== 'production') {
    throw new Error(
      'Policy category integrity apply refuses a production target.',
    );
  }
  if (!/^[a-f0-9]{40}$/.test(candidateSha ?? '')) {
    throw new Error(
      'Apply requires an exact lowercase 40-character candidate SHA.',
    );
  }
  if (environment === 'production') {
    if (target.fingerprint !== REVIEWED_PRODUCTION_ATLAS_FINGERPRINT) {
      throw new Error(
        'Production apply requires the reviewed Atlas target fingerprint (gogocash Atlas /gogocash).',
      );
    }
    if (
      productionAuthorize !==
      `authorize-production-integrity-v2:${candidateSha}:${target.fingerprint}`
    ) {
      throw new Error(
        'Production apply requires POLICY_CATEGORY_INTEGRITY_PRODUCTION_AUTHORIZE bound to candidate SHA and target fingerprint.',
      );
    }
  }
  if (
    !/^[a-f0-9]{64}$/.test(writerDrainEvidenceSha256 ?? '') ||
    expectedEvidenceSha256 !== writerDrainEvidenceSha256 ||
    writerDrain !==
      `drained-all-writers:${environment}:${candidateSha}:${target.fingerprint}:${writerDrainEvidenceSha256}`
  ) {
    throw new Error(
      'Apply requires writer-drain evidence and confirmation bound to environment, candidate SHA, target fingerprint, and evidence SHA-256.',
    );
  }
  if (
    !writerDrainEvidence ||
    typeof writerDrainEvidence !== 'object' ||
    writerDrainEvidence.schema !== 'gogocash-policy-writer-drain-v1' ||
    writerDrainEvidence.environment !== environment ||
    writerDrainEvidence.candidate_sha !== candidateSha ||
    writerDrainEvidence.target_fingerprint !== target.fingerprint ||
    writerDrainEvidence.ingress !== 'blocked' ||
    writerDrainEvidence.background_jobs !== 'stopped'
  ) {
    throw new Error(
      'Writer-drain evidence does not match the environment, candidate, target, blocked ingress, and stopped background-job contract.',
    );
  }
  if (writerDrainEvidence.inflight_requests !== 0) {
    throw new Error('Writer-drain evidence must prove zero in-flight requests.');
  }
  const recordedAt = Date.parse(writerDrainEvidence.recorded_at);
  const evidenceAge = Date.now() - recordedAt;
  if (
    !Number.isFinite(recordedAt) ||
    evidenceAge < -60_000 ||
    evidenceAge > WRITER_DRAIN_EVIDENCE_MAX_AGE_MS
  ) {
    throw new Error(
      'Writer-drain evidence must have a current recorded_at timestamp from the maintenance window.',
    );
  }
  if (
    !Array.isArray(writerDrainEvidence.writer_deployments) ||
    writerDrainEvidence.writer_deployments.length === 0 ||
    writerDrainEvidence.writer_deployments.some(
      (deployment) =>
        !deployment ||
        typeof deployment.service !== 'string' ||
        !deployment.service.trim() ||
        !/^[a-f0-9]{40}$/.test(deployment.deployment_sha ?? '') ||
        deployment.replicas !== 0 ||
        deployment.state !== 'stopped',
    )
  ) {
    throw new Error(
      'Writer-drain evidence must enumerate only stopped writer deployments with zero replicas and exact SHAs.',
    );
  }
  if (
    env.POLICY_CATEGORY_INTEGRITY_APPLY !== '1' ||
    !['dev', 'staging', 'production'].includes(environment) ||
    targetFingerprint !== target.fingerprint ||
    confirmation !==
      `apply-category-integrity-v2:${environment}:${candidateSha}:${target.database}:${target.fingerprint}`
  ) {
    throw new Error(
      'Apply requires the explicit environment gate plus exact candidate SHA, database target fingerprint, and confirmation sentinel.',
    );
  }
}

async function inventory(db) {
  const categoriesCollection = db.collection('categories');
  const offersCollection = db.collection('offers');
  const sourcesCollection = db.collection('policy_category_sources');
  const registryCollection = db.collection('policy_media_asset_registry');
  const lifecycleCommandsCollection = db.collection(
    'policy_lifecycle_commands',
  );
  const mediaWriteCommandsCollection = db.collection(
    'policy_media_write_commands',
  );
  const [
    categories,
    offers,
    sources,
    registry,
    lifecycleCommands,
    mediaWriteCommands,
    sourceIndexes,
  ] = await Promise.all([
    categoriesCollection.find({}).toArray(),
    offersCollection.find({}).toArray(),
    sourcesCollection.find({}).toArray(),
    registryCollection.find({}).toArray(),
    lifecycleCommandsCollection.find({}).toArray(),
    mediaWriteCommandsCollection.find({}).toArray(),
    listIndexesOrEmpty(sourcesCollection),
  ]);
  return {
    categories,
    offers,
    sources,
    registry,
    lifecycleCommands,
    mediaWriteCommands,
    sourceIndexes,
  };
}

async function listIndexesOrEmpty(collection) {
  try {
    return await collection.indexes();
  } catch (error) {
    if (error?.code === 26 || error?.codeName === 'NamespaceNotFound') {
      return [];
    }
    throw error;
  }
}

function planMigration(snapshot) {
  const quarantine = [];
  const mediaWriteRequestKeys = new Map();
  for (const command of snapshot.mediaWriteCommands ?? []) {
    const requestKey =
      typeof command.request_key === 'string' ? command.request_key.trim() : '';
    if (!/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,255}$/.test(requestKey)) {
      quarantine.push({
        kind: 'invalid-media-write-request-key',
        command_id: id(command._id),
      });
      continue;
    }
    const existing = mediaWriteRequestKeys.get(requestKey);
    if (existing) {
      quarantine.push({
        kind: 'duplicate-media-write-request-key',
        request_key: requestKey,
        command_ids: [id(existing._id), id(command._id)].sort(),
      });
      continue;
    }
    mediaWriteRequestKeys.set(requestKey, command);
  }
  const categoryById = new Map();
  const categoryByNormalized = new Map();
  const categoryBackfills = [];
  const categoryBackfillById = new Map();
  const queueCategoryBackfill = (categoryId, set) => {
    const key = id(categoryId);
    const existing = categoryBackfillById.get(key);
    if (existing) {
      Object.assign(existing.set, set);
      return;
    }
    const backfill = { category_id: categoryId, set: { ...set } };
    categoryBackfillById.set(key, backfill);
    categoryBackfills.push(backfill);
  };
  const existingRegistryByHash = new Map();
  for (const row of snapshot.registry ?? []) {
    const identity = registryAssetIdentity(row);
    const validState = ['active', 'deleting', 'deleted'].includes(row.state);
    const validRevision = Number.isInteger(row.revision) && row.revision >= 1;
    const validHash = identity && row.url_hash === identity.url_hash;
    if (!identity || !validState || !validRevision || !validHash) {
      quarantine.push({
        kind: 'invalid-media-registry-row',
        registry_id: id(row._id),
      });
      continue;
    }
    const duplicate = existingRegistryByHash.get(identity.url_hash);
    if (duplicate) {
      quarantine.push({
        kind: 'duplicate-media-registry-hash',
        url_hash: identity.url_hash,
        registry_ids: [id(duplicate.row._id), id(row._id)].sort(),
      });
      continue;
    }
    existingRegistryByHash.set(identity.url_hash, { row, identity });
  }

  const desiredRegistryByHash = new Map();
  let structuredMediaAssetsScanned = 0;
  let structuredMediaAssetsProven = 0;
  const structuredOwner = (context) => ({
    owner_type: context.owner_type,
    owner_id: id(context.owner_id),
    ...(context.owner_type === 'category'
      ? { category_id: id(context.owner_id) }
      : { offer_id: id(context.owner_id) }),
    field: context.field,
  });
  const registerStructuredAsset = (rawAsset, context) => {
    if (!rawAsset || typeof rawAsset !== 'object') return null;
    const claimsCommandOwnership =
      rawAsset.provider === 'r2' || rawAsset.ownership === 'command-owned';
    if (!claimsCommandOwnership) return null;
    structuredMediaAssetsScanned += 1;
    const asset = commandOwnedMediaAsset(rawAsset);
    if (!asset) {
      quarantine.push({
        kind: 'invalid-command-owned-media-asset',
        ...structuredOwner(context),
      });
      return null;
    }
    const proof = durableCommandProof(snapshot, context, asset);
    if (proof.kind !== 'proven') {
      quarantine.push({
        ...proof,
        ...structuredOwner(context),
      });
      return null;
    }
    const current = desiredRegistryByHash.get(asset.url_hash);
    if (current && !sameRegistryIdentity(current, asset)) {
      quarantine.push({
        kind: 'conflicting-command-owned-media-identity',
        url_hash: asset.url_hash,
        ...structuredOwner(context),
      });
      return null;
    }
    const existing = existingRegistryByHash.get(asset.url_hash);
    if (existing && !sameRegistryIdentity(existing.identity, asset)) {
      quarantine.push({
        kind: 'media-registry-identity-mismatch',
        registry_id: id(existing.row._id),
        ...structuredOwner(context),
      });
      return null;
    }
    if (existing && existing.row.state !== 'active') {
      quarantine.push({
        kind: 'referenced-media-registry-not-active',
        registry_id: id(existing.row._id),
        state: existing.row.state,
        ...structuredOwner(context),
      });
      return null;
    }
    desiredRegistryByHash.set(asset.url_hash, asset);
    structuredMediaAssetsProven += 1;
    return asset;
  };

  for (const category of snapshot.categories) {
    const identity = normalize(category.name);
    if (!identity) {
      quarantine.push({
        kind: 'invalid-category-name',
        category_id: id(category._id),
      });
      continue;
    }
    const duplicate = categoryByNormalized.get(identity.normalized);
    if (duplicate && id(duplicate._id) !== id(category._id)) {
      quarantine.push({
        kind: 'duplicate-category-identity',
        normalized: identity.normalized,
        category_ids: [id(duplicate._id), id(category._id)].sort(),
      });
      continue;
    }
    categoryById.set(canonicalReferenceId(category._id), {
      category,
      identity,
    });
    categoryByNormalized.set(identity.normalized, category);

    for (const [assetField, referenceField] of [
      ['image_asset', 'image'],
      ['banner_asset', 'banner'],
    ]) {
      const rawAsset = category[assetField];
      const asset = commandOwnedMediaAsset(rawAsset);
      const claimsCommandOwnership =
        rawAsset &&
        typeof rawAsset === 'object' &&
        (rawAsset.provider === 'r2' || rawAsset.ownership === 'command-owned');
      if (!claimsCommandOwnership) continue;
      const referenceUrl = normalizePolicyMediaUrl(category[referenceField]);
      if (!asset) {
        registerStructuredAsset(rawAsset, {
          owner_type: 'category',
          owner_id: category._id,
          field: assetField,
          role: assetField === 'image_asset' ? 'image' : 'banner',
        });
        continue;
      }
      registerStructuredAsset(rawAsset, {
        owner_type: 'category',
        owner_id: category._id,
        field: assetField,
        role: assetField === 'image_asset' ? 'image' : 'banner',
      });
      if (referenceUrl !== asset.url) {
        quarantine.push({
          kind: 'command-owned-media-url-mismatch',
          category_id: id(category._id),
          field: assetField,
          structured_url: asset.url,
          reference_url: referenceUrl,
        });
        continue;
      }
      const canonicalUrlSet = {};
      if (category[referenceField] !== asset.url) {
        canonicalUrlSet[referenceField] = asset.url;
      }
      if (rawAsset.url !== asset.url) {
        canonicalUrlSet[`${assetField}.url`] = asset.url;
      }
      if (Object.keys(canonicalUrlSet).length > 0) {
        queueCategoryBackfill(category._id, canonicalUrlSet);
      }
    }
    if (
      category.name_normalized !== identity.normalized ||
      !['active', 'retired', 'purging'].includes(category.lifecycle_status) ||
      !Number.isInteger(category.revision) ||
      category.revision < 1
    ) {
      queueCategoryBackfill(category._id, {
        name_normalized: identity.normalized,
        lifecycle_status: ['active', 'retired', 'purging'].includes(
          category.lifecycle_status,
        )
          ? category.lifecycle_status
          : 'active',
        revision:
          Number.isInteger(category.revision) && category.revision >= 1
            ? category.revision
            : 1,
      });
    }
  }

  const sourceIdentity = new Map();
  const aliasIdentity = new Map();
  const sourceBackfills = [];
  for (const source of snapshot.sources) {
    if (!['policy-admin', 'involve', 'legacy'].includes(source.source)) {
      quarantine.push({
        kind: 'invalid-source-type',
        source_id: id(source._id),
        source: source.source,
      });
      continue;
    }
    const identity = normalize(source.source_key);
    if (!identity) {
      quarantine.push({
        kind: 'invalid-source-key',
        source_id: id(source._id),
      });
      continue;
    }
    const mappedCategory = categoryById.get(
      canonicalReferenceId(source.category_id),
    )?.category;
    const mappedCategoryInactive =
      mappedCategory &&
      ['retired', 'purging'].includes(mappedCategory.lifecycle_status);
    const tombstoned =
      source.tombstoned === true ||
      source.active === false ||
      mappedCategoryInactive;
    const canonical = {
      ...source,
      source_key: identity.normalized,
      active: !tombstoned,
      tombstoned,
      revision:
        Number.isInteger(source.revision) && source.revision >= 1
          ? source.revision
          : 1,
      request_key:
        typeof source.request_key === 'string' && source.request_key.trim()
          ? source.request_key
          : `category-integrity-v2:existing:${id(source._id)}`,
    };
    const key = `${source.source}:${canonical.source_key}`;
    if (sourceIdentity.has(key)) {
      quarantine.push({ kind: 'duplicate-source-identity', source_key: key });
    } else {
      sourceIdentity.set(key, canonical);
    }
    const existingAlias = aliasIdentity.get(canonical.source_key);
    if (
      existingAlias &&
      id(existingAlias.category_id) !== id(canonical.category_id)
    ) {
      quarantine.push({
        kind: 'cross-source-category-mismatch',
        source_key: canonical.source_key,
        category_ids: [
          id(existingAlias.category_id),
          id(canonical.category_id),
        ].sort(),
      });
    } else if (!existingAlias || canonical.tombstoned) {
      aliasIdentity.set(canonical.source_key, canonical);
    }
    if (
      !categoryById.has(canonicalReferenceId(source.category_id)) &&
      !canonical.tombstoned
    ) {
      quarantine.push({
        kind: 'orphan-source-alias',
        source: source.source,
        source_key: canonical.source_key,
        category_id: id(source.category_id),
      });
    }
    const set = {};
    for (const field of [
      'source_key',
      'active',
      'tombstoned',
      'revision',
      'request_key',
    ]) {
      if (source[field] !== canonical[field]) set[field] = canonical[field];
    }
    if (Object.keys(set).length > 0) {
      sourceBackfills.push({ source_id: source._id, set });
    }
  }

  for (const { category, identity } of categoryById.values()) {
    const reserved = aliasIdentity.get(identity.normalized);
    const categoryIsActive = !['retired', 'purging'].includes(
      category.lifecycle_status,
    );
    if (reserved?.tombstoned && categoryIsActive) {
      quarantine.push({
        kind: 'active-category-identity-tombstoned',
        source_key: identity.normalized,
        category_id: id(category._id),
      });
    } else if (reserved && id(reserved.category_id) !== id(category._id)) {
      quarantine.push({
        kind: 'category-identity-reserved-by-another-source',
        source_key: identity.normalized,
        category_id: id(category._id),
        reserved_category_id: id(reserved.category_id),
      });
    }
  }

  const offerBackfills = [];
  const offerBackfillById = new Map();
  const queueOfferBackfill = (offerId, set) => {
    const key = id(offerId);
    const existing = offerBackfillById.get(key);
    if (existing) {
      Object.assign(existing.set, set);
      return;
    }
    const backfill = { offer_id: offerId, set: { ...set } };
    offerBackfillById.set(key, backfill);
    offerBackfills.push(backfill);
  };
  const involveAliases = new Map();
  for (const offer of snapshot.offers) {
    const set = {};
    for (const [assetField, role] of [
      ['logo_asset', 'logo'],
      ['banner_asset', 'banner'],
    ]) {
      const rawAsset = offer[assetField];
      const asset = registerStructuredAsset(rawAsset, {
        owner_type: 'offer',
        owner_id: offer._id,
        field: assetField,
        role,
      });
      if (asset && rawAsset.url !== asset.url) {
        set[`${assetField}.url`] = asset.url;
      }
    }
    const rawIdentity = normalize(offer.categories);
    let categoriesNormalized = rawIdentity?.normalized ?? null;
    if (rawIdentity) {
      const retainedAlias = aliasIdentity.get(rawIdentity.normalized);
      const category = retainedAlias
        ? categoryById.get(canonicalReferenceId(retainedAlias.category_id))
            ?.category
        : categoryByNormalized.get(rawIdentity.normalized);
      if (!category) {
        if (
          !retainedAlias?.tombstoned &&
          offer.categories_normalized !== null
        ) {
          quarantine.push({
            kind: 'offer-category-without-category',
            offer_id: id(offer._id),
            normalized: rawIdentity.normalized,
          });
        }
        categoriesNormalized = null;
      } else if (
        retainedAlias?.tombstoned ||
        retainedAlias?.active === false ||
        ['retired', 'purging'].includes(category.lifecycle_status)
      ) {
        categoriesNormalized = null;
      } else {
        const existingAlias = sourceIdentity.get(
          `involve:${rawIdentity.normalized}`,
        );
        if (
          existingAlias &&
          id(existingAlias.category_id) !== id(category._id)
        ) {
          quarantine.push({
            kind: 'source-category-mismatch',
            source: 'involve',
            source_key: rawIdentity.normalized,
            category_id: id(existingAlias.category_id),
            expected_category_id: id(category._id),
          });
          categoriesNormalized = null;
        } else if (
          existingAlias?.tombstoned ||
          existingAlias?.active === false
        ) {
          categoriesNormalized = null;
        } else {
          involveAliases.set(rawIdentity.normalized, category);
        }
      }
    }

    const originalPolicyCategoryId = offer.policy_category_id;
    const policyCategoryId = canonicalReferenceId(originalPolicyCategoryId);
    const isDirectPolicyCategory =
      policyCategoryId && policyCategoryId !== 'custom';
    const policyCategory = isDirectPolicyCategory
      ? categoryById.get(policyCategoryId)?.category
      : undefined;
    if (isDirectPolicyCategory) {
      if (!/^[a-f0-9]{24}$/.test(policyCategoryId) || !policyCategory) {
        quarantine.push({
          kind: 'offer-policy-category-missing',
          offer_id: id(offer._id),
          policy_category_id: policyCategoryId,
        });
      } else {
        const lifecycleStatus =
          typeof policyCategory.lifecycle_status === 'string'
            ? policyCategory.lifecycle_status
            : 'active';
        if (lifecycleStatus !== 'active') {
          quarantine.push({
            kind: 'offer-policy-category-inactive',
            offer_id: id(offer._id),
            policy_category_id: policyCategoryId,
            lifecycle_status: lifecycleStatus,
          });
        }
      }
    }
    if (
      policyCategoryId &&
      (policyCategoryId === 'custom' || categoryById.has(policyCategoryId)) &&
      (typeof originalPolicyCategoryId !== 'string' ||
        originalPolicyCategoryId !== policyCategoryId)
    ) {
      set.policy_category_id = policyCategoryId;
    }
    if (offer.categories_normalized !== categoriesNormalized) {
      set.categories_normalized = categoriesNormalized;
    }
    if (Object.keys(set).length > 0) {
      queueOfferBackfill(offer._id, set);
    }
  }

  const aliases = [];
  for (const { category, identity } of categoryById.values()) {
    const active = !['retired', 'purging'].includes(category.lifecycle_status);
    aliases.push({
      source: 'legacy',
      source_key: identity.normalized,
      category_id: category._id,
      active,
      tombstoned: !active,
    });
  }
  for (const [sourceKey, category] of involveAliases) {
    const active = !['retired', 'purging'].includes(category.lifecycle_status);
    aliases.push({
      source: 'involve',
      source_key: sourceKey,
      category_id: category._id,
      active,
      tombstoned: !active,
    });
  }

  const registryUpserts = [...desiredRegistryByHash.values()].sort((a, b) =>
    a.url_hash.localeCompare(b.url_hash),
  );

  return {
    quarantine,
    categoryBackfills,
    offerBackfills,
    sourceBackfills,
    aliases,
    registryUpserts,
    counts: {
      categories_scanned: snapshot.categories.length,
      offers_scanned: snapshot.offers.length,
      source_aliases_scanned: snapshot.sources.length,
      categories_to_backfill: categoryBackfills.length,
      offers_to_backfill: offerBackfills.length,
      sources_to_backfill: sourceBackfills.length,
      aliases_to_ensure: aliases.length,
      tracked_media_assets_scanned: (snapshot.registry ?? []).length,
      tracked_media_assets_to_ensure: registryUpserts.length,
      structured_media_assets_scanned: structuredMediaAssetsScanned,
      structured_media_assets_proven: structuredMediaAssetsProven,
      lifecycle_commands_scanned: (snapshot.lifecycleCommands ?? []).length,
      media_write_commands_scanned: (snapshot.mediaWriteCommands ?? []).length,
      quarantine: quarantine.length,
    },
  };
}

async function assertTransactions(db) {
  const hello = await db.admin().command({ hello: 1 });
  const topology =
    typeof hello.setName === 'string'
      ? 'replica-set'
      : hello.msg === 'isdbgrid'
        ? 'mongos'
        : 'standalone';
  if (
    !['replica-set', 'mongos'].includes(topology) ||
    typeof hello.logicalSessionTimeoutMinutes !== 'number'
  ) {
    throw new Error(
      'Policy category integrity apply requires replica-set or mongos transaction support.',
    );
  }
}

async function applyPlan(db, plan, snapshot, attemptToken) {
  const categories = db.collection('categories');
  const offers = db.collection('offers');
  const sources = db.collection('policy_category_sources');
  const state = db.collection('policy_integrity_states');
  const policies = db.collection('policies');
  const commands = db.collection('policy_lifecycle_commands');
  const cleanup = db.collection('policy_media_cleanup');
  const registry = db.collection('policy_media_asset_registry');
  const mediaWriteCommands = db.collection('policy_media_write_commands');

  if (plan.categoryBackfills.length) {
    await categories.bulkWrite(
      plan.categoryBackfills.map((item) => ({
        updateOne: {
          filter: { _id: item.category_id },
          update: { $set: item.set },
        },
      })),
      { ordered: true },
    );
  }
  if (plan.offerBackfills.length) {
    await offers.bulkWrite(
      plan.offerBackfills.map((item) => ({
        updateOne: {
          filter: { _id: item.offer_id },
          update: { $set: item.set },
        },
      })),
      { ordered: true },
    );
  }
  if (plan.sourceBackfills.length) {
    await sources.bulkWrite(
      plan.sourceBackfills.map((item) => ({
        updateOne: {
          filter: { _id: item.source_id },
          update: { $set: item.set },
        },
      })),
      { ordered: true },
    );
  }
  if (plan.registryUpserts.length) {
    await registry.bulkWrite(
      plan.registryUpserts.map((asset) => ({
        updateOne: {
          filter: { url_hash: asset.url_hash },
          update: { $setOnInsert: asset },
          upsert: true,
        },
      })),
      { ordered: true },
    );
  }

  await categories.createIndex(
    { name_normalized: 1 },
    {
      name: 'policy_category_name_normalized_v2',
      unique: true,
      partialFilterExpression: { name_normalized: { $type: 'string' } },
    },
  );
  await offers.createIndex(
    { policy_category_id: 1 },
    { name: 'policy_category_id_1' },
  );
  await offers.createIndex(
    { categories_normalized: 1 },
    { name: 'categories_normalized_1' },
  );

  for (const index of snapshot.sourceIndexes) {
    if (
      index.name !== '_id_' &&
      index.name !== 'policy_category_source_category_id_v2' &&
      indexKeyEquals(index, { category_id: 1 })
    ) {
      await sources.dropIndex(index.name);
    }
  }
  await sources.createIndex(
    { source: 1, source_key: 1 },
    { name: 'policy_category_source_identity_v2', unique: true },
  );
  await sources.createIndex(
    { category_id: 1 },
    { name: 'policy_category_source_category_id_v2' },
  );
  await policies.createIndex(
    { category_id: 1 },
    { name: 'category_id_1', unique: true },
  );
  await commands.createIndex(
    { request_key: 1 },
    { name: 'request_key_1', unique: true },
  );
  await cleanup.createIndex(
    {
      request_key: 1,
      payload_hash: 1,
      attempt_token: 1,
      reason: 1,
      'asset.object_key': 1,
    },
    {
      name: 'request_key_1_payload_hash_1_attempt_token_1_reason_1_asset.object_key_1',
      unique: true,
      partialFilterExpression: { 'asset.object_key': { $type: 'string' } },
    },
  );
  await registry.createIndex(
    { url_hash: 1 },
    { name: 'policy_media_asset_registry_url_hash_v1', unique: true },
  );
  await registry.createIndex(
    { state: 1, delete_lease_expires_at: 1 },
    { name: 'policy_media_asset_registry_state_lease_v1' },
  );
  await mediaWriteCommands.createIndex(
    { request_key: 1 },
    { name: 'request_key_1', unique: true },
  );
  await mediaWriteCommands.createIndex(
    {
      'planned_assets.asset.owner_key': 1,
      'planned_assets.asset.owner_attempt_token': 1,
      'planned_assets.asset.object_key': 1,
    },
    {
      name: 'planned_asset_owner_1_attempt_1_object_1',
      partialFilterExpression: {
        'planned_assets.asset.object_key': { $type: 'string' },
      },
    },
  );

  if (plan.aliases.length) {
    await sources.bulkWrite(
      plan.aliases.map((alias) => ({
        updateOne: {
          filter: { source: alias.source, source_key: alias.source_key },
          update: {
            $setOnInsert: {
              ...alias,
              request_key: `category-integrity-v2:${alias.source}:${alias.source_key}`,
              revision: 1,
            },
          },
          upsert: true,
        },
      })),
      { ordered: true },
    );
  }

  // Readiness is published last. Any interruption leaves mutations fail-closed
  // and this idempotent apply can resume from the same inventory.
  const published = await state.updateOne(
    {
      key: STATE_KEY,
      status: 'applying',
      migration_attempt_token: attemptToken,
    },
    {
      $set: {
        migration_version: MIGRATION_VERSION,
        status: 'ready',
        applied_at: new Date(),
        counts: plan.counts,
        quarantine: [],
      },
      $unset: {
        last_error: '',
        migration_attempt_token: '',
        migration_lease_expires_at: '',
      },
      $setOnInsert: { key: STATE_KEY },
    },
    { upsert: false },
  );
  const publishedCount =
    Number(published?.matchedCount ?? published?.modifiedCount ?? 0) +
    Number(published?.upsertedCount ?? (published?.upsertedId ? 1 : 0));
  if (publishedCount < 1) {
    throw new Error('Policy category integrity migration ownership was lost.');
  }
}

async function runPolicyCategoryIntegrityMigration({ db, mode = 'dry-run' }) {
  if (mode !== 'dry-run' && mode !== 'apply') {
    throw new Error('mode must be dry-run or apply');
  }
  if (mode === 'dry-run') {
    const snapshot = await inventory(db);
    const plan = planMigration(snapshot);
    return {
      mode,
      migration_version: MIGRATION_VERSION,
      counts: plan.counts,
      quarantine: plan.quarantine,
    };
  }

  await assertTransactions(db);
  const state = db.collection('policy_integrity_states');
  const existingState = await state.findOne({ key: STATE_KEY });
  if (
    Number.isInteger(existingState?.migration_version) &&
    existingState.migration_version > MIGRATION_VERSION
  ) {
    throw new Error(
      `Policy category integrity apply refused: durable state belongs to future migration version ${existingState.migration_version}.`,
    );
  }
  await state.createIndex(
    { key: 1 },
    { name: 'policy_integrity_state_key_v2', unique: true },
  );
  const attemptToken = randomUUID();
  const leaseExpiresAt = new Date(Date.now() + 60 * 60 * 1_000);
  let acquired = await state.updateOne(
    {
      key: STATE_KEY,
      $and: [
        {
          $or: [
            { migration_version: { $exists: false } },
            { migration_version: { $lte: MIGRATION_VERSION } },
          ],
        },
        {
          $or: [
            { status: { $ne: 'applying' } },
            { migration_lease_expires_at: { $lte: new Date() } },
            { migration_lease_expires_at: { $exists: false } },
          ],
        },
      ],
    },
    {
      $set: {
        migration_version: MIGRATION_VERSION,
        status: 'applying',
        migration_attempt_token: attemptToken,
        migration_lease_expires_at: leaseExpiresAt,
        quarantine: [],
      },
      $unset: { applied_at: '', counts: '', last_error: '' },
    },
    { upsert: false },
  );
  let acquiredCount =
    Number(acquired?.matchedCount ?? acquired?.modifiedCount ?? 0) +
    Number(acquired?.upsertedCount ?? (acquired?.upsertedId ? 1 : 0));
  if (acquiredCount < 1) {
    const blockingState = await state.findOne({ key: STATE_KEY });
    if (
      Number.isInteger(blockingState?.migration_version) &&
      blockingState.migration_version > MIGRATION_VERSION
    ) {
      throw new Error(
        `Policy category integrity apply refused: durable state belongs to future migration version ${blockingState.migration_version}.`,
      );
    }
    try {
      acquired = await state.insertOne({
        key: STATE_KEY,
        migration_version: MIGRATION_VERSION,
        status: 'applying',
        migration_attempt_token: attemptToken,
        migration_lease_expires_at: leaseExpiresAt,
        quarantine: [],
        write_epoch: 0,
      });
      acquiredCount = acquired?.acknowledged ? 1 : 0;
    } catch (error) {
      if (error?.code === 11000) {
        const racedState = await state.findOne({ key: STATE_KEY });
        if (
          Number.isInteger(racedState?.migration_version) &&
          racedState.migration_version > MIGRATION_VERSION
        ) {
          throw new Error(
            `Policy category integrity apply refused: durable state belongs to future migration version ${racedState.migration_version}.`,
          );
        }
        throw new Error(
          'Policy category integrity apply is already owned by another active attempt.',
        );
      }
      throw error;
    }
  }
  if (acquiredCount < 1) {
    throw new Error('Policy category integrity apply lease was not acquired.');
  }

  let plan;
  try {
    const snapshot = await inventory(db);
    plan = planMigration(snapshot);
    if (plan.quarantine.length) {
      throw new Error(
        `Policy category integrity apply refused: ${plan.quarantine.length} quarantine item(s) require review.`,
      );
    }
    await applyPlan(db, plan, snapshot, attemptToken);
  } catch (error) {
    await state.updateOne(
      {
        key: STATE_KEY,
        status: 'applying',
        migration_attempt_token: attemptToken,
      },
      {
        $set: {
          migration_version: MIGRATION_VERSION,
          status: 'failed',
          ...(plan ? { counts: plan.counts, quarantine: plan.quarantine } : {}),
          last_error:
            error instanceof Error
              ? error.message.slice(0, 1_000)
              : String(error),
        },
        $unset: {
          applied_at: '',
          migration_attempt_token: '',
          migration_lease_expires_at: '',
        },
      },
    );
    throw error;
  }
  return {
    mode,
    migration_version: MIGRATION_VERSION,
    counts: plan.counts,
    quarantine: plan.quarantine,
  };
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : 'dry-run';
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }
  const target = describeMongoTarget(mongoUri);
  if (mode === 'apply') {
    const writerDrain = loadWriterDrainEvidence(
      process.env.POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_FILE,
    );
    assertPolicyCategoryIntegrityApplyGate(
      target,
      process.env,
      writerDrain.evidence,
      writerDrain.sha256,
    );
  }
  const mongoose = require('mongoose');
  await mongoose.connect(mongoUri, { autoIndex: false });
  try {
    const result = await runPolicyCategoryIntegrityMigration({
      db: mongoose.connection.db,
      mode,
    });
    process.stdout.write(`${JSON.stringify({ ...result, target }, null, 2)}\n`);
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = {
  MIGRATION_VERSION,
  REVIEWED_PRODUCTION_ATLAS_FINGERPRINT,
  assertPolicyCategoryIntegrityApplyGate,
  describeMongoTarget,
  loadWriterDrainEvidence,
  looksLikeProductionMongoTarget,
  normalize,
  normalizePolicyMediaUrl,
  planMigration,
  policyMediaUrlHash,
  runPolicyCategoryIntegrityMigration,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `[policy-category-integrity] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
