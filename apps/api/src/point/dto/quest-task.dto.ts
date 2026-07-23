import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const QUEST_TASK_TYPES = [
  'brand_purchase',
  'friend_referral',
  'spend_target',
] as const;

export type QuestTaskType = (typeof QUEST_TASK_TYPES)[number];

export abstract class BaseQuestTaskDto {
  @ApiProperty({ enum: QUEST_TASK_TYPES })
  @IsIn(QUEST_TASK_TYPES)
  task_type: QuestTaskType;

  @ApiProperty({ required: false, readOnly: true })
  @IsOptional()
  @IsString()
  @Matches(/^task_[A-Za-z0-9_-]{12,80}$/)
  task_key?: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10000)
  points: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  wording?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  wording_en?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  wording_th?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class BrandPurchaseQuestTaskDto extends BaseQuestTaskDto {
  @ApiProperty({ enum: ['brand_purchase'] })
  @IsIn(['brand_purchase'])
  declare task_type: 'brand_purchase';

  @ApiProperty({ example: '6942b79d7b9f8214ada6eed5' })
  @IsMongoId()
  offer: string;
}

export class FriendReferralQuestTaskDto extends BaseQuestTaskDto {
  @ApiProperty({ enum: ['friend_referral'] })
  @IsIn(['friend_referral'])
  declare task_type: 'friend_referral';

  @ApiProperty({ enum: ['account_created', 'first_earning_conversion'] })
  @IsIn(['account_created', 'first_earning_conversion'])
  completion_rule: 'account_created' | 'first_earning_conversion';
}

export class SpendTargetQuestTaskDto extends BaseQuestTaskDto {
  @ApiProperty({ enum: ['spend_target'] })
  @IsIn(['spend_target'])
  declare task_type: 'spend_target';

  @ApiProperty({ enum: ['any_shop_via_ggc'] })
  @IsIn(['any_shop_via_ggc'])
  spend_scope: 'any_shop_via_ggc';

  @ApiProperty({ example: 150000, description: 'Target in Thai satang.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  target_thb_minor: number;
}

export type QuestTaskDto =
  | BrandPurchaseQuestTaskDto
  | FriendReferralQuestTaskDto
  | SpendTargetQuestTaskDto;

export class QuestAudienceBaseDto {
  @ApiProperty({ enum: ['all', 'membership_tiers'] })
  @IsIn(['all', 'membership_tiers'])
  kind: 'all' | 'membership_tiers';
}

export class QuestAllAudienceDto extends QuestAudienceBaseDto {
  @ApiProperty({ enum: ['all'] })
  @IsIn(['all'])
  declare kind: 'all';
}

export class QuestMembershipTierAudienceDto extends QuestAudienceBaseDto {
  @ApiProperty({ enum: ['membership_tiers'] })
  @IsIn(['membership_tiers'])
  declare kind: 'membership_tiers';

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsMongoId({ each: true })
  @MaxLength(80, { each: true })
  tier_ids: string[];
}

export type QuestAudienceDto =
  QuestAllAudienceDto | QuestMembershipTierAudienceDto;

export class QuestRewardCapsDto {
  @ApiProperty({ example: 1, nullable: true, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  max_awards_per_user?: number | null;

  @ApiProperty({ example: 10, nullable: true, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  max_referrals_per_user?: number | null;
}

export class UpdateQuestTasksDto {
  @ApiProperty({ enum: ['legacy_v1', 'task_v2'] })
  @IsIn(['legacy_v1', 'task_v2'])
  reward_model: 'legacy_v1' | 'task_v2';

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expected_config_revision: number;

  @ApiProperty({ enum: ['Asia/Bangkok'] })
  @IsIn(['Asia/Bangkok'])
  timezone: 'Asia/Bangkok';

  @ApiProperty({
    oneOf: [
      { $ref: '#/components/schemas/QuestAllAudienceDto' },
      { $ref: '#/components/schemas/QuestMembershipTierAudienceDto' },
    ],
  })
  @ValidateNested()
  @Type(() => QuestAudienceBaseDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'kind',
      subTypes: [
        { name: 'all', value: QuestAllAudienceDto },
        { name: 'membership_tiers', value: QuestMembershipTierAudienceDto },
      ],
    },
  })
  audience: QuestAudienceDto;

  @ApiProperty({ type: QuestRewardCapsDto })
  @ValidateNested()
  @Type(() => QuestRewardCapsDto)
  reward_caps: QuestRewardCapsDto;

  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/BrandPurchaseQuestTaskDto' },
        { $ref: '#/components/schemas/FriendReferralQuestTaskDto' },
        { $ref: '#/components/schemas/SpendTargetQuestTaskDto' },
      ],
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseQuestTaskDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'task_type',
      subTypes: [
        { name: 'brand_purchase', value: BrandPurchaseQuestTaskDto },
        { name: 'friend_referral', value: FriendReferralQuestTaskDto },
        { name: 'spend_target', value: SpendTargetQuestTaskDto },
      ],
    },
  })
  tasks: QuestTaskDto[];
}
