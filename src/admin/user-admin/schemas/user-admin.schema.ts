import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserAdminDocument = HydratedDocument<UserAdmin>;

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

export function roleHasAccess(
  actual: AdminRole | undefined | null,
  required: AdminRole,
): boolean {
  // Backward compatibility: existing admin accounts have no role field.
  // Treat them as superadmin so this rollout doesn't lock anyone out.
  // New accounts must be created with an explicit role.
  const a = (actual ?? 'superadmin') as AdminRole;
  return (ROLE_RANK[a] ?? -1) >= ROLE_RANK[required];
}

@Schema({ timestamps: true })
export class UserAdmin {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    type: String,
    enum: ['viewer', 'support', 'approver', 'superadmin'],
    required: false,
  })
  role: AdminRole;
}

export const UserAdminSchema = SchemaFactory.createForClass(UserAdmin);
