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
  @IsString()
  store: number;

  @ApiProperty()
  @IsString()
  minimum_withdraw: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  minimum_withdraw_thb: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  minimum_withdraw_usd: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fee_withdraw_thb: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fee_withdraw_usd: number;
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

export class ProductTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  minimum: string;
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

  @ApiProperty()
  @IsOptional()
  extra_store: boolean | string;

  @ApiProperty({ type: [ProductTypeDto] })
  @IsOptional()
  product_type: ProductTypeDto[];
}

export class UpdateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mobile: string;
}

export class UpdateBannerHomeDto {
  @ApiProperty()
  @IsString()
  link_1: string;

  @ApiProperty()
  @IsString()
  image_1: string | File | null;

  @ApiProperty()
  @IsString()
  link_2: string;

  @ApiProperty()
  @IsString()
  image_2: string | File | null;

  @ApiProperty()
  @IsString()
  link_3: string;

  @ApiProperty()
  @IsString()
  image_3: string | File | null;

  @ApiProperty()
  @IsString()
  link_4: string;

  @ApiProperty()
  @IsString()
  image_4: string | File | null;

  @ApiProperty()
  @IsString()
  link_5: string;

  @ApiProperty()
  @IsString()
  image_5: string | File | null;
}
