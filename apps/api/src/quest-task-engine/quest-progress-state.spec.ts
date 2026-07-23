import { transitionQuestProgress } from './quest-progress-state';

describe('transitionQuestProgress', () => {
  const base = {
    current_value: 0,
    target_value: 10_000,
    completed: false,
    active_award: false,
    award_epoch: 0,
  };

  it('awards once when spend crosses the target', () => {
    expect(
      transitionQuestProgress(base, 12_500, {
        award_identity: 'quest:q:task:t:user:u',
        awards_points: true,
      }),
    ).toEqual({
      next: {
        ...base,
        current_value: 12_500,
        completed: true,
        active_award: true,
      },
      ledger: {
        type: 'add',
        idempotency_key: 'quest:q:task:t:user:u:epoch:0',
      },
    });
  });

  it('does not award again while the same epoch remains active', () => {
    expect(
      transitionQuestProgress(
        { ...base, current_value: 12_500, completed: true, active_award: true },
        20_000,
        { award_identity: 'quest:q:task:t:user:u', awards_points: true },
      ),
    ).toEqual({
      next: {
        ...base,
        current_value: 20_000,
        completed: true,
        active_award: true,
      },
    });
  });

  it('compensates once and increments epoch only after removal', () => {
    expect(
      transitionQuestProgress(
        { ...base, current_value: 12_500, completed: true, active_award: true },
        8_000,
        { award_identity: 'quest:q:task:t:user:u', awards_points: true },
      ),
    ).toEqual({
      next: {
        ...base,
        current_value: 8_000,
        completed: false,
        active_award: false,
        award_epoch: 1,
      },
      ledger: {
        type: 'remove',
        idempotency_key: 'quest:q:task:t:user:u:epoch:0:compensation',
      },
    });
  });

  it('requalifies only into the next compensated epoch', () => {
    expect(
      transitionQuestProgress(
        { ...base, current_value: 8_000, award_epoch: 1 },
        15_000,
        { award_identity: 'quest:q:task:t:user:u', awards_points: true },
      ),
    ).toMatchObject({
      next: { active_award: true, award_epoch: 1 },
      ledger: {
        type: 'add',
        idempotency_key: 'quest:q:task:t:user:u:epoch:1',
      },
    });
  });

  it('completes brand progress without minting a duplicate task-v2 point', () => {
    expect(
      transitionQuestProgress({ ...base, target_value: 1 }, 1, {
        award_identity: 'unused',
        awards_points: false,
      }),
    ).toEqual({
      next: {
        ...base,
        target_value: 1,
        current_value: 1,
        completed: true,
        active_award: false,
      },
    });
  });
});
