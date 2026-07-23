import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function collectIntegrationSpecs(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectIntegrationSpecs(path);
    return entry.name.endsWith('integration.spec.ts') ? [path] : [];
  });
}

describe('policy HTTP integration listener contract', () => {
  it('binds every Nest HTTP test app to an ephemeral loopback listener', () => {
    const policyRoot = __dirname;
    const httpSpecs = collectIntegrationSpecs(policyRoot)
      .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
      .filter(({ source }) => source.includes('createNestApplication'));

    expect(httpSpecs.map(({ path }) => path)).toHaveLength(5);
    for (const { path, source } of httpSpecs) {
      expect({
        path,
        usesLazyInit: source.includes('await app.init()'),
      }).toMatchObject({ usesLazyInit: false });
      expect({
        path,
        bindsLoopback: source.includes("await app.listen(0, '127.0.0.1')"),
      }).toMatchObject({ bindsLoopback: true });
      expect({
        path,
        closesApp: /await app(?:\?\.|\.)close\(\)/.test(source),
      }).toMatchObject({ closesApp: true });
    }
  });
});
