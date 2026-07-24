import { ApiProperty, PickType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
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

/**
 * Existing quest campaign edits take their identity from the URL and expose
 * only operator-editable campaign fields. `_id` is deliberately excluded from
 * this multipart body contract. The optional QA marker/nonce pair is accepted
 * only so the staging-only acceptance harness can exercise this exact PATCH
 * route; PointService rejects it unless the guarded QA mode is enabled.
 */
export class UpdateQuestCampaignDto extends PickType(CreateQuestDto, [
  'request_key',
  'campaign_revision',
  'expected_config_revision',
  'qa_marker',
  'qa_cleanup_nonce',
  'start_date',
  'end_date',
  'facebook_post',
  'facebook_page',
  'line',
] as const) {}

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
  @ApiProperty({ example: '66a8a48f2c8de0e641e17424' })
  @IsMongoId()
  quest_id: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_campaign_revision: number;

  @ApiProperty({ example: 'close', enum: ['close'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['close'])
  status: 'close';
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

export class CreateQuestRevisionDto {
  @ApiProperty({ example: 'quest-revision:2026-08-launch' })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,255}$/)
  request_key: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_campaign_revision: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_config_revision: number;

  @ApiProperty({ example: '2026-08-01T00:00:00.000+07:00' })
  @Type(() => Date)
  @IsDate()
  start_date: Date;

  @ApiProperty({ example: '2026-08-31T23:59:59.999+07:00' })
  @Type(() => Date)
  @IsDate()
  end_date: Date;

  @ApiProperty({ example: 'Prepare the next monthly campaign.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  reason: string;
}

export class PublishQuestRevisionDto {
  @ApiProperty({ example: 'quest-publish:2026-08-launch' })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,255}$/)
  request_key: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_campaign_revision: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_config_revision: number;
}
