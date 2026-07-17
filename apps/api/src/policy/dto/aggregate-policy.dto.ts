import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CATEGORY_ICON_KEYS } from 'src/offer/schemas/category.schema';

export class AggregatePolicyCommandDto {
  @ApiProperty({ description: 'Client-generated idempotency key.' })
  @IsString()
  @MinLength(8)
  @MaxLength(160)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  request_key!: string;

  @ApiPropertyOptional({
    description: 'Present when editing an existing category.',
  })
  @IsOptional()
  @IsMongoId()
  category_id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  category_name!: string;

  @ApiProperty({ enum: CATEGORY_ICON_KEYS })
  @IsString()
  @IsIn(CATEGORY_ICON_KEYS)
  icon_key!: (typeof CATEGORY_ICON_KEYS)[number];

  @ApiProperty({
    description:
      'JSON-encoded legacy-compatible UpsertPolicyDto. Multipart keeps the single optional Default banner file in the same command.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(300_000)
  policy!: string;
}
