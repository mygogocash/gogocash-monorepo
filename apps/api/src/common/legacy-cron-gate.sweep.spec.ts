import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

/**
 * Source-pin sweep for the CRON_ENABLED legacy-cron gate.
 *
 * During the Railway beta/cutover, two API instances share one database.
 * In-process scheduled jobs have no distributed lock, so every LEGACY
 * @Cron/@Interval/@Timeout handler must start with the isLegacyCronEnabled()
 * gate — the stack with CRON_ENABLED=false skips them, keeping each job
 * single-owned. Quest task-v2 jobs are the deliberate exception: they are
 * governed solely by QUEST_TASK_V2_ENABLED (owned by the v2-enabled stack)
 * and must NOT consult the legacy gate.
 *
 * Adding a scheduled job without a gate call fails this sweep — decide
 * explicitly which stack owns it.
 */
const SRC = resolve(__dirname, '..');
const V2_EXEMPT_PREFIX = 'quest-task-engine/';
const ACTIVE_SCHEDULE_DECORATOR = /^\s*@(Cron|Interval|Timeout)\(/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return [full];
  });
}

function activeScheduleSites(src: string): number {
  return src.split('\n').filter((line) => ACTIVE_SCHEDULE_DECORATOR.test(line))
    .length;
}

const scheduledFiles = walk(SRC)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
  .map((f) => ({
    rel: relative(SRC, f).replaceAll('\\', '/'),
    src: readFileSync(f, 'utf8'),
  }))
  .filter(({ src }) => activeScheduleSites(src) > 0);

describe('legacy-cron gate sweep (dual-stack scheduled-job ownership)', () => {
  it('finds the known scheduled-job files (sweep sanity)', () => {
    expect(scheduledFiles.length).toBeGreaterThanOrEqual(11);
  });

  it('every legacy scheduled handler gates via isLegacyCronEnabled()', () => {
    const offenders = scheduledFiles
      .filter(({ rel }) => !rel.startsWith(V2_EXEMPT_PREFIX))
      .filter(({ src }) => {
        const gateCalls = (src.match(/isLegacyCronEnabled\(\)/g) ?? []).length;
        const imported = src.includes("common/legacy-cron-gate'");
        return !imported || gateCalls < activeScheduleSites(src);
      })
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('quest task-v2 jobs stay exempt from the legacy gate', () => {
    const v2Files = scheduledFiles.filter(({ rel }) =>
      rel.startsWith(V2_EXEMPT_PREFIX),
    );
    expect(v2Files.length).toBeGreaterThanOrEqual(2);
    for (const { src } of v2Files) {
      expect(src).not.toContain('legacy-cron-gate');
    }
  });
});
