import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {}

export class UpdateFeeRateDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  system: number;

  @ApiProperty()
  @IsString()
  store: number;

  @ApiProperty()
  @IsString()
  minimum_withdraw: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  minimum_withdraw_thb: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  minimum_withdraw_usd: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fee_withdraw_thb: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fee_withdraw_usd: number;
}

export class UpdateRequestWithdrawDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class ProductTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  minimum: string;
}
export class UpdateOfferAdminDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  logo_desktop: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  logo_mobile: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  banner: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  banner_mobile: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  logo_circle: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  offer_name_display: string;

  @ApiProperty()
  @IsOptional()
  disabled: boolean | string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lookup_value?: string;

  @ApiProperty({
    required: false,
    description:
      'JSON string of admin merchandising tags (multipart FormData).',
  })
  @IsString()
  @IsOptional()
  offer_display_tags?: string;

  @ApiProperty()
  @IsOptional()
  commission_store: number;

  @ApiProperty()
  @IsOptional()
  max_cap: number;

  @ApiProperty()
  @IsOptional()
  extra_store: boolean | string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  tracking_link: string;

  @ApiProperty({ type: [ProductTypeDto] })
  @IsOptional()
  product_type: ProductTypeDto[];

  @ApiProperty({ required: false, enum: ['auto', 'manual'] })
  @IsIn(['auto', 'manual'])
  @IsOptional()
  tracking_period_mode?: 'auto' | 'manual';

  /** Multipart day counts arrive as strings; the controller coerces + bounds-checks. */
  @ApiProperty({ required: false })
  @IsOptional()
  tracking_days?: number | string;

  @ApiProperty({ required: false })
  @IsOptional()
  confirm_days?: number | string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  policy_category_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  custom_terms?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note_to_user?: string;
}

export class UpdateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mobile: string;
}

export class UpdateBannerHomeBodyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link_1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link_2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link_3?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link_4?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link_5?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  enabled_1?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  enabled_2?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  enabled_3?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  enabled_4?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  enabled_5?: boolean | string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_date_1?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_date_2?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_date_3?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_date_4?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  start_date_5?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_date_1?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_date_2?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_date_3?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_date_4?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  end_date_5?: string;

  @ApiProperty({
    required: false,
    description: 'When true, removes the stored image for slot 1.',
  })
  @IsOptional()
  clear_image_1?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  clear_image_2?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  clear_image_3?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  clear_image_4?: boolean | string;

  @ApiProperty({ required: false })
  @IsOptional()
  clear_image_5?: boolean | string;
}

/** Merged multipart payload (body fields + uploaded files). Not validated on @Body(). */
export type UpdateBannerHomeDto = UpdateBannerHomeBodyDto & {
  image_1?: string | File | null;
  image_2?: string | File | null;
  image_3?: string | File | null;
  image_4?: string | File | null;
  image_5?: string | File | null;
};

/**
 * Payload for approving a pending offer. No body fields are required today;
 * the admin user id and timestamp are derived from the authenticated request.
 * Kept as an explicit class so Swagger docs and future extensions (e.g. audit
 * notes) have a stable surface.
 */
export class ApproveOfferDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

/** Payload for rejecting a pending offer. Reason is required so the admin
 *  decision is auditable and can be surfaced on the offer detail view. */
export class RejectOfferDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  reason: string;
}
