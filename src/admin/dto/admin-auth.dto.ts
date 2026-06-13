import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Minimum admin password length. */
export const ADMIN_PASSWORD_MIN_LENGTH = 8;

/**
 * Role ids accepted on invite. Allowlisted (not free-form) so a caller cannot
 * inject an arbitrary string — both for privilege-escalation defence and so the
 * value is safe to interpolate into the invite email. Covers the API vocabulary
 * (viewer/support/approver/superadmin) and the admin-UI vocabulary
 * (super_admin/admin/editor/viewer) the UI sends.
 */
export const INVITABLE_ROLES = [
  'viewer',
  'support',
  'approver',
  'superadmin',
  'super_admin',
  'admin',
  'editor',
] as const;

export class InviteAdminUserDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: INVITABLE_ROLES, description: 'Role id to assign on accept' })
  @IsIn(INVITABLE_ROLES as unknown as string[])
  role: string;
}

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty()
  @IsString()
  @MinLength(ADMIN_PASSWORD_MIN_LENGTH)
  password: string;
}

export class AdminForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class AdminResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(ADMIN_PASSWORD_MIN_LENGTH)
  password: string;
}
