import { PointSchema } from 'src/point/schemas/point.schema';
import { ConversionSchema } from 'src/withdraw/schemas/conversion.schema';

import { QUEST_TASK_V2_REQUIRED_INDEXES } from './quest-task-index.contract';
import { QuestAccountTransitionSchema } from './schemas/quest-account-transition.schema';
import { QuestContributionSchema } from './schemas/quest-contribution.schema';
import { QuestConversionQuarantineSchema } from './schemas/quest-conversion-quarantine.schema';
import { QuestConversionStateSchema } from './schemas/quest-conversion-state.schema';
import { QuestConversionTransitionSchema } from './schemas/quest-conversion-transition.schema';
import { QuestEventIngestionSchema } from './schemas/quest-event-ingestion.schema';
import { QuestOutboxSchema } from './schemas/quest-outbox.schema';
import { QuestTaskProgressSchema } from './schemas/quest-task-progress.schema';
import { QuestSourceConfigFenceSchema } from './schemas/quest-source-config-fence.schema';

function indexByName(
  schema: { indexes(): Array<[unknown, Record<string, unknown>]> },
  name: string,
) {
  return schema.indexes().find(([, options]) => options.name === name);
}

const CONTROLLED_TASK_V2_SCHEMAS = [
  ['quest_account_transitions', QuestAccountTransitionSchema],
  ['quest_conversion_transitions', QuestConversionTransitionSchema],
  ['quest_conversion_quarantine', QuestConversionQuarantineSchema],
  ['quest_outbox', QuestOutboxSchema],
  ['quest_event_ingestions', QuestEventIngestionSchema],
  ['quest_task_progress', QuestTaskProgressSchema],
  ['quest_task_contributions', QuestContributionSchema],
  ['quest_task_conversion_state', QuestConversionStateSchema],
  ['quest_source_config_fence', QuestSourceConfigFenceSchema],
] as const;

describe('quest task-v2 schema identities', () => {
  it.each(CONTROLLED_TASK_V2_SCHEMAS)(
    'keeps %s indexes migration-owned',
    (_collection, schema) => {
      expect(schema.get('autoIndex')).toBe(false);
      expect(schema.get('autoCreate')).toBe(false);
    },
  );

  it('keeps every dedicated schema index in the controlled migration contract', () => {
    const declared = CONTROLLED_TASK_V2_SCHEMAS.flatMap(
      ([collection, schema]) =>
        schema.indexes().map(([key, options]) => ({
          collection,
          name: String(options.name),
          key,
          unique: options.unique === true,
          ...(options.partialFilterExpression
            ? { partialFilterExpression: options.partialFilterExpression }
            : {}),
        })),
    ).sort((left, right) => left.name.localeCompare(right.name));
    const controlledCollections = new Set<string>(
      CONTROLLED_TASK_V2_SCHEMAS.map(([collection]) => collection),
    );
    const migrated = QUEST_TASK_V2_REQUIRED_INDEXES.filter(({ collection }) =>
      controlledCollections.has(collection),
    )
      .map((index) => ({ ...index }))
      .sort((left, right) => left.name.localeCompare(right.name));

    expect(migrated).toEqual(declared);
  });

  it('keeps legacy Point rows unkeyed while uniquely constraining nonempty keys', () => {
    expect(indexByName(PointSchema, 'uniq_point_idempotency_key')).toEqual([
      { idempotency_key: 1 },
      {
        name: 'uniq_point_idempotency_key',
        unique: true,
        partialFilterExpression: {
          idempotency_key: { $type: 'string', $gt: '' },
        },
      },
    ]);
  });

  it('addresses conversions by source, provider account, and provider id', () => {
    expect(ConversionSchema.get('autoIndex')).toBe(false);
    expect(
      indexByName(ConversionSchema, 'uniq_conversion_provider_identity'),
    ).toEqual([
      { source: 1, provider_account: 1, provider_conversion_id: 1 },
      expect.objectContaining({ unique: true }),
    ]);
    expect(
      indexByName(ConversionSchema, 'uniq_conversion_quest_payout_key'),
    ).toEqual([
      { quest_payout_key: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: {
          quest_payout_key: { $type: 'string', $gt: '' },
        },
      }),
    ]);
  });

  it.each([
    [QuestAccountTransitionSchema, 'uniq_quest_account_transition'],
    [QuestConversionTransitionSchema, 'uniq_quest_conversion_transition'],
    [QuestConversionQuarantineSchema, 'uniq_quest_conversion_quarantine'],
    [QuestOutboxSchema, 'uniq_quest_outbox_source_event'],
    [QuestEventIngestionSchema, 'uniq_quest_event_ingestion'],
    [QuestTaskProgressSchema, 'uniq_quest_task_progress'],
    [QuestContributionSchema, 'uniq_quest_contribution_transition'],
    [QuestConversionStateSchema, 'uniq_quest_conversion_state'],
    [QuestSourceConfigFenceSchema, 'uniq_quest_source_config_fence'],
  ])('declares durable identity index %s', (schema, name) => {
    expect(indexByName(schema as never, name)).toBeDefined();
    expect(indexByName(schema as never, name)?.[1]).toMatchObject({
      unique: true,
    });
  });
});
