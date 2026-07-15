import { deriveQuestStatus } from './quest-status';

describe('deriveQuestStatus', () => {
  const now = new Date('2026-07-15T05:00:00.000Z');

  it.each([
    ['scheduled', '2026-07-16T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['open', '2026-07-01T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    ['close', '2026-06-01T00:00:00.000Z', '2026-06-30T00:00:00.000Z'],
  ] as const)(
    'returns %s from the campaign window',
    (expected, startDate, endDate) => {
      expect(deriveQuestStatus(startDate, endDate, now)).toBe(expected);
    },
  );
});
