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
      contract_version: 'quest-media-v2',
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
      contract_version: 'quest-media-v2',
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
          contract_version: 'quest-media-v2',
          mutation_enabled: true,
          required_routes: REQUIRED_ROUTE_BUNDLE.slice(0, -1),
        },
        true,
      ),
    /complete quest media acceptance route bundle is absent/,
  );
});

test('applied acceptance fails when any exact public object remains readable after cleanup', async () => {
  const refs = [
    'https://media.example/quests/a/banner-en.png',
    'https://media.example/quests/a/banner-th.png',
    'https://media.example/quests/a/sub-banner-en.png',
    'https://media.example/quests/a/sub-banner-th.png',
  ];
  const refReads = new Map();
  let statusReads = 0;
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/health')) return jsonResponse({ status: 'ok' });
    if (url.endsWith('/point/admin-quest-media/readiness')) {
      return jsonResponse({
        contract_version: 'quest-media-v2',
        mutation_enabled: true,
        required_routes: REQUIRED_ROUTE_BUNDLE,
      });
    }
    if (url.endsWith('/point/create-quest')) {
      return jsonResponse({
        _id: '507f1f77bcf86cd799439011',
        banner_en: refs[0],
        banner_th: refs[1],
        sub_banner_en: refs[2],
        sub_banner_th: refs[3],
      });
    }
    if (url.includes('/point/admin-quest-media/qa-status/')) {
      statusReads += 1;
      return statusReads === 1
        ? jsonResponse({
            command: { status: 'committed', planned_object_count: 4 },
            quest: { refs },
            pending_cleanup: 0,
          })
        : jsonResponse({ command: null, quest: null, cleanup: 0 });
    }
    if (url.endsWith('/point/admin-quest-media/qa-cleanup')) {
      return jsonResponse({
        quest_deleted: true,
        objects_deleted: 4,
        intent_deleted: true,
        tombstones_deleted: 4,
      });
    }
    if (refs.includes(url)) {
      const reads = (refReads.get(url) ?? 0) + 1;
      refReads.set(url, reads);
      // First read proves upload availability. The second read deliberately
      // simulates a provider delete no-op that leaves the object public.
      return new Response(Buffer.from('still-present'), { status: 200 });
    }
    throw new Error(`Unexpected request: ${options?.method} ${url}`);
  };

  await assert.rejects(
    runQuestMediaQa({
      token: 'secret',
      apply: true,
      confirmStaging: true,
      fetchImpl,
    }),
    /still readable|deletion.*not.*proven/i,
  );
  assert.ok(
    refs.every((ref) => (refReads.get(ref) ?? 0) >= 2),
    'every exact ref must be probed after cleanup',
  );
});
