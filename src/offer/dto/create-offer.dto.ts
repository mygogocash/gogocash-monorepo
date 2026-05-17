import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateOfferDto {}

export class GetMyOfferDto {
  @IsNumber()
  limit: number;

  @IsNumber()
  page: number;
}

export class SaveMissingOrderDto {
  offer_id: string;
  orderId: string;
  purchaseDate: string;
  note: string;
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
  search: string;
}
