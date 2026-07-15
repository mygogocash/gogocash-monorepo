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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuestDto {
  @ApiProperty({ example: '', required: false })
  @IsOptional()
  @IsString()
  _id?: string;

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

  @ApiProperty({ example: '' })
  @IsString()
  banner_en: string;

  @ApiProperty({ example: '' })
  @IsString()
  banner_th: string;

  @ApiProperty({ example: '' })
  @IsString()
  sub_banner_en: string;

  @ApiProperty({ example: '' })
  @IsString()
  sub_banner_th: string;
}

export class CloseQuestDto {
  @ApiProperty({ example: 'open|close|scheduled' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['open', 'close', 'scheduled'])
  status: string;
}

export class QuestTaskDto {
  @ApiProperty({ example: '6942b79d7b9f8214ada6eed5' })
  @IsMongoId()
  offer: string;

  @ApiProperty({ example: 803 })
  @IsInt()
  offer_id: number;

  @ApiProperty({ example: 1604 })
  @IsInt()
  merchant_id: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(2)
  @Max(10000)
  extra_point: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    example: 'Make an order on Klook Travel',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  wording?: string;

  @ApiProperty({
    example: 'Make an order on Klook Travel',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  wording_en?: string;

  @ApiProperty({
    example: 'สั่งซื้อที่ Klook Travel',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  wording_th?: string;

  @ApiProperty({ example: 'June Klook campaign', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuestTasksDto {
  @ApiProperty({ type: [QuestTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestTaskDto)
  tasks: QuestTaskDto[];
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
