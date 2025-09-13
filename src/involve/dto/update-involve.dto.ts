import { PartialType } from '@nestjs/swagger';
import { CreateInvolveDto } from './create-involve.dto';

export class UpdateInvolveDto extends PartialType(CreateInvolveDto) {}
