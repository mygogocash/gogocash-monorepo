import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}

export class UpdateFeeRateDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  system: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  store: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  minimum_withdraw: number;
}

export class UpdateRequestWithdrawDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class UpdateOfferAdminDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  logo_desktop: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  logo_mobile: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  banner: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  banner_mobile: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  logo_circle: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  offer_name_display: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  disabled: boolean;

  @ApiProperty()
  @IsOptional()
  commission_store: number;

  @ApiProperty()
  @IsOptional()
  max_cap: number;
}
