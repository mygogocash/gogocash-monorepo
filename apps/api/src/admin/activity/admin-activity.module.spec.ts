import { MODULE_METADATA } from '@nestjs/common/constants';
import { JwtModule } from '@nestjs/jwt';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { RolesGuard } from '../roles.guard';
import { AdminActivityModule } from './admin-activity.module';

describe('AdminActivityModule', () => {
  it('owns every dependency required by its guarded controller', () => {
    const imports =
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AdminActivityModule) as
        Array<{ module?: unknown }> | undefined) ?? [];
    const providers =
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AdminActivityModule) as
        unknown[] | undefined) ?? [];

    expect(imports.some((entry) => entry?.module === JwtModule)).toBe(true);
    expect(providers).toEqual(
      expect.arrayContaining([AuthAdminGuard, RolesGuard]),
    );
  });
});
