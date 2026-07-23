import { isQuestWinnerGeneratorEnabled } from './quest-winner-generator-gate';

describe('quest-winner-generator-gate', () => {
  it('is disabled by default (unset or empty QUEST_WINNER_GENERATOR_ENABLED)', () => {
    expect(isQuestWinnerGeneratorEnabled(undefined)).toBe(false);
    expect(isQuestWinnerGeneratorEnabled('')).toBe(false);
  });

  it('is enabled only by the literal string "true" (opt-in), any case/padding', () => {
    expect(isQuestWinnerGeneratorEnabled('true')).toBe(true);
    expect(isQuestWinnerGeneratorEnabled('TRUE')).toBe(true);
    expect(isQuestWinnerGeneratorEnabled(' true ')).toBe(true);
  });

  it('treats every other value as disabled (fail-closed, opt-in idiom)', () => {
    expect(isQuestWinnerGeneratorEnabled('false')).toBe(false);
    expect(isQuestWinnerGeneratorEnabled('1')).toBe(false);
    expect(isQuestWinnerGeneratorEnabled('0')).toBe(false);
    expect(isQuestWinnerGeneratorEnabled('yes')).toBe(false);
  });
});
