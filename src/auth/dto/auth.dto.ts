import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class SignInDto {
  @ApiProperty()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  id_crossmint: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  username?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  id_twitter?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  referral_id?: string;
}

export class SignUpDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignInFirebaseDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  referral_id: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  provider?: string;

  // Analytics & metadata (optional, will be stripped by whitelist)
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pathname?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  posthog_distinct_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  posthog_anonymous_id?: string;

  // Token should NOT be in body - it should be in Authorization header
  // But we accept it here and ignore it for compatibility
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  token?: string;
}

export class SignInAiDto {
  // @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class TelegramAuthDto {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  email?: string;
  referral_id?: string;
  country?: string;
}

export class LineAuthDto {
  @ApiProperty({ description: 'LINE User ID from LIFF' })
  @IsString()
  @IsNotEmpty()
  id_line: string;

  @ApiProperty({ description: 'LINE Display Name' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'LINE Profile Picture URL', required: false })
  @IsString()
  @IsOptional()
  picture_url?: string;

  @ApiProperty({
    description: 'User email for account pairing',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Referral ID', required: false })
  @IsString()
  @IsOptional()
  referral_id?: string;

  @ApiProperty({ description: 'Country', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'Whether email was verified via OTP',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  email_verified?: boolean;
}

/**
 * DTO for requesting OTP code
 * Used in POST /auth/email/request-otp
 */
export class RequestOtpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * DTO for verifying OTP code
 * Used in POST /auth/email/verify-otp
 */
export class VerifyOtpDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'OTP code is required' })
  otp: string;
}
