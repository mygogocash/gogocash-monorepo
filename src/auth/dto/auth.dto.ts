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
