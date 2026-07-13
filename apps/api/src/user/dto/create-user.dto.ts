import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Shared user shape used by internal create helpers and as the base for
 * UpdateUserDto (PartialType). Every field carries class-validator decorators
 * so ValidationPipe whitelist / forbidNonWhitelisted can keep self-service
 * profile updates (#46).
 */
export class CreateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_crossmint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_twitter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  birthdate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_firebase?: string;

  /** ISO-3166-1 alpha-2 (canonicalised in `UserService.withCanonicalCountry`). */
  @ApiProperty({ required: false, example: 'TH' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_telegram?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_line?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  email_verified?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id_card?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  passport?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legal_address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email_mcb?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}

export class UpdateCountryDto {
  /** ISO-3166-1 alpha-2 (canonicalised in `UserService.updateCountry`). */
  @ApiProperty({ example: 'TH' })
  @IsString()
  @MaxLength(64)
  country: string;
}
