import {
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Search by user email, username, or offer name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: ['conversion', 'withdrawal'],
  })
  @IsOptional()
  @IsIn(['conversion', 'withdrawal'])
  type?: string;

  @ApiPropertyOptional({
    description:
      'Filter by status (e.g. pending, approved, completed, rejected)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class FlagTransactionDto {
  @ApiProperty({
    description: 'Transaction type',
    enum: ['conversion', 'withdrawal'],
  })
  @IsIn(['conversion', 'withdrawal'])
  type: string;

  @ApiProperty({ description: 'Whether the transaction is flagged' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  flagged: boolean;

  @ApiProperty({ description: 'Reason for flagging or unflagging' })
  @IsString()
  reason: string;
}
