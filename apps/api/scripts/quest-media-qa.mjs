#!/usr/bin/env node

import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const REQUIRED_ROUTE_BUNDLE = [
  'GET /point/admin-quest-media/readiness',
  'POST /point/create-quest',
  'PATCH /point/admin-quest/:id/campaign',
  'GET /point/admin-quest-media/qa-status/:requestKey',
  'POST /point/admin-quest-media/qa-cleanup',
];

const DEFAULT_BASE_URL = 'https://api-staging.gogocash.co';
const BANNER_ROLES = [
  'banner_en',
  'banner_th',
  'sub_banner_en',
  'sub_banner_th',
];

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
}

export function parseArgs(argv) {
  const options = {
    apply: false,
    confirmStaging: false,
    baseUrl: DEFAULT_BASE_URL,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') options.apply = true;
    else if (argument === '--confirm-staging') options.confirmStaging = true;
    else if (argument === '--base-url') {
      options.baseUrl = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  options.baseUrl = normalizeBaseUrl(options.baseUrl);
  return options;
}

function bearerHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function responseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requireOk(response, action) {
  const body = await responseBody(response);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message
        : String(body || response.statusText);
    throw new Error(`${action} failed (${response.status}): ${message}`);
  }
  return body;
}

export function assertReadinessContract(readiness, apply) {
  if (!readiness || readiness.contract_version !== 'quest-media-v3') {
    throw new Error('Quest media v3 readiness contract is not deployed');
  }
  if (
    !Array.isArray(readiness.required_routes) ||
    REQUIRED_ROUTE_BUNDLE.some(
      (route) => !readiness.required_routes.includes(route),
    )
  ) {
    throw new Error(
      'The complete quest media acceptance route bundle is absent',
    );
  }
  if (apply && readiness.mutation_enabled !== true) {
    throw new Error('Quest media acceptance mutation is disabled on the API');
  }
}

async function preflight({ baseUrl, token, fetchImpl, apply }) {
  const health = await fetchImpl(`${baseUrl}/health`, { method: 'GET' });
  await requireOk(health, 'API health preflight');
  const readinessResponse = await fetchImpl(
    `${baseUrl}/point/admin-quest-media/readiness`,
    { method: 'GET', headers: bearerHeaders(token) },
  );
  const readiness = await requireOk(
    readinessResponse,
    'Quest media readiness preflight',
  );
  assertReadinessContract(readiness, apply);
  return readiness;
}

async function distinctPngs(replacement = false) {
  const colors = replacement
    ? [
        { r: 245, g: 158, b: 11, alpha: 1 },
        { r: 6, g: 182, b: 212, alpha: 1 },
        { r: 236, g: 72, b: 153, alpha: 1 },
        { r: 132, g: 204, b: 22, alpha: 1 },
      ]
    : [
        { r: 220, g: 38, b: 38, alpha: 1 },
        { r: 37, g: 99, b: 235, alpha: 1 },
        { r: 22, g: 163, b: 74, alpha: 1 },
        { r: 147, g: 51, b: 234, alpha: 1 },
      ];
  return Promise.all(
    colors.map((background) =>
      sharp({
        create: { width: 4, height: 4, channels: 4, background },
      })
        .png()
        .toBuffer(),
    ),
  );
}

function createAcceptanceIdentity() {
  const id = randomUUID();
  const now = Date.now();
  return {
    requestKey: `quest-media:qa:${id}`,
    marker: `quest-media-qa:${id}`,
    nonce: randomBytes(32).toString('hex'),
    startDate: new Date(now + 86_400_000).toISOString(),
    endDate: new Date(now + 7 * 86_400_000).toISOString(),
  };
}

async function createQaQuest({ baseUrl, token, fetchImpl, identity }) {
  const form = new FormData();
  form.set('request_key', identity.requestKey);
  form.set('campaign_revision', '0');
  form.set('expected_config_revision', '0');
  form.set('qa_marker', identity.marker);
  form.set('qa_cleanup_nonce', identity.nonce);
  form.set('start_date', identity.startDate);
  form.set('end_date', identity.endDate);
  form.set('facebook_page', '');
  form.set('facebook_post', identity.marker);
  form.set('line', '');
  const images = await distinctPngs();
  BANNER_ROLES.forEach((role, index) => {
    form.set(
      role,
      new Blob([images[index]], { type: 'image/png' }),
      `${role}-${index + 1}.png`,
    );
  });
  const response = await fetchImpl(`${baseUrl}/point/create-quest`, {
    method: 'POST',
    headers: bearerHeaders(token),
    body: form,
  });
  return requireOk(response, 'Four-file quest acceptance create');
}

async function replaceQaQuest({ baseUrl, token, fetchImpl, identity, quest }) {
  const campaignRevision = Number(quest?.campaign_revision);
  const configRevision = Number(quest?.config_revision ?? 0);
  if (
    !Number.isSafeInteger(campaignRevision) ||
    campaignRevision < 1 ||
    !Number.isSafeInteger(configRevision) ||
    configRevision < 0
  ) {
    throw new Error('Created QA quest did not return valid revision counters');
  }
  const form = new FormData();
  form.set('request_key', identity.requestKey);
  form.set('campaign_revision', String(campaignRevision));
  form.set('expected_config_revision', String(configRevision));
  form.set('qa_marker', identity.marker);
  form.set('qa_cleanup_nonce', identity.nonce);
  form.set('start_date', identity.startDate);
  form.set('end_date', identity.endDate);
  form.set('facebook_page', '');
  form.set('facebook_post', identity.marker);
  form.set('line', '');
  const images = await distinctPngs(true);
  BANNER_ROLES.forEach((role, index) => {
    form.set(
      role,
      new Blob([images[index]], { type: 'image/png' }),
      `${role}-replacement-${index + 1}.png`,
    );
  });
  const response = await fetchImpl(
    `${baseUrl}/point/admin-quest/${encodeURIComponent(quest._id)}/campaign`,
    {
      method: 'PATCH',
      headers: bearerHeaders(token),
      body: form,
    },
  );
  return requireOk(response, 'Four-file quest acceptance replacement');
}

function questRefs(quest) {
  return BANNER_ROLES.map((role) => quest?.[role]);
}

async function probeStoredRef(ref, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(ref, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: AbortSignal.timeout(15_000),
    });
    return response.status;
  } catch (error) {
    throw new Error(
      `Stored quest banner probe failed: ${
        error instanceof Error ? error.message : error
      }`,
    );
  } finally {
    await response?.body?.cancel();
  }
}

