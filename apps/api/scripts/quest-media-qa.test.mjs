import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertReadinessContract,
  parseArgs,
  REQUIRED_ROUTE_BUNDLE,
  runQuestMediaQa,
} from './quest-media-qa.mjs';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('parseArgs defaults to read-only and requires explicit apply confirmation', () => {
  assert.deepEqual(parseArgs([]), {
    apply: false,
    confirmStaging: false,
    baseUrl: 'https://api-staging.gogocash.co',
  });
  assert.deepEqual(parseArgs(['--apply', '--confirm-staging']), {
    apply: true,
    confirmStaging: true,
    baseUrl: 'https://api-staging.gogocash.co',
  });
});

test('read-only mode performs only health and authenticated readiness GETs', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/health')) return jsonResponse({ status: 'ok' });
    return jsonResponse({
      contract_version: 'quest-media-v3',
      mutation_enabled: false,
      required_routes: REQUIRED_ROUTE_BUNDLE,
    });
  };

  const result = await runQuestMediaQa({
    token: 'secret-token',
    fetchImpl,
  });

  assert.equal(result.mode, 'read-only');
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.method === 'GET'));
  assert.equal(calls[1].options.headers.Authorization, 'Bearer secret-token');
});

test('mutation refuses to start without both CLI confirmation and deployed enablement', async () => {
  await assert.rejects(
    runQuestMediaQa({ token: 'secret', apply: true }),
    /--apply requires --confirm-staging/,
  );
  const methods = [];
  const fetchImpl = async (url, options) => {
    methods.push(options.method);
    if (url.endsWith('/health')) return jsonResponse({ status: 'ok' });
    return jsonResponse({
      contract_version: 'quest-media-v3',
      mutation_enabled: false,
      required_routes: REQUIRED_ROUTE_BUNDLE,
    });
  };
  await assert.rejects(
    runQuestMediaQa({
      token: 'secret',
      apply: true,
      confirmStaging: true,
      fetchImpl,
    }),
    /mutation is disabled/,
  );
  assert.deepEqual(methods, ['GET', 'GET']);
});

test('preflight rejects a partial route bundle', () => {
  assert.throws(
    () =>
      assertReadinessContract(
        {
          contract_version: 'quest-media-v3',
          mutation_enabled: true,
          required_routes: REQUIRED_ROUTE_BUNDLE.slice(0, -1),
        },
        true,
      ),
    /complete quest media acceptance route bundle is absent/,
  );
});

