import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import { IsNotEmpty, IsString } from 'class-validator';

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
  @IsNotEmpty()
  @IsString()
  logo_desktop: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  logo_mobile: string;
}
