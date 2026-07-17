#!/usr/bin/env node

import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const REQUIRED_ROUTE_BUNDLE = [
  'GET /point/admin-quest-media/readiness',
  'POST /point/create-quest',
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
  if (!readiness || readiness.contract_version !== 'quest-media-v2') {
    throw new Error('Quest media v2 readiness contract is not deployed');
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

async function distinctPngs() {
  const colors = [
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
  return {
    requestKey: `quest-media:qa:${id}`,
    marker: `quest-media-qa:${id}`,
    nonce: randomBytes(32).toString('hex'),
  };
}

async function createQaQuest({ baseUrl, token, fetchImpl, identity }) {
  const now = Date.now();
  const form = new FormData();
  form.set('request_key', identity.requestKey);
  form.set('campaign_revision', '0');
  form.set('expected_config_revision', '0');
  form.set('qa_marker', identity.marker);
  form.set('qa_cleanup_nonce', identity.nonce);
  form.set('start_date', new Date(now + 86_400_000).toISOString());
  form.set('end_date', new Date(now + 7 * 86_400_000).toISOString());
  form.set('status', 'scheduled');
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

function questRefs(quest) {
  return BANNER_ROLES.map((role) => quest?.[role]);
}

async function proveRefsUsable(refs, fetchImpl) {
  if (
    refs.some(
      (ref) => typeof ref !== 'string' || !ref.startsWith('https://'),
    ) ||
    new Set(refs).size !== BANNER_ROLES.length
  ) {
    throw new Error('Created quest does not contain four distinct HTTPS refs');
  }
  for (const ref of refs) {
    const response = await fetchImpl(ref, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    if (!response.ok) {
      throw new Error(
        `Stored quest banner is not readable (${response.status})`,
      );
    }
  }
}

async function proveRefsAbsent(refs, fetchImpl) {
  const failures = [];
  for (const ref of refs) {
    const response = await fetchImpl(ref, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    if (response.status !== 404) {
      failures.push(`${ref} (${response.status})`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Stored quest banner deletion was not proven; exact refs are still readable or did not return 404: ${failures.join(', ')}`,
    );
  }
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
  let quest;
  try {
    quest = await createQaQuest({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      identity,
    });
    const refs = questRefs(quest);
    await proveRefsUsable(refs, fetchImpl);
    const status = await readStatus({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      requestKey: identity.requestKey,
    });
    if (
      status?.command?.status !== 'committed' ||
      status?.command?.planned_object_count !== 4 ||
      status?.quest?.refs?.length !== 4
    ) {
      throw new Error('Committed four-object quest status could not be proven');
    }
    const cleanup = await cleanupQaQuest({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      identity,
      questId: quest._id,
    });
    const after = await readStatus({
      baseUrl: normalizedBaseUrl,
      token,
      fetchImpl,
      requestKey: identity.requestKey,
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
    await proveRefsAbsent(refs, fetchImpl);
    return {
      mode: 'applied-and-cleaned',
      quest_id: quest._id,
      refs,
      cleanup,
    };
  } catch (error) {
    if (quest?._id) {
      try {
        await cleanupQaQuest({
          baseUrl: normalizedBaseUrl,
          token,
          fetchImpl,
          identity,
          questId: quest._id,
        });
      } catch {
        // Preserve the primary failure. The marker/request/nonce are printed by
        // neither this script nor logs, so operators must rerun with DB access.
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
