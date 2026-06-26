import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function makeContext(userRole?: string): any {
  const req = { user: userRole ? { role: userRole } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

function guardRequiring(required: string[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows routes without @Roles (opt-in guard)', () => {
    expect(guardRequiring(undefined).canActivate(makeContext('viewer'))).toBe(
      true,
    );
  });

  it('allows when the actual role meets the required minimum', () => {
    expect(
      guardRequiring(['superadmin']).canActivate(makeContext('superadmin')),
    ).toBe(true);
  });

  it('rejects an under-privileged role with a message naming the required and actual role', () => {
    const guard = guardRequiring(['superadmin']);
    expect(() => guard.canActivate(makeContext('viewer'))).toThrow(
      ForbiddenException,
    );
    try {
      guard.canActivate(makeContext('viewer'));
      throw new Error('expected ForbiddenException');
    } catch (e) {
      const msg = (e as ForbiddenException).message;
      expect(msg).toContain('superadmin');
      expect(msg).toContain('viewer');
    }
  });

  it('rejects a missing role claim (fails closed to viewer)', () => {
    const guard = guardRequiring(['approver']);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
