import { IsNumber } from 'class-validator';

export class CreateOfferDto {}

export class GetMyOfferDto {
  @IsNumber()
  limit: number;

  @IsNumber()
  page: number;
}
