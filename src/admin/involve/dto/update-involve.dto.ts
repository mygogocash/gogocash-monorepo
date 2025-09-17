import { PartialType } from '@nestjs/swagger';
import { OfferDto } from './create-involve.dto';

export class UpdateInvolveDto extends PartialType(OfferDto) {}
