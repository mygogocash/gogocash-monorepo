import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { ROLES_KEY } from 'src/admin/roles.decorator';
import { RolesGuard } from 'src/admin/roles.guard';

import { PointController } from './point.controller';

describe('quest media QA HTTP guard contract', () => {
  for (const methodName of [
    'getQuestMediaReadiness',
    'getQuestMediaQaStatus',
    'cleanupQuestMediaAcceptance',
  ] as const) {
    it(`${methodName} is superadmin-only behind both admin guards`, () => {
      const method = PointController.prototype[methodName];
      expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual(['superadmin']);
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
        AuthAdminGuard,
        RolesGuard,
      ]);
    });
  }
});
