import { IsOptional, IsString, IsNumberString } from 'class-validator';
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
    description:
      'Filter by status (pending, investigating, approved, rejected)',
  })
  @IsOptional()
  @IsString()
  status?: string;
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
