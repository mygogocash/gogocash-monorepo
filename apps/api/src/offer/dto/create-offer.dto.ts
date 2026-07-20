import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsNotEmpty({ message: 'Brand (offer) is required.' })
  offer_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required.' })
  orderId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Purchase date is required.' })
  purchaseDate: string;

  @ApiProperty()
  @IsString()
  note: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Amount is required.' })
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
