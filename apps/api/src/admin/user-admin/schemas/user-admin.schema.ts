import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserAdminDocument = HydratedDocument<UserAdmin>;
export const USER_ADMIN_COLLECTION = 'useradmins';

/**
 * RBAC roles for admin panel users. Order matters: stronger roles include
 * the rights of weaker ones (checked via `roleHasAccess`).
 *
 * - viewer    — read-only dashboards, no mutations
 * - support   — viewer + customer-service actions (resend OTP, unlock OTP)
 * - approver  — support + approve/reject withdraws / refunds
 * - superadmin — everything (user management, fee changes, settings)
 */
export type AdminRole = 'viewer' | 'support' | 'approver' | 'superadmin';

const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 0,
  support: 1,
  approver: 2,
  superadmin: 3,
};

/**
 * Map the admin-UI role vocabulary (super_admin/admin/editor/viewer) onto the
 * API tiers so a single rank check works regardless of which vocabulary an
 * account was created with. Invited admins carry UI-vocab roles; legacy/API
 * accounts carry API-vocab roles.
 */
const UI_ROLE_TO_API: Record<string, AdminRole> = {
  super_admin: 'superadmin',
  admin: 'approver',
  editor: 'support',
  viewer: 'viewer',
};

function normalizeRole(role: string | undefined | null): AdminRole | undefined {
  if (role == null) return undefined;
  return (UI_ROLE_TO_API[role] ?? role) as AdminRole;
}

export function roleHasAccess(
  actual: AdminRole | string | undefined | null,
  required: AdminRole,
): boolean {
  // Fail CLOSED: a missing/unknown role gets the LEAST privilege ('viewer'),
  // never superadmin. (New accounts are created with an explicit role; the
  // schema also defaults role to 'viewer'.)
  const a = (normalizeRole(actual) ?? 'viewer') as AdminRole;
  const req = (normalizeRole(required) ?? required) as AdminRole;
  return (ROLE_RANK[a] ?? -1) >= ROLE_RANK[req];
}

@Schema({ timestamps: true, collection: USER_ADMIN_COLLECTION })
export class UserAdmin {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  /**
   * Monotonic credential generation. It is copied into admin JWTs and reset
   * tokens so changing a password revokes every previously issued credential.
   * Missing values on legacy documents deliberately map to generation zero.
   */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  session_version: number;

  // Accept both the API role vocabulary (viewer/support/approver/superadmin)
  // and the admin-UI vocabulary (super_admin/admin/editor/viewer) that invited
  // accounts are created with. The admin UI maps either on login via fromApiRole.
  @Prop({
    type: String,
    enum: [
      'viewer',
      'support',
      'approver',
      'superadmin',
      'super_admin',
      'admin',
      'editor',
    ],
    required: false,
    default: 'viewer',
  })
  role: AdminRole | string;
}

export const UserAdminSchema = SchemaFactory.createForClass(UserAdmin);
