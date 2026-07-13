import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Legacy create-offer body stub. Admin offer writes use UpdateOfferAdminDto /
 * multipart routes instead. Empty class is intentional — under whitelist +
 * forbidNonWhitelisted only `{}` is accepted (#46).
 */
export class CreateOfferDto {}

export class GetMyOfferDto {
  @IsNumber()
  limit: number;

  @IsNumber()
  page: number;
}

export class SaveMissingOrderDto {
  @ApiProperty()
  @IsString()
  offer_id: string;

  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  purchaseDate: string;

  @ApiProperty()
  @IsString()
  note: string;

  @ApiProperty()
  @IsString()
  amount: string;
}

export class GetMissingOrderDto {
  @ApiProperty({ required: true, default: 10 })
  @IsNumber()
  limit: number;

  @ApiProperty({ required: true, default: 1 })
  @IsNumber()
  page: number;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  search?: string;
}
