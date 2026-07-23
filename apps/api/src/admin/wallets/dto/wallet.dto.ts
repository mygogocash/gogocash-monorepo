import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  IsNumberString,
  IsPositive,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class WalletQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Search by email or username' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100)
  search?: string;
}

export class WalletAdjustDto {
  @ApiProperty({
    description: 'Adjustment type',
    enum: ['credit', 'debit'],
  })
  @IsIn(['credit', 'debit'])
  type: string;

  @ApiProperty({ description: 'Amount to adjust' })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  @Max(100_000_000)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency',
    default: 'USD',
    enum: ['THB', 'USD'],
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['THB', 'USD'])
  currency?: 'THB' | 'USD';

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
