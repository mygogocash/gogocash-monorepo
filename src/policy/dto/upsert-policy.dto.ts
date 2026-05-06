import { Type } from 'class-transformer';
import {
  IsIn,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ALLOWED_POLICY_LOCALES } from '../schemas/policy.schema';

const ALLOWED = [...ALLOWED_POLICY_LOCALES] as string[];

/**
 * One block of policy text. Locale validation (keys must be in
 * ALLOWED_POLICY_LOCALES) and "at least one non-empty translation" are
 * enforced in the service rather than via class-validator decorators —
 * Record<string, string> doesn't have a clean shape-aware decorator path.
 */
export class PolicyContentDto {
  @ApiProperty({ enum: ALLOWED })
  @IsString()
  @IsIn(ALLOWED, {
    message: `primary_locale must be one of: ${ALLOWED.join(', ')}`,
  })
  primary_locale!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { th: 'ข้อกำหนด...', en: 'Terms...' },
  })
  @IsObject()
  translations!: Record<string, string>;

  @ApiPropertyOptional({ enum: ['template', 'template_plus', 'custom'] })
  @IsOptional()
  @IsIn(['template', 'template_plus', 'custom'])
  content_source?: 'template' | 'template_plus' | 'custom';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  template_id?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  additional_terms?: Record<string, string>;
}

/**
 * Upsert payload — at least one of `banner` or `terms` should be present.
 * Both being absent is allowed (no-op upsert) but pointless; the service
 * doesn't reject it because partial saves (e.g. "save banner only") are a
 * valid editor flow.
 */
export class UpsertPolicyDto {
  @ApiProperty()
  @IsMongoId()
  category_id!: string;

  @ApiPropertyOptional({ type: PolicyContentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyContentDto)
  banner?: PolicyContentDto;

  @ApiPropertyOptional({ type: PolicyContentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyContentDto)
  terms?: PolicyContentDto;
}
