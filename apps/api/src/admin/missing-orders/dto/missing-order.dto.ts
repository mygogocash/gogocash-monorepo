import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MissingOrderQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (pending, under_review, approved, rejected)',
  })
  @IsOptional()
  @IsIn(['pending', 'under_review', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search claim, customer, or merchant' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Submitted at or after this ISO date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Submitted at or before this ISO date' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ApproveRejectDto {
  @ApiPropertyOptional({ description: 'Resolution note' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignDto {
  @ApiProperty({ description: 'Admin ID to assign to' })
  @IsString()
  admin_id: string;
}

export class AddNoteDto {
  @ApiProperty({ description: 'Note text' })
  @IsString()
  text: string;
}
