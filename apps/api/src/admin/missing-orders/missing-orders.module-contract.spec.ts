import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Admin missing-orders canonical model wiring', () => {
  it('registers MissionOrder from missionorders instead of the duplicate MissingOrder model', () => {
    const source = readFileSync(
      join(__dirname, '..', 'admin.module.ts'),
      'utf8',
    );

    expect(source).toMatch(
      /import\s*\{\s*MissionOrder,\s*MissionOrderSchema,?\s*\}\s*from 'src\/offer\/schemas\/missing-order\.schema';/,
    );
    expect(source).toContain(
      '{ name: MissionOrder.name, schema: MissionOrderSchema }',
    );
    expect(source).not.toContain(
      "from './missing-orders/schemas/missing-order.schema'",
    );
    expect(source).not.toContain(
      '{ name: MissingOrder.name, schema: MissingOrderSchema }',
    );
  });

  it('removes the legacy Admin schema path so it cannot become a second model', () => {
    expect(
      existsSync(join(__dirname, 'schemas', 'missing-order.schema.ts')),
    ).toBe(false);
  });
});
