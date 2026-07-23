import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { GoogleDriveController } from './google-drive.controller';
import { GoogleDriveModule } from './google-drive.module';
import { AuthAdminGuard } from '../admin/jwt-auth-admin.guard';

const GUARDS_METADATA = '__guards__';

// The real app registers the Mongoose connection globally via
// MongooseModule.forRoot (its core module is @Global). This mirrors that so the
// module compiles exactly as it would at boot — proving the guard's DI resolves,
// which a controllers-only test with an overridden guard could not.
@Global()
@Module({
  providers: [{ provide: getConnectionToken(), useValue: {} }],
  exports: [getConnectionToken()],
})
class GlobalConnectionStubModule {}

describe('GoogleDriveController', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [GlobalConnectionStubModule, GoogleDriveModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module.get(GoogleDriveController)).toBeDefined();
  });

  it('resolves AuthAdminGuard from the module (JwtService + connection wired)', () => {
    expect(module.get(AuthAdminGuard)).toBeInstanceOf(AuthAdminGuard);
  });

  // Security: POST /google-drive/upload was live and UNAUTHENTICATED, so anyone
  // could write to Google Drive (bypassing R2 + Image Resizing), and every other
  // route on the controller was open too. The whole controller must now require
  // an admin JWT (fail-closed).
  it('protects the controller with AuthAdminGuard (fail-closed)', () => {
    const guards =
      (Reflect.getMetadata(
        GUARDS_METADATA,
        GoogleDriveController,
      ) as unknown[]) ?? [];
    expect(guards).toContain(AuthAdminGuard);
  });
});
