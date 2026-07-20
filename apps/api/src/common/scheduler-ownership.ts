/**
 * One-line summary of which single-owner resources THIS instance holds.
 *
 * During the beta/cutover two API stacks share one database, and exactly one
 * may own the legacy crons, quest-v2 jobs, and the Telegram poller at a time
 * (withdrawals is the global kill-switch state). Logged once at bootstrap so
 * the single-owner audit is a log grep on each stack instead of guesswork.
 */
import { isLegacyCronEnabled } from './legacy-cron-gate';
import { isWithdrawalsEnabled } from '../withdraw/withdraw-gate';

export function describeSchedulerOwnership(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const onOff = (enabled: boolean) => (enabled ? 'on' : 'off');
  const legacyCrons = isLegacyCronEnabled(env.CRON_ENABLED);
  // Same semantics as quest-task-transaction.service.ts (trim + lowercase).
  const questV2 = env.QUEST_TASK_V2_ENABLED?.trim().toLowerCase() === 'true';
  // Same gating as app.module.ts: the Telegram module only loads for a real
  // token (set and not the PLACEHOLDER sentinel).
  const telegram = Boolean(
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_TOKEN !== 'PLACEHOLDER',
  );
  const withdrawals = isWithdrawalsEnabled(env.WITHDRAWALS_ENABLED);
  return (
    `scheduler-ownership legacy_crons=${onOff(legacyCrons)} ` +
    `quest_v2=${onOff(questV2)} telegram=${onOff(telegram)} ` +
    `withdrawals=${onOff(withdrawals)}`
  );
}
