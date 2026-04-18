import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

/**
 * MiniPay SIWE (EIP-4361) sign-in payload. The client signs a message of the
 * standard SIWE shape inside MiniPay; the server verifies the signature
 * recovers the claimed address and that `Issued At` is fresh (≤ 5 min old).
 * No server-issued nonce in this MVP — we rely on the timestamp window for
 * replay protection. Tightening to a server nonce is a follow-up.
 */
export class MiniPaySiweDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referral_id?: string;
}