async function proveRefsUsable(refs, fetchImpl, { timeoutMs, retryMs }) {
  if (
    refs.some(
      (ref) => typeof ref !== 'string' || !ref.startsWith('https://'),
    ) ||
    new Set(refs).size !== BANNER_ROLES.length
  ) {
    throw new Error('Created quest does not contain four distinct HTTPS refs');
  }
  const deadline = Date.now() + timeoutMs;
  let results = [];
  do {
    results = await Promise.all(
      refs.map(async (ref) => {
        try {
          return { ref, status: await probeStoredRef(ref, fetchImpl) };
        } catch (error) {
          return {
            ref,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    if (
      results.every(
        (result) =>
          typeof result.status === 'number' &&
          result.status >= 200 &&
          result.status < 300,
      )
    ) {
      return;
    }
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryMs, remainingMs)),
    );
  } while (Date.now() < deadline);

  const failures = results
    .filter(
      (result) =>
        typeof result.status !== 'number' ||
        result.status < 200 ||
        result.status >= 300,
    )
    .map(
      (result) =>
        `${result.ref} (${
          result.error ?? `status ${String(result.status)}`
        })`,
    );
  throw new Error(
    `Stored quest banner availability was not proven: ${failures.join(', ')}`,
  );
}

async function proveRefsAbsent(
  refs,
  fetchImpl,
  { timeoutMs, retryMs },
) {
  const deadline = Date.now() + timeoutMs;
  let results = [];
  do {
    results = await Promise.all(
      refs.map(async (ref) => {
        try {
          return { ref, status: await probeStoredRef(ref, fetchImpl) };
        } catch (error) {
          return {
            ref,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    if (results.every((result) => result.status === 404)) return;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryMs, remainingMs)),
    );
  } while (Date.now() < deadline);

  const failures = results
    .filter((result) => result.status !== 404)
    .map(
      (result) =>
        `${result.ref} (${
          result.error ?? `status ${String(result.status)}`
        })`,
    );
  throw new Error(
    `Stored quest banner deletion was not proven; exact refs are still readable or did not return 404: ${failures.join(', ')}`,
  );
}

async function readStatus({ baseUrl, token, fetchImpl, requestKey }) {
  const response = await fetchImpl(
    `${baseUrl}/point/admin-quest-media/qa-status/${encodeURIComponent(requestKey)}`,
    { method: 'GET', headers: bearerHeaders(token) },
  );
  return requireOk(response, 'Quest media QA status');
}

async function cleanupQaQuest({
  baseUrl,
  token,
  fetchImpl,
  identity,
  questId,
}) {
  const response = await fetchImpl(
    `${baseUrl}/point/admin-quest-media/qa-cleanup`,
    {
      method: 'POST',
      headers: {
        ...bearerHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quest_id: questId,
        request_key: identity.requestKey,
        qa_marker: identity.marker,
        cleanup_nonce: identity.nonce,
      }),
    },
  );
  return requireOk(response, 'Quest media QA cleanup');
}

export async function runQuestMediaQa({
  baseUrl = DEFAULT_BASE_URL,
  token,
  apply = false,
  confirmStaging = false,
  fetchImpl = fetch,
  allowNonStaging = false,
  availabilityTimeoutMs = 90_000,
  availabilityRetryMs = 2_000,
  absenceTimeoutMs = 90_000,
  absenceRetryMs = 2_000,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!token) throw new Error('QUEST_MEDIA_QA_TOKEN is required');
  if (apply && !confirmStaging) {
    throw new Error('--apply requires --confirm-staging');
  }
  if (
    apply &&
    !allowNonStaging &&
    new URL(normalizedBaseUrl).hostname !== 'api-staging.gogocash.co'
  ) {
    throw new Error('Mutation is restricted to api-staging.gogocash.co');
  }

  const readiness = await preflight({
    baseUrl: normalizedBaseUrl,
    token,
    fetchImpl,
    apply,
  });
  if (!apply) {
    return { mode: 'read-only', readiness };
  }

  const identity = createAcceptanceIdentity();
  const replacementIdentity = {
    ...identity,
    requestKey: `${identity.requestKey}:replacement`,
  };
  let quest;
  let cleanupIdentity = identity;
  try {
    quest = await createQaQuest({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      identity,
    });
    const createdRefs = questRefs(quest);
    await proveRefsUsable(createdRefs, fetchImpl, {
      timeoutMs: availabilityTimeoutMs,
      retryMs: availabilityRetryMs,
    });
    const createdStatus = await readStatus({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      requestKey: identity.requestKey,
    });
    if (
      createdStatus?.command?.status !== 'committed' ||
      createdStatus?.command?.planned_object_count !== 4 ||
      createdStatus?.quest?.refs?.length !== 4
    ) {
      throw new Error('Committed four-object quest status could not be proven');
    }
    cleanupIdentity = replacementIdentity;
    const replacedQuest = await replaceQaQuest({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      identity: replacementIdentity,
      quest,
    });
    const replacementRefs = questRefs(replacedQuest);
    await proveRefsUsable(replacementRefs, fetchImpl, {
      timeoutMs: availabilityTimeoutMs,
      retryMs: availabilityRetryMs,
    });
    if (replacementRefs.some((ref) => createdRefs.includes(ref))) {
      throw new Error('Quest replacement reused an original banner reference');
    }
    const replacementStatus = await readStatus({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      requestKey: replacementIdentity.requestKey,
    });
    if (
      replacementStatus?.command?.status !== 'committed' ||
      replacementStatus?.command?.planned_object_count !== 4 ||
      replacementStatus?.quest?.refs?.length !== 4 ||
      !replacementRefs.every(
        (ref, index) => replacementStatus.quest.refs[index] === ref,
      )
    ) {
      throw new Error(
        'Persisted four-object quest replacement could not be proven',
      );
    }
    await proveRefsAbsent(createdRefs, fetchImpl, {
      timeoutMs: absenceTimeoutMs,
      retryMs: absenceRetryMs,
    });
    const cleanup = await cleanupQaQuest({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      identity: replacementIdentity,
      questId: quest._id,
    });
    for (const requestKey of [
      identity.requestKey,
      replacementIdentity.requestKey,
    ]) {
      const after = await readStatus({
        baseUrl: normalizedBaseUrl,
        token,
        fetchImpl,
        requestKey,
      });
      if (
        after?.command !== null ||
        after?.quest !== null ||
        Number(after?.cleanup ?? after?.pending_cleanup ?? 0) !== 0
      ) {
        throw new Error(
          'Post-cleanup intent/quest/tombstone absence was not proven',
        );
      }
    }
    await proveRefsAbsent(replacementRefs, fetchImpl, {
      timeoutMs: absenceTimeoutMs,
      retryMs: absenceRetryMs,
    });
    return {
      mode: 'replaced-and-cleaned',
      quest_id: quest._id,
      created_refs: createdRefs,
      replacement_refs: replacementRefs,
      cleanup,
    };
  } catch (error) {
    if (quest?._id) {
      for (const candidate of [cleanupIdentity, identity]) {
        try {
          await cleanupQaQuest({
            baseUrl: normalizedBaseUrl,
            token,
            fetchImpl,
            identity: candidate,
            questId: quest._id,
          });
          break;
        } catch {
          // Try the create command when a replacement failed before commit.
        }
      }
    }
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runQuestMediaQa({
    ...options,
    token: process.env.QUEST_MEDIA_QA_TOKEN,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
