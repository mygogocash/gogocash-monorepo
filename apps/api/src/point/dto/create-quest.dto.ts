import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
export { UpdateQuestTasksDto } from './quest-task.dto';

export class CreateQuestDto {
  @ApiProperty({ example: '', required: false })
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiProperty({ example: 'quest-media:8c296a30-53c0-4de6-87df-b99d984d791a' })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,255}$/)
  request_key: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  campaign_revision: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_config_revision: number;

  @ApiProperty({
    example: 'quest-media-qa:2026-07-17-unique-marker',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^quest-media-qa:[A-Za-z0-9._:-]{8,180}$/)
  qa_marker?: string;

  @ApiProperty({ required: false, writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  qa_cleanup_nonce?: string;

  @ApiProperty({ example: '2024-01-01' })
  @Type(() => Date)
  @IsDate()
  start_date: Date;

  @ApiProperty({ example: '2024-01-31' })
  @Type(() => Date)
  @IsDate()
  end_date: Date;

  @ApiProperty({ example: 'open|close|scheduled', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['open', 'close', 'scheduled'])
  status?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  reward_status?: boolean;

  @ApiProperty({ example: '' })
  @IsString()
  facebook_post: string;

  @ApiProperty({ example: '' })
  @IsString()
  facebook_page: string;

  @ApiProperty({ example: '' })
  @IsString()
  line: string;
}

export class QuestMediaQaCleanupDto {
  @ApiProperty({ example: '66a8a48f2c8de0e641e17424' })
  @IsMongoId()
  quest_id: string;

  @ApiProperty({ example: 'quest-media:qa:2026-07-17-command' })
  @IsString()
  @Matches(/^quest-media:qa:[A-Za-z0-9._:-]{8,180}$/)
  request_key: string;

  @ApiProperty({ example: 'quest-media-qa:2026-07-17-unique-marker' })
  @IsString()
  @Matches(/^quest-media-qa:[A-Za-z0-9._:-]{8,180}$/)
  qa_marker: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  cleanup_nonce: string;
}

export class CloseQuestDto {
  @ApiProperty({ example: 'open|close|scheduled' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['open', 'close', 'scheduled'])
  status: string;
}

export class QuestRewardDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  rank: number;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  reward: number;

  @ApiProperty({ example: 'THB', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;
}

export class UpdateQuestRewardsDto {
  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_config_revision: number;

  @ApiProperty({ type: [QuestRewardDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestRewardDto)
  rewards: QuestRewardDto[];

  @ApiProperty({
    example: 'after_days',
    required: false,
    enum: ['manual', 'campaign_end', 'after_days'],
  })
  @IsOptional()
  @IsIn(['manual', 'campaign_end', 'after_days'])
  reward_distribution_mode?: 'manual' | 'campaign_end' | 'after_days';

  @ApiProperty({ example: 7, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  @Type(() => Number)
  reward_distribution_delay_days?: number;
}
