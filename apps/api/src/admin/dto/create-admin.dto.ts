import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Dead stub create-admin body. Empty class is intentional — the route returns
 * a string and writes nothing. Decorators are absent on purpose; under
 * whitelist + forbidNonWhitelisted an empty body `{}` is accepted and any
 * unexpected field is rejected (#46).
 */
export class CreateAdminDto {}

export class LoginAdminDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;

  /**
   * "Keep me logged in": when true the issued admin token lasts 30 days instead
   * of the 7-day default (paired with the NextAuth session maxAge in the panel).
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class RegisterAdminDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  username: string;
}
