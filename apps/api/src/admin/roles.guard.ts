import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import {
  AdminRole,
  roleHasAccess,
} from './user-admin/schemas/user-admin.schema';

/**
 * Enforces minimum-role on admin routes that declare `@Roles(...)`. Routes
 * without `@Roles` are not affected — this guard is opt-in per route. Always
 * apply AFTER `AuthAdminGuard` so `request['user']` is populated.
 *
 * Role resolution fails CLOSED: `roleHasAccess` maps a missing/unknown `role`
 * claim to the least privilege ('viewer'), never superadmin. A pre-rollout JWT
 * with no role claim is therefore treated as viewer (read-only), not granted
 * blanket access. (See `roleHasAccess` in user-admin/schemas/user-admin.schema.ts.)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request['user'] as { role?: AdminRole } | undefined;

    // Pass if the actual role meets at least ONE of the listed minimums.
    // `@Roles('approver')` means "approver or higher".
    const ok = required.some((r) => roleHasAccess(user?.role, r));
    if (!ok) {
      throw new ForbiddenException('Insufficient admin role');
    }
    return true;
  }
}
