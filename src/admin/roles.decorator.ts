import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from './user-admin/schemas/user-admin.schema';

export const ROLES_KEY = 'admin-roles:required';

/**
 * Decorate an admin route with the minimum role required to access it.
 * Pair with `RolesGuard` (applied after `AuthAdminGuard`).
 *
 * Example:
 *   @UseGuards(AuthAdminGuard, RolesGuard)
 *   @Roles('approver')
 *   async approveWithdraw(...) {}
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
