import { activeQuestFilter, isActiveQuestRecord } from './quest-active-filter';

describe('activeQuestFilter', () => {
  const now = new Date('2026-07-23T12:00:00.000Z');

  it('excludes unpublished drafts and explicitly closed quests', () => {
    expect(activeQuestFilter(now)).toMatchObject({
      publication_status: { $ne: 'draft' },
      status: { $ne: 'close' },
      $and: expect.any(Array),
    });
  });

  it('allows a published scheduled revision to become active by date', () => {
    expect(
      isActiveQuestRecord(
        {
          publication_status: 'published',
          status: 'scheduled',
          start_date: '2026-07-01T00:00:00.000Z',
          end_date: '2026-07-31T23:59:59.999Z',
        },
        now,
      ),
    ).toBe(true);
  });

  it.each([
    { start_date: null, end_date: null },
    { start_date: undefined, end_date: undefined },
  ])('treats missing and null bounds as unbounded: %p', (bounds) => {
    expect(
      isActiveQuestRecord(
        {
          publication_status: 'published',
          status: 'open',
          ...bounds,
        },
        now,
      ),
    ).toBe(true);
  });

  it.each([
    { publication_status: 'draft', status: 'scheduled' },
    { publication_status: 'published', status: 'close' },
  ])('rejects non-public active candidates: %p', (state) => {
    expect(
      isActiveQuestRecord(
        {
          ...state,
          start_date: '2026-07-01T00:00:00.000Z',
          end_date: '2026-07-31T23:59:59.999Z',
        },
        now,
      ),
    ).toBe(false);
  });
});