function acceptanceFixture({
  initialAvailabilityFailures = 0,
  replacementRemains = false,
} = {}) {
  const createdRefs = [
    'https://media.example/quests/a/banner-en.png',
    'https://media.example/quests/a/banner-th.png',
    'https://media.example/quests/a/sub-banner-en.png',
    'https://media.example/quests/a/sub-banner-th.png',
  ];
  const replacementRefs = [
    'https://media.example/quests/b/banner-en.png',
    'https://media.example/quests/b/banner-th.png',
    'https://media.example/quests/b/sub-banner-en.png',
    'https://media.example/quests/b/sub-banner-th.png',
  ];
  const calls = [];
  const refReads = new Map();
  let replaced = false;
  let cleaned = false;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/health')) return jsonResponse({ status: 'ok' });
    if (url.endsWith('/point/admin-quest-media/readiness')) {
      return jsonResponse({
        contract_version: 'quest-media-v3',
        mutation_enabled: true,
        required_routes: REQUIRED_ROUTE_BUNDLE,
      });
    }
    if (url.endsWith('/point/create-quest')) {
      assert.equal(
        options.body.get('status'),
        null,
        'status is derived by the API and must not be sent in multipart',
      );
      return jsonResponse({
        _id: '507f1f77bcf86cd799439011',
        campaign_revision: 1,
        config_revision: 0,
        banner_en: createdRefs[0],
        banner_th: createdRefs[1],
        sub_banner_en: createdRefs[2],
        sub_banner_th: createdRefs[3],
      });
    }
    if (url.includes('/point/admin-quest/') && url.endsWith('/campaign')) {
      replaced = true;
      return jsonResponse({
        _id: '507f1f77bcf86cd799439011',
        campaign_revision: 2,
        config_revision: 0,
        banner_en: replacementRefs[0],
        banner_th: replacementRefs[1],
        sub_banner_en: replacementRefs[2],
        sub_banner_th: replacementRefs[3],
      });
    }
    if (url.includes('/point/admin-quest-media/qa-status/')) {
      if (cleaned) {
        return jsonResponse({ command: null, quest: null, cleanup: 0 });
      }
      const isReplacement = decodeURIComponent(url).endsWith(':replacement');
      const refs = isReplacement ? replacementRefs : createdRefs;
      return jsonResponse({
        command: { status: 'committed', planned_object_count: 4 },
        quest: { refs },
        pending_cleanup: 0,
      });
    }
    if (url.endsWith('/point/admin-quest-media/qa-cleanup')) {
      cleaned = true;
      return jsonResponse({
        quest_deleted: true,
        objects_deleted: 4,
        intents_deleted: 2,
        tombstones_deleted: 8,
      });
    }
    if (createdRefs.includes(url)) {
      const reads = (refReads.get(url) ?? 0) + 1;
      refReads.set(url, reads);
      const unavailable =
        !replaced && reads <= initialAvailabilityFailures;
      return new Response(
        replaced || unavailable ? null : Buffer.from('created'),
        {
          status: replaced || unavailable ? 404 : 200,
        },
      );
    }
    if (replacementRefs.includes(url)) {
      const reads = (refReads.get(url) ?? 0) + 1;
      refReads.set(url, reads);
      const absent = cleaned && !replacementRemains;
      return new Response(absent ? null : Buffer.from('replacement'), {
        status: absent ? 404 : 200,
      });
    }
    throw new Error(`Unexpected request: ${options?.method} ${url}`);
  };
  return { calls, createdRefs, fetchImpl, refReads, replacementRefs };
}

test('applied acceptance replaces four existing banners and cleans both generations', async () => {
  const fixture = acceptanceFixture({ initialAvailabilityFailures: 1 });

  const result = await runQuestMediaQa({
    token: 'secret',
    apply: true,
    confirmStaging: true,
    fetchImpl: fixture.fetchImpl,
    availabilityTimeoutMs: 50,
    availabilityRetryMs: 1,
  });

  assert.equal(result.mode, 'replaced-and-cleaned');
  assert.deepEqual(result.created_refs, fixture.createdRefs);
  assert.deepEqual(result.replacement_refs, fixture.replacementRefs);
  assert.ok(
    fixture.calls.some(
      ({ url, options }) =>
        options.method === 'PATCH' &&
        url.endsWith('/point/admin-quest/507f1f77bcf86cd799439011/campaign'),
    ),
  );
  assert.ok(
    [...fixture.createdRefs, ...fixture.replacementRefs].every(
      (ref) => (fixture.refReads.get(ref) ?? 0) >= 2,
    ),
    'both object generations must be probed before and after replacement/cleanup',
  );
});

test('applied acceptance fails when any replacement object remains readable after cleanup', async () => {
  const fixture = acceptanceFixture({ replacementRemains: true });

  await assert.rejects(
    runQuestMediaQa({
      token: 'secret',
      apply: true,
      confirmStaging: true,
      fetchImpl: fixture.fetchImpl,
      absenceTimeoutMs: 5,
      absenceRetryMs: 1,
    }),
    /still readable|deletion.*not.*proven/i,
  );
  assert.ok(
    fixture.replacementRefs.every(
      (ref) => (fixture.refReads.get(ref) ?? 0) >= 2,
    ),
    'every replacement ref must be probed after cleanup',
  );
});
