export type QuestProgressState = {
  current_value: number;
  target_value: number;
  completed: boolean;
  active_award: boolean;
  award_epoch: number;
};

export type QuestProgressLedgerDecision = {
  type: 'add' | 'remove';
  idempotency_key: string;
};

export function transitionQuestProgress(
  previous: QuestProgressState,
  currentValue: number,
  options: { award_identity: string; awards_points: boolean },
): {
  next: QuestProgressState;
  ledger?: QuestProgressLedgerDecision;
} {
  const qualifies = currentValue >= previous.target_value;
  if (!options.awards_points) {
    return {
      next: {
        ...previous,
        current_value: currentValue,
        completed: qualifies,
        active_award: false,
      },
    };
  }

  if (qualifies && !previous.active_award) {
    return {
      next: {
        ...previous,
        current_value: currentValue,
        completed: true,
        active_award: true,
      },
      ledger: {
        type: 'add',
        idempotency_key: `${options.award_identity}:epoch:${previous.award_epoch}`,
      },
    };
  }
  if (!qualifies && previous.active_award) {
    return {
      next: {
        ...previous,
        current_value: currentValue,
        completed: false,
        active_award: false,
        award_epoch: previous.award_epoch + 1,
      },
      ledger: {
        type: 'remove',
        idempotency_key: `${options.award_identity}:epoch:${previous.award_epoch}:compensation`,
      },
    };
  }
  return {
    next: {
      ...previous,
      current_value: currentValue,
      completed: qualifies,
    },
  };
}
