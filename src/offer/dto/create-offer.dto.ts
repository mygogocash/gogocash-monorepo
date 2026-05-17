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
}
