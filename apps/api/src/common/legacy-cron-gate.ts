/**
 * Gate for LEGACY in-process scheduled jobs (@Cron/@Interval/@Timeout).
 *
 * During the Railway beta/cutover two API instances share one database and
 * these jobs have no distributed lock, so exactly one stack may run them:
 * the other sets CRON_ENABLED=false. Only the literal string 'false'
 * disables (same exact-match idiom as POSTHOG_ENABLED).
 *
 * Quest task-v2 jobs must NOT use this gate — they are governed solely by
 * QUEST_TASK_V2_ENABLED and owned by whichever stack has v2 enabled. The
 * legacy-cron-gate.sweep spec enforces both sides of this split.
 */
export function isLegacyCronEnabled(
  raw: string | undefined = process.env.CRON_ENABLED,
): boolean {
  return raw !== 'false';
}
