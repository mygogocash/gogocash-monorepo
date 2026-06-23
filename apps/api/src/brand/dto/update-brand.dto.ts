import { PartialType } from '@nestjs/swagger';
import { CreateBrandDto } from './create-brand.dto';

/**
 * `PATCH /brand/:id` — every field on `CreateBrandDto` is optional here.
 * Slug is technically updatable but the service guards uniqueness.
 */
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
