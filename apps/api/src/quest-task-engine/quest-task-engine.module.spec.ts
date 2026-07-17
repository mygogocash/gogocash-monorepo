jest.mock('src/auth/firebase-admin.provider', () => ({
  getAdminAuth: jest.fn(),
}));

import { MODULE_METADATA } from '@nestjs/common/constants';
import { JwtModule } from '@nestjs/jwt';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

import { QuestTaskEngineModule } from './quest-task-engine.module';

describe('QuestTaskEngineModule auth wiring', () => {
  it('owns the Firebase guard and imports the customer JWT module', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      QuestTaskEngineModule,
    ) as unknown[];
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      QuestTaskEngineModule,
    ) as Array<{ module?: unknown }>;

    expect(providers).toContain(FirebaseAuthGuard);
    expect(imports.some((entry) => entry?.module === JwtModule)).toBe(true);
  });
});
