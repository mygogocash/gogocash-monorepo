import { PartialType } from '@nestjs/swagger';
import { CreateOfferDto } from './create-offer.dto';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}

export class UpdateCouponDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  offer_id: string | Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  start_date: string;

  @IsNotEmpty()
  @IsString()
  end_date: string;

  @IsString()
  eligibility: string;

  @IsString()
  min_spend: string;

  @IsNumber()
  discount: number;

  @IsString()
  id: string;

  @IsString()
  disabled: string | boolean;

  @IsNumber()
  quantity: number;

  @IsString()
  link: string;
}
