import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SendUserContactOtpDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty({ enum: ['email', 'mobile'] })
  @IsIn(['email', 'mobile'])
  channel: 'email' | 'mobile';

  /** Inserted contact value (new email/phone), not the user's previous one. */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  target: string;
}

export class VerifyUserContactOtpDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty({ enum: ['email', 'mobile'] })
  @IsIn(['email', 'mobile'])
  channel: 'email' | 'mobile';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  target: string;

  @ApiProperty({ description: '6-digit OTP' })
  @IsString()
  @Matches(/^\d{6}$/)
  otp: string;
}

/** Admin withdraw-detail profile save (mock parity). */
export class UpdateWithdrawUserDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  emails?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  mobiles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  birthdate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  wallet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gogopassActive?: boolean;
}
