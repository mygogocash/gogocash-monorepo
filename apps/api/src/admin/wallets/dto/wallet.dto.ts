import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Currency', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  reason: string;
}
