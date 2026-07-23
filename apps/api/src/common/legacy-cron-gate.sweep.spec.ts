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

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;
const ANY_DECORATOR = /^\s*@[A-Za-z_$]/;
const METHOD_SIGNATURE_START = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/;
const GATE_STATEMENT = 'if (!isLegacyCronEnabled()) return;';

function isSkippableLine(line: string): boolean {
  return line.trim() === '' || COMMENT_LINE.test(line);
}

/** Advance past a decorator, tolerating multi-line args; returns the index after its closing line. */
function skipDecorator(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length && !lines[i].includes(')')) i += 1;
  return i + 1;
}

/**
 * Structural check: returns `methodName@line` (1-based line of the decorator)
 * for every ACTIVE @Cron/@Interval/@Timeout site whose decorated method does
 * NOT start with the exact gate statement `if (!isLegacyCronEnabled()) return;`.
 * A gate mentioned only in a comment, or an inverted gate, is an offender.
 */
export function findUngatedScheduleSites(src: string): string[] {
  const lines = src.split('\n');
  const offenders: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!ACTIVE_SCHEDULE_DECORATOR.test(lines[i])) {
      i += 1;
      continue;
    }
    const siteLine = i + 1;
    i = skipDecorator(lines, i);
    // Skip stacked decorators and comments up to the method signature start.
    let methodName: string | undefined;
    while (i < lines.length) {
      const line = lines[i];
      if (isSkippableLine(line)) {
        i += 1;
        continue;
      }
      if (ANY_DECORATOR.test(line)) {
        i = skipDecorator(lines, i);
        continue;
      }
      methodName = METHOD_SIGNATURE_START.exec(line)?.[1];
      break;
    }
    if (methodName === undefined) {
      offenders.push(`unknown@${siteLine}`);
      continue;
    }
    // Tolerate multi-line signatures: scan to the line opening the body.
    while (i < lines.length && !lines[i].trimEnd().endsWith('{')) i += 1;
    i += 1;
    // The first statement of the decorated method must be exactly the gate.
    while (i < lines.length && isSkippableLine(lines[i])) i += 1;
    if (lines[i]?.trim() !== GATE_STATEMENT) {
      offenders.push(`${methodName}@${siteLine}`);
    }
  }
  return offenders;
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

  it('every legacy scheduled handler opens with the isLegacyCronEnabled() gate', () => {
    const offenders = scheduledFiles
      .filter(({ rel }) => !rel.startsWith(V2_EXEMPT_PREFIX))
      .flatMap(({ rel, src }) =>
        findUngatedScheduleSites(src).map((site) => `${rel}#${site}`),
      );
    expect(offenders).toEqual([]);
  });

  describe('findUngatedScheduleSites parser', () => {
    it('given a properly gated site > then reports no offender', () => {
      const src = [
        'class Svc {',
        "  @Cron('0 0 * * *')",
        '  async nightly() {',
        '    if (!isLegacyCronEnabled()) return;',
        '    await this.run();',
        '  }',
        '}',
      ].join('\n');
      expect(findUngatedScheduleSites(src)).toEqual([]);
    });

    it('given only a comment mentioning the gate > then flags the site', () => {
      const src = [
        'class Svc {',
        "  @Cron('0 0 * * *')",
        '  async nightly() {',
        '    // TODO: wire isLegacyCronEnabled() here',
        '    await this.run();',
        '  }',
        '}',
      ].join('\n');
      expect(findUngatedScheduleSites(src)).toEqual(['nightly@2']);
    });

    it('given an inverted gate > then flags the site', () => {
      const src = [
        'class Svc {',
        "  @Cron('0 0 * * *')",
        '  async nightly() {',
        '    if (isLegacyCronEnabled()) return;',
        '    await this.run();',
        '  }',
        '}',
      ].join('\n');
      expect(findUngatedScheduleSites(src)).toEqual(['nightly@2']);
    });

    it('given a commented-out decorator > then ignores the site', () => {
      const src = [
        'class Svc {',
        "  // @Cron('0 0 * * *')",
        '  async nightly() {',
        '    await this.run();',
        '  }',
        '}',
      ].join('\n');
      expect(findUngatedScheduleSites(src)).toEqual([]);
    });

    it('given one gated and one ungated site > then flags exactly the ungated one', () => {
      const src = [
        'class Svc {',
        "  @Cron('0 0 * * *')",
        '  async gatedJob() {',
        '    if (!isLegacyCronEnabled()) return;',
        '    await this.a();',
        '  }',
        '',
        '  @Interval(60000)',
        '  async ungatedJob() {',
        '    await this.b();',
        '  }',
        '}',
      ].join('\n');
      expect(findUngatedScheduleSites(src)).toEqual(['ungatedJob@8']);
    });

    it('given multi-line decorator args and signatures > then still resolves the gate', () => {
      const src = [
        'class Svc {',
        "  @Cron('0 0 * * *', {",
        "    name: 'gated-job',",
        '  })',
        '  async gatedJob(',
        '    context: JobContext,',
        '  ): Promise<void> {',
        '    if (!isLegacyCronEnabled()) return;',
        '    await this.a(context);',
        '  }',
        '',
        '  @Timeout(5_000, {',
        "    name: 'ungated-job',",
        '  })',
        '  async ungatedJob(',
        '    context: JobContext,',
        '  ): Promise<void> {',
        '    await this.b(context);',
        '  }',
        '}',
      ].join('\n');
      expect(findUngatedScheduleSites(src)).toEqual(['ungatedJob@12']);
    });
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
