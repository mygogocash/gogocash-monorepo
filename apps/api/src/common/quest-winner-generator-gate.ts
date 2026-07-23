/**
 * Opt-in gate for the operator-invoked legacy-reward winner-manifest EVIDENCE
 * GENERATOR (scripts/generate-legacy-reward-evidence.ts).
 *
 * The generator only derives and prints/writes a JSON evidence file; it never
 * touches Mongo or the ledger, and is NEVER wired to @Cron/@Interval/@Timeout.
 * It is therefore intentionally absent from describeSchedulerOwnership()
 * (that line enumerates single-owner SCHEDULED resources only). This flag is a
 * hard opt-in so the tool cannot run by accident.
 *
 * Semantics mirror QUEST_TASK_V2_ENABLED (trim + lowercase, exact "true"):
 * default OFF, enabled only by the literal string "true".
 */
export function isQuestWinnerGeneratorEnabled(
  raw: string | undefined = process.env.QUEST_WINNER_GENERATOR_ENABLED,
): boolean {
  return raw?.trim().toLowerCase() === 'true';
}
