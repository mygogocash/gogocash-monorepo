import { ConflictException, Injectable } from '@nestjs/common';

import { QUEST_TASK_CONFIG_FROZEN } from './quest-task.contract';

export const QUEST_ALREADY_STARTED = 'QUEST_ALREADY_STARTED';
export const QUEST_HAS_EFFECTS = 'QUEST_HAS_EFFECTS';
export const QUEST_REVISION_PUBLISHED = 'QUEST_REVISION_PUBLISHED';

export type QuestMutationCapabilities = {
  can_edit_campaign_economics: boolean;
  can_edit_task_economics: boolean;
  can_edit_rewards: boolean;
  can_edit_presentation: boolean;
  can_create_revision: boolean;
  freeze_reason:
    | typeof QUEST_ALREADY_STARTED
    | typeof QUEST_HAS_EFFECTS
    | typeof QUEST_REVISION_PUBLISHED
    | null;
};

export type QuestEconomicState = {
  has_outbox?: boolean;
  has_progress?: boolean;
  has_award?: boolean;
};

type QuestEconomicRecord = {
  revision_of?: unknown;
  publication_status?: unknown;
  start_date?: unknown;
  task_v2_state_frozen_at?: unknown;
  legacy_payout_resolution_started_at?: unknown;
  legacy_payout_resolution_command_key?: unknown;
  legacy_payout_config_checksum?: unknown;
};

function hasStarted(quest: QuestEconomicRecord, now: Date): boolean {
  const start = new Date(quest.start_date as Date | string);
  return Number.isNaN(start.getTime()) || start.getTime() <= now.getTime();
}

function hasKnownEffects(
  quest: QuestEconomicRecord,
  state?: QuestEconomicState,
): boolean {
  return Boolean(
    quest.task_v2_state_frozen_at ||
    quest.legacy_payout_resolution_started_at ||
    quest.legacy_payout_resolution_command_key ||
    quest.legacy_payout_config_checksum ||
    state?.has_outbox ||
    state?.has_progress ||
    state?.has_award,
  );
}

@Injectable()
export class QuestEconomicMutationPolicy {
  capabilities(
    quest: QuestEconomicRecord,
    state?: QuestEconomicState,
    now = new Date(),
  ): QuestMutationCapabilities {
    const effectsExist = hasKnownEffects(quest, state);
    const publishedRevision = Boolean(
      quest.revision_of && quest.publication_status === 'published',
    );
    const started = hasStarted(quest, now);
    const freezeReason = effectsExist
      ? QUEST_HAS_EFFECTS
      : publishedRevision
        ? QUEST_REVISION_PUBLISHED
        : started
          ? QUEST_ALREADY_STARTED
          : null;
    const canEditEconomics = freezeReason === null;

    return {
      can_edit_campaign_economics: canEditEconomics,
      can_edit_task_economics: canEditEconomics,
      can_edit_rewards: canEditEconomics,
      can_edit_presentation: true,
      can_create_revision: true,
      freeze_reason: freezeReason,
    };
  }

  assertEconomicMutationAllowed(
    quest: QuestEconomicRecord,
    state?: QuestEconomicState,
    options: { now?: Date; next_start_date?: Date } = {},
  ): void {
    const now = options.now ?? new Date();
    const capabilities = this.capabilities(quest, state, now);
    const nextStart = options.next_start_date;
    const nextWindowHasStarted = nextStart
      ? Number.isNaN(nextStart.getTime()) ||
        nextStart.getTime() <= now.getTime()
      : false;

    if (capabilities.can_edit_campaign_economics && !nextWindowHasStarted) {
      return;
    }

    throw new ConflictException({
      code: QUEST_TASK_CONFIG_FROZEN,
      message:
        'Quest economics are frozen after publication, start, or progress. Create a new revision with a future window.',
      freeze_reason:
        capabilities.freeze_reason ??
        (nextWindowHasStarted ? QUEST_ALREADY_STARTED : null),
    });
  }
}
