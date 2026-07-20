import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateAdminDto } from './create-admin.dto';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_TOP_BRANDS } from 'src/offer/top-brand.contract';
import {
  MAX_CUSTOM_TERMS_LENGTH,
  MAX_NOTE_TO_USER_LENGTH,
} from 'src/offer/offer-text-limits';
import {
  WITHDRAW_ADMIN_STATUSES,
  type WithdrawAdminStatus,
} from '../restore-withdraw-fee-coupon';

export const ADMIN_ASSIGNABLE_ROLES = [
  'viewer',
  'support',
  'approver',
  'superadmin',
  'super_admin',
  'admin',
  'editor',
] as const;

export type AdminAssignableRole = (typeof ADMIN_ASSIGNABLE_ROLES)[number];

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @ApiPropertyOptional({ enum: ADMIN_ASSIGNABLE_ROLES })
  @IsOptional()
  @IsIn(ADMIN_ASSIGNABLE_ROLES)
  role?: AdminAssignableRole;
}

export const FEE_MAX_CAP_MODES = ['percent', 'fixed'] as const;

export class FeeWithdrawRegionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id: string;

  @ApiProperty()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  countryCode: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z]{3,8}$/)
  currency: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeWithdraw: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumWithdraw: number;

  @ApiPropertyOptional({ enum: FEE_MAX_CAP_MODES })
  @IsOptional()
  @IsIn(FEE_MAX_CAP_MODES)
  max_cap_mode?: (typeof FEE_MAX_CAP_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  max_cap_percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_cap_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3,8}$/)
  max_cap_currency?: string;
}

export class UpdateFeeRateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  system?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  store?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_withdraw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_withdraw_thb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimum_withdraw_usd?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee_withdraw_thb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee_withdraw_usd?: number;

  @ApiPropertyOptional({ type: [FeeWithdrawRegionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => FeeWithdrawRegionDto)
  withdraw_regions?: FeeWithdrawRegionDto[];

  @ApiPropertyOptional({ enum: FEE_MAX_CAP_MODES })
  @IsOptional()
  @IsIn(FEE_MAX_CAP_MODES)
  global_max_cap_mode?: (typeof FEE_MAX_CAP_MODES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  global_max_cap_percent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  global_max_cap_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3,8}$/)
  global_max_cap_currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  global_withdraw_fee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  global_minimum_withdraw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3,8}$/)
  global_withdraw_currency?: string;
}

export class UpdateRequestWithdrawDto {
  @ApiProperty({ enum: WITHDRAW_ADMIN_STATUSES })
  @IsNotEmpty()
  @IsIn(WITHDRAW_ADMIN_STATUSES)
  status: WithdrawAdminStatus;

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
  product_type?: ProductTypeDto[] | string;

  /**
   * Admin Cashback Management sends product-type rows under this plural key
   * (JSON string via multipart FormData). Alias of `product_type`.
   */
  @ApiProperty({
    required: false,
    description:
      'JSON string of product-type rows (multipart FormData). Alias of product_type.',
  })
  @IsString()
  @IsOptional()
  product_types?: string;

  /**
   * When true, the offer uses a single all-products cashback rate; when false,
   * per-row product types drive the table (and usually the headline rate).
   */
  @ApiProperty({ required: false })
  @IsOptional()
  all_product_types?: boolean | string;

  /** Upsize event — multipart strings; controller coerces nullables (#471). */
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  upsize_start_date?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  upsize_end_date?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  upsize_start_time?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  upsize_end_time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  upsize_special_commission?: number | string;

  @ApiProperty({ required: false })
  @IsOptional()
  upsize_max_cap?: number | string;

  @ApiProperty({ required: false })
  @IsOptional()
  upsize_all_product_types?: boolean | string;

  @ApiProperty({
    required: false,
    description:
      'JSON string of upsize product-type rows (multipart FormData).',
  })
  @IsString()
  @IsOptional()
  upsize_product_types?: string;

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

  @ApiProperty({ required: false, enum: ['three_step', 'two_step'] })
  @IsIn(['three_step', 'two_step'])
  @IsOptional()
  flow_type?: 'three_step' | 'two_step';

  /** Editable step captions; empty string clears back to the default copy. */
  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  tracking_subtitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  confirm_subtitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  policy_category_id?: string;

  /** Cap mirrors the policy write path's MAX_TRANSLATION_LENGTH (50k). */
  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(MAX_CUSTOM_TERMS_LENGTH)
  @IsOptional()
  custom_terms?: string;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(MAX_NOTE_TO_USER_LENGTH)
  @IsOptional()
  note_to_user?: string;
}

export class UpdateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mobile: string;
}

