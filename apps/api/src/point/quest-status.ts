export type QuestStatus = 'scheduled' | 'open' | 'close';

/** Derive campaign state exclusively from its start/end window. */
export function deriveQuestStatus(
  startDate: Date | string,
  endDate: Date | string,
  now = new Date(),
): QuestStatus {
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const nowTime = now.getTime();

  if (Number.isFinite(startTime) && nowTime < startTime) return 'scheduled';
  if (Number.isFinite(endTime) && nowTime > endTime) return 'close';
  return 'open';
}

export function withDerivedQuestStatus<
  T extends { start_date: Date | string; end_date: Date | string },
>(quest: T, now = new Date()): T & { status: QuestStatus } {
  return {
    ...quest,
    status: deriveQuestStatus(quest.start_date, quest.end_date, now),
  };
}
