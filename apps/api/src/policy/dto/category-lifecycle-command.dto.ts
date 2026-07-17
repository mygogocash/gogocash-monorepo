import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CategoryLifecycleCommandDto {
  @ApiProperty({ description: 'Client-generated idempotency key.' })
  @IsString()
  @MinLength(8)
  @MaxLength(160)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  request_key!: string;

  @ApiProperty({ description: 'Category revision shown by the editor.' })
  @IsInt()
  @Min(1)
  expected_revision!: number;
}
