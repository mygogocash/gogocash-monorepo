export function activeQuestFilter(now = new Date()): Record<string, any> {
  return {
    publication_status: { $ne: 'draft' },
    status: { $ne: 'close' },
    $and: [
      {
        $or: [
          { start_date: { $exists: false } },
          { start_date: null },
          { start_date: { $lte: now } },
        ],
      },
      {
        $or: [
          { end_date: { $exists: false } },
          { end_date: null },
          { end_date: { $gte: now } },
        ],
      },
    ],
  };
}

export function isActiveQuestRecord(
  quest: Record<string, any>,
  now = new Date(),
): boolean {
  const start =
    quest.start_date === undefined || quest.start_date === null
      ? null
      : new Date(quest.start_date);
  const end =
    quest.end_date === undefined || quest.end_date === null
      ? null
      : new Date(quest.end_date);
  return (
    quest.publication_status !== 'draft' &&
    quest.status !== 'close' &&
    (start === null ||
      Number.isNaN(start.getTime()) ||
      start.getTime() <= now.getTime()) &&
    (end === null ||
      Number.isNaN(end.getTime()) ||
      end.getTime() >= now.getTime())
  );
}
