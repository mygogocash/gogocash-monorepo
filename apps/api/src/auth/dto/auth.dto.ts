import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
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

export class SignInFirebaseDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  referral_id: string;

  /**
   * Country preference. Canonical form is ISO-3166-1 alpha-2 ("TH"); the
   * service normalises legacy clients that still send full English names
   * ("Thailand") via `toIso2Server`. We keep the wire format permissive
   * (string up to 64 chars) until the migration burns in and all clients
   * are confirmed sending canonical values, then this becomes `@Length(2,2)`.
   */
  @ApiProperty({
    example: 'TH',
    description: 'ISO-3166-1 alpha-2 country code',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
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

export class PhoneLoginEligibilityDto {
  @ApiProperty({ example: '+66812345678' })
  @IsString()
  @MaxLength(16)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone_e164 must be a valid E.164 phone number',
  })
  phone_e164: string;
}

export class SignInAiDto {
  // @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class TelegramAuthDto {
  @ApiProperty({ example: 123456789 })
  @Type(() => Number)
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiProperty({ example: 1700000000 })
  @Type(() => Number)
  @IsNumber()
  auth_date: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hash: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referral_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;
}

/**
 * POST /auth/log-in/telegram-miniapp body — the RAW Telegram Mini App
 * `initData` query string (e.g. "user=%7B...%7D&auth_date=...&hash=..."). The
 * server verifies it with the WebAppData-keyed HMAC; do NOT pre-parse it on the
 * client, as the exact bytes are part of the signature check.
 */
export class TelegramMiniAppDto {
  @ApiProperty({
    example:
      'query_id=AA...&user=%7B%22id%22%3A1%7D&auth_date=1700000000&hash=abc',
    description: 'Raw Telegram Mini App initData query string',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  initData: string;
}

/** POST /auth/firebase body — phone verification idToken after FirebaseAuthGuard. */
export class FirebaseIdTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

/**
 * MiniPay SIWE (EIP-4361) sign-in payload. The client signs a message of the
 * standard SIWE shape inside MiniPay; the server verifies the signature
 * recovers the claimed address, that `Issued At` is fresh (≤ 5 min old), and
 * that `Nonce:` matches a server-issued single-use record in the
 * `siwenonces` collection.
 */
export class MiniPaySiweDto {
  @ApiProperty({ example: '0x1234…40 hex chars total' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]{40}$/, {
    message: 'address must be a 0x-prefixed 40-char hex string',
  })
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: '0x…130 hex chars (65-byte ECDSA)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[0-9a-fA-F]{130}$/, {
    message: 'signature must be a 0x-prefixed 130-char hex string',
  })
  signature: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referral_id?: string;
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
