import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('quest task-v2 operator CLIs', () => {
  const apiRoot = path.resolve(__dirname, '../..');

  it('boots the provider/index migration through the supported SWC runtime', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(
      packageJson.scripts['migrate:conversion-provider-identity'],
    ).toContain('-r ./scripts/register-swc-runtime.cjs');
    expect(
      packageJson.scripts['migrate:conversion-provider-identity'],
    ).not.toContain('@swc-node/register');
    const env = { ...process.env };
    delete env.MONGO_URI;

    const result = spawnSync(
      process.execPath,
      [
        '-r',
        './scripts/register-swc-runtime.cjs',
        'scripts/migrate-conversion-provider-identity.ts',
      ],
      { cwd: apiRoot, env, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MONGO_URI is required.');
    expect(result.stderr).not.toContain('ts.Extension');
  });

  it('boots reconciliation through the supported SWC runtime before environment validation', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts['reconcile:quest-task-events']).toContain(
      '-r ./scripts/register-swc-runtime.cjs',
    );
    expect(packageJson.scripts['reconcile:quest-task-events']).not.toContain(
      '@swc-node/register',
    );
    const env = { ...process.env };
    delete env.QUEST_TASK_V2_ENABLED;
    delete env.MONGO_URI;

    const result = spawnSync(
      process.execPath,
      [
        '-r',
        './scripts/register-swc-runtime.cjs',
        'scripts/reconcile-quest-task-events.ts',
        '--limit=1',
      ],
      { cwd: apiRoot, env, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('QUEST_TASK_V2_ENABLED=true is required');
    expect(result.stderr).not.toContain('ts.Extension');
  });
});
