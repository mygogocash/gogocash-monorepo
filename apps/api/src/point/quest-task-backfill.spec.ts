import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { stableLegacyTaskKey } from './quest-task.contract';
import { planQuestTaskBackfill } from './quest-task-backfill';

describe('planQuestTaskBackfill', () => {
  const legacyTask = {
    offer: 'offer-1',
    offer_id: 101,
    merchant_id: 201,
    extra_point: 50,
    sort_order: 7,
    enabled: false,
    wording: 'Buy from the brand',
    notes: 'keep me',
  };

  it('plans missing-as-legacy fields with deterministic keys without reordering or activating tasks', () => {
    const plan = planQuestTaskBackfill([
      {
        _id: 'quest-1',
        tasks: [legacyTask, { ...legacyTask, offer: 'offer-2', sort_order: 2 }],
      },
    ]);

    expect(plan).toMatchObject({
      scanned: 1,
      would_update: 1,
      reward_models_to_add: 1,
      task_keys_to_add: 2,
    });
    expect(plan.updates[0]?.reward_model).toBe('legacy_v1');
    expect(plan.updates[0]?.tasks).toEqual([
      expect.objectContaining({
        ...legacyTask,
        task_type: 'brand_purchase',
        task_key: stableLegacyTaskKey('quest-1', 'offer-1'),
        points: 50,
        enabled: false,
        sort_order: 7,
      }),
      expect.objectContaining({
        offer: 'offer-2',
        task_key: stableLegacyTaskKey('quest-1', 'offer-2'),
        enabled: false,
        sort_order: 2,
      }),
    ]);
  });

  it('is an idempotent no-op on the apply rerun', () => {
    const first = planQuestTaskBackfill([
      { _id: 'quest-1', tasks: [legacyTask] },
    ]);
    const applied = first.updates[0];
    expect(applied).toBeDefined();

    const rerun = planQuestTaskBackfill([
      {
        _id: applied!.quest_id,
        reward_model: applied!.reward_model,
        tasks: applied!.tasks,
      },
    ]);

    expect(rerun).toMatchObject({
      scanned: 1,
      already_canonical: 1,
      would_update: 0,
      reward_models_to_add: 0,
      task_keys_to_add: 0,
    });
  });

  it.each(['', '   '])(
    'replaces a blank legacy task key %j and stays idempotent',
    (taskKey) => {
      const first = planQuestTaskBackfill([
        {
          _id: 'quest-blank-key',
          reward_model: 'legacy_v1',
          tasks: [{ ...legacyTask, task_key: taskKey }],
        },
      ]);

      expect(first.updates[0]?.tasks[0]?.task_key).toBe(
        stableLegacyTaskKey('quest-blank-key', 'offer-1'),
      );
      expect(
        planQuestTaskBackfill([
          {
            _id: 'quest-blank-key',
            reward_model: 'legacy_v1',
            tasks: first.updates[0]!.tasks,
          },
        ]),
      ).toMatchObject({ would_update: 0, already_canonical: 1 });
    },
  );

  it('boots the guarded CLI without the broken TypeScript 7 SWC hook', () => {
    const apiRoot = path.resolve(__dirname, '../..');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    for (const name of [
      'backfill:quest-tasks',
      'backfill:quest-tasks:dry',
      'backfill:quest-tasks:apply',
    ]) {
      expect(packageJson.scripts[name]).toContain(
        '-r ./scripts/register-swc-runtime.cjs',
      );
      expect(packageJson.scripts[name]).not.toContain('@swc-node/register');
    }

    const env = { ...process.env };
    delete env.MONGO_URI;
    const result = spawnSync(
      process.execPath,
      [
        '-r',
        './scripts/register-swc-runtime.cjs',
        'scripts/backfill-quest-tasks.ts',
        '--dry-run',
      ],
      { cwd: apiRoot, env, encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MONGO_URI is not set. Aborting.');
    expect(result.stderr).not.toContain('ts.Extension');
  });

  it('skips task-v2 documents instead of rewriting their identities', () => {
    expect(
      planQuestTaskBackfill([
        {
          _id: 'quest-v2',
          reward_model: 'task_v2',
          tasks: [
            {
              task_key: 'server-owned',
              task_type: 'friend_referral',
              points: 75,
            },
          ],
        },
      ]),
    ).toMatchObject({ task_v2_skipped: 1, would_update: 0 });
  });

  it('fails closed on ambiguous duplicate brands or invalid legacy points', () => {
    expect(() =>
      planQuestTaskBackfill([
        { _id: 'duplicate', tasks: [legacyTask, { ...legacyTask }] },
      ]),
    ).toThrow('duplicate legacy brand tasks');
    expect(() =>
      planQuestTaskBackfill([
        { _id: 'invalid', tasks: [{ ...legacyTask, extra_point: 1 }] },
      ]),
    ).toThrow('invalid points');
    expect(() =>
      planQuestTaskBackfill([
        {
          _id: 'inert-referral',
          reward_model: 'legacy_v1',
          tasks: [
            {
              task_key: 'task_referral',
              task_type: 'friend_referral',
              completion_rule: 'account_created',
              points: 50,
            },
          ],
        },
      ]),
    ).toThrow('typed non-brand task');
  });
});
