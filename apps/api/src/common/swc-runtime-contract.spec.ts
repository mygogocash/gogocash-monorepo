import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('API TypeScript runtime contract', () => {
  const apiRoot = path.resolve(__dirname, '../..');
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> };

  it('routes every package script away from the incompatible legacy hook', () => {
    const unsupported = Object.entries(packageJson.scripts)
      .filter(([, command]) => command.includes('@swc-node/register'))
      .map(([name]) => name);

    expect(unsupported).toEqual([]);
    for (const name of ['start', 'start:dev', 'seed:e2e']) {
      expect(packageJson.scripts[name]).toContain(
        '-r ./scripts/register-swc-runtime.cjs',
      );
    }
  });

  it('boots the E2E seed through the supported hook before env validation', () => {
    const env = { ...process.env };
    delete env.MONGO_URI;
    delete env.JWT_ADMIN_SECRET;
    const result = spawnSync(
      process.execPath,
      ['-r', './scripts/register-swc-runtime.cjs', 'scripts/seed-e2e.ts'],
      { cwd: apiRoot, env, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MONGO_URI is required');
    expect(result.stderr).not.toContain('ts.Extension');
  });

  it('maps runtime failures back to their original TypeScript location', () => {
    const result = spawnSync(
      process.execPath,
      [
        '-r',
        './scripts/register-swc-runtime.cjs',
        '-e',
        "require('./src/common/mongo-query.ts').requireObjectId('invalid')",
      ],
      { cwd: apiRoot, encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/common/mongo-query.ts:9');
  });
});