/** Allowed sort keys for POST /admin/list-mycashback-users. */
export const MYCASHBACK_USER_SORTS = ['newest', 'name', 'balance'] as const;
export type MyCashbackUserSort = (typeof MYCASHBACK_USER_SORTS)[number];

/** Allowed status filters for POST /admin/list-mycashback-users. */
export const MYCASHBACK_USER_STATUSES = ['active', 'banned'] as const;
export type MyCashbackUserStatus = (typeof MYCASHBACK_USER_STATUSES)[number];

export const MYCASHBACK_USERS_DEFAULT_LIMIT = 12;
export const MYCASHBACK_USERS_MAX_LIMIT = 100;
export const MYCASHBACK_USERS_MAX_PAGE = 10_000;
export const MYCASHBACK_USERS_MAX_SEARCH_LENGTH = 100;

/** Body for POST /admin/list-mycashback-users (admin MyCashBack users table). */
export class ListMyCashbackUsersDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MYCASHBACK_USERS_MAX_PAGE)
  page?: number;

  @ApiProperty({ required: false, default: MYCASHBACK_USERS_DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MYCASHBACK_USERS_MAX_LIMIT)
  limit?: number;

  @ApiProperty({
    required: false,
    maxLength: MYCASHBACK_USERS_MAX_SEARCH_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MYCASHBACK_USERS_MAX_SEARCH_LENGTH)
  search?: string;

  @ApiProperty({
    required: false,
    enum: MYCASHBACK_USER_SORTS,
    default: 'newest',
  })
  @IsOptional()
  @IsIn([...MYCASHBACK_USER_SORTS, ''])
  sort?: MyCashbackUserSort | '';

  @ApiProperty({
    required: false,
    enum: [...MYCASHBACK_USER_STATUSES, ''],
    description: 'Derived account status filter',
  })
  @IsOptional()
  @IsIn([...MYCASHBACK_USER_STATUSES, ''])
  status?: MyCashbackUserStatus | '';
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
  image_1?: string | Express.Multer.File | null;
  image_2?: string | Express.Multer.File | null;
  image_3?: string | Express.Multer.File | null;
  image_4?: string | Express.Multer.File | null;
  image_5?: string | Express.Multer.File | null;
};

/** Specific-page carousels intentionally expose only their three visible slots. */
export class UpdateSpecificPageBannerBodyDto extends PickType(
  UpdateBannerHomeBodyDto,
  [
    'link_1',
    'link_2',
    'link_3',
    'enabled_1',
    'enabled_2',
    'enabled_3',
    'start_date_1',
    'start_date_2',
    'start_date_3',
    'end_date_1',
    'end_date_2',
    'end_date_3',
    'clear_image_1',
    'clear_image_2',
    'clear_image_3',
  ] as const,
) {}

export type UpdateSpecificPageBannerDto = UpdateSpecificPageBannerBodyDto & {
  image_1?: string | Express.Multer.File | null;
  image_2?: string | Express.Multer.File | null;
  image_3?: string | Express.Multer.File | null;
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

export class TopBrandConfigEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty()
  @IsString()
  cashback: string;
}

export class SaveTopBrandsDto {
  /**
   * Legacy single-list payload. When device lists are omitted, this value is
   * written to brands + brandsDesktop + brandsMobile.
   */
  @ApiProperty({ type: [TopBrandConfigEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TOP_BRANDS)
  @ValidateNested({ each: true })
  @Type(() => TopBrandConfigEntryDto)
  brands?: TopBrandConfigEntryDto[];

  /** #378 Phase 2 — desktop homepage order. */
  @ApiProperty({ type: [TopBrandConfigEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TOP_BRANDS)
  @ValidateNested({ each: true })
  @Type(() => TopBrandConfigEntryDto)
  brandsDesktop?: TopBrandConfigEntryDto[];

  /** #378 Phase 2 — mobile homepage order. */
  @ApiProperty({ type: [TopBrandConfigEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TOP_BRANDS)
  @ValidateNested({ each: true })
  @Type(() => TopBrandConfigEntryDto)
  brandsMobile?: TopBrandConfigEntryDto[];
}

export class GetConversionInWithdrawDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  data: number[];
}

export class CreateCategoryNameDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

/**
 * Body for POST /admin/create-category. The admin UI's `fetcherPost` tuple
 * quirk nests the JSON payload under `data` (`{ data: { name } }`); a flat
 * `{ name }` body is accepted too.
 */
export class CreateCategoryDto {
  @ApiProperty({ required: false, type: CreateCategoryNameDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCategoryNameDto)
  data?: CreateCategoryNameDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

/** Body fields for PATCH /admin/update-category/:id (JSON or multipart). */
export class UpdateCategoryBodyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
