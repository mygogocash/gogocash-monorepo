import {
  BadRequestException,
  ConflictException,
  Inject,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Model, Types } from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { Offer, OfferDocument } from 'src/offer/schemas/offer.schema';
import { User } from 'src/user/schemas/user.schema';
import { GetMyOfferDto, SaveMissingOrderDto } from './dto/create-offer.dto';
import { join } from 'path';
import { promises as fs } from 'fs';
import { Category } from './schemas/category.schema';
import { CategoryIntegrityService } from 'src/policy/category-integrity.service';
import { PolicyMediaAssetRegistryService } from 'src/policy/policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from 'src/policy/policy-media-cleanup.service';
import {
  PolicyMediaWriteService,
  policyMediaWritePayloadHash,
  type PolicyMediaWriteAssets,
} from 'src/policy/policy-media-write.service';
import { FavoriteOffer } from './schemas/favorite-offer.schema';
import { ALL_BRAND_BANNER_MODEL, Banner } from './schemas/banner.schema';
import { SPECIFIC_PAGE_BANNER_MODEL } from './schemas/specific-page-banner.schema';
import { requireSpecificPageBannerTarget } from './specific-page-banner.contract';
import { TopBrandConfig } from './schemas/top-brand-config.schema';
import { LandingRailConfig } from './schemas/landing-rail-config.schema';
import { Coupon } from './schemas/coupon.schema';
import { UpdateCouponDto } from './dto/update-offer.dto';
import { MissionOrder } from './schemas/missing-order.schema';
import {
  type CommandOwnedStoredMediaAsset,
  StoredMediaService,
} from 'src/media/stored-media.service';
import { MEDIA_FOLDER, type MediaFolder } from 'src/media/media-folders.config';
import { parseOfferDisplayTagsField } from './offer-display-tags.util';
import { parseProductTypeRowsField } from './product-type.util';
import { resolvePublicOfferLogo } from './offer-logo.util';
import { Quest, QuestTask } from 'src/point/schemas/quest.schema';
import { effectiveQuestRewardModel } from 'src/point/quest-task.contract';
import { activeQuestFilter } from 'src/point/quest-active-filter';
import { FeaturedSearchTerm } from 'src/admin/search/schemas/featured-term.schema';
import { SearchBoostRule } from 'src/admin/search/schemas/boost-rule.schema';
import { SearchBlacklist } from 'src/admin/search/schemas/blacklist.schema';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { countryFilterRegex } from 'src/utils/country';
import { requireObjectId, mongoSetUpdate } from 'src/common/mongo-query';
import {
  coerceOptionalDayCount,
  resolveTrackingPeriod,
} from './tracking-period.util';
import {
  MAX_CUSTOM_TERMS_LENGTH,
  MAX_NOTE_TO_USER_LENGTH,
  MAX_TRACKING_SUBTITLE_LENGTH,
} from './offer-text-limits';
import { rankOffersWithSearchRules } from './search-ranking';
import { normalizeSearchRuleKeywords } from 'src/admin/search/search-rule.contract';
import {
  resolveDeviceBrandEntries,
  resolveOfferCashbackLabel,
} from './top-brand.contract';
import {
  DEFAULT_LANDING_RAIL_CARD_VARIANT,
  normalizeLandingRailMeta,
  sortLandingRails,
} from './landing-rail.contract';
import { syncOfferTopBrandMembership } from './top-brand-membership';
import { MISSION_ORDER_SCHEMA_VERSION } from './schemas/missing-order.schema';
import {
  buildMissionOrderCustomerSnapshot,
  buildMissionOrderDedupeKey,
  MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE,
  toCustomerMissionOrderClaim,
} from './mission-order.contract';

const ACTIVE_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
};

// #498 — Top Brands rail always shows at least this many; short admin curation
// is auto-filled with the highest-conversion brands.
const MIN_TOP_BRANDS = 10;
const TOP_BRAND_CARD_FIELDS =
  'offer_id offer_name offer_name_display logo logo_desktop logo_mobile logo_circle commission_store commissions';
// Conversion-ranking window + cache for the fill (aggregation runs at most once
// per TTL, not per homepage request).
const TOP_BRAND_FILL_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const TOP_BRAND_FILL_CANDIDATES = 50;
const TOP_BRAND_FILL_CACHE_KEY = 'top_brand_conversion_fill_v1';
const TOP_BRAND_FILL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type TopBrandCard = {
  _id: string;
  offer_id: number;
  brand: string;
  logo: string;
  cashback: string;
};

/** Map a selected/ranked offer document to a public Top Brands card. */
function toTopBrandCard(offer: unknown): TopBrandCard {
  const row = offer as {
    _id: unknown;
    offer_id: number;
    offer_name: string;
    offer_name_display?: string;
    logo?: string;
    logo_desktop?: string;
    logo_mobile?: string;
    logo_circle?: string;
    commission_store?: unknown;
    commissions?: unknown[];
  };
  return {
    _id: String(row._id),
    offer_id: row.offer_id,
    brand: row.offer_name_display?.trim() || row.offer_name,
    logo: resolvePublicOfferLogo(row),
    cashback: resolveOfferCashbackLabel(row),
  };
}

/** Append fill cards (already ranked) to a curated list, up to `min`, de-duped by _id. */
function appendTopBrandFill(
  curated: TopBrandCard[],
  fill: TopBrandCard[],
  min: number,
): TopBrandCard[] {
  if (curated.length >= min) return curated;
  const seen = new Set(curated.map((card) => card._id));
  const out = [...curated];
  for (const card of fill) {
    if (out.length >= min) break;
    if (seen.has(card._id)) continue;
    seen.add(card._id);
    out.push(card);
  }
  return out;
}

function commandOwnedOfferAssets(
  offer: Record<string, unknown>,
): CommandOwnedStoredMediaAsset[] {
  const assets = new Map<string, CommandOwnedStoredMediaAsset>();
  for (const field of ['logo_asset', 'banner_asset'] as const) {
    const value = offer[field];
    if (value == null) continue;
    if (
      typeof value !== 'object' ||
      (value as { provider?: unknown }).provider !== 'r2' ||
      (value as { ownership?: unknown }).ownership !== 'command-owned' ||
      typeof (value as { owner_key?: unknown }).owner_key !== 'string' ||
      typeof (value as { owner_attempt_token?: unknown })
        .owner_attempt_token !== 'string' ||
      typeof (value as { url?: unknown }).url !== 'string' ||
      typeof (value as { bucket?: unknown }).bucket !== 'string' ||
      typeof (value as { object_key?: unknown }).object_key !== 'string' ||
      typeof (value as { sha256?: unknown }).sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test((value as { sha256: string }).sha256) ||
      typeof (value as { original_name?: unknown }).original_name !== 'string'
    ) {
      throw new ConflictException(
        'Offer contains invalid tracked media proof; deletion was refused',
      );
    }
    const asset = value as CommandOwnedStoredMediaAsset;
    assets.set(asset.object_key, asset);
  }
  return [...assets.values()];
}

const PUBLIC_OFFER_DETAIL_FIELDS = [
  '_id',
  'offer_id',
  'merchant_id',
  'offer_name',
  'description',
  'preview_url',
  'currency',
  'logo',
  'categories',
  'countries',
  'commissions',
  'tracking_link',
  'commission_tracking',
  'tracking_type',
  'directory_page',
  'logo_desktop',
  'logo_mobile',
  'offer_name_display',
  'banner',
  'logo_circle',
  'commission_store',
  'max_cap',
  'banner_mobile',
  'extra_store',
  'extra_point',
  'product_type',
  'all_product_types',
  'upsize_start_date',
  'upsize_end_date',
  'upsize_start_time',
  'upsize_end_time',
  'upsize_special_commission',
  'upsize_max_cap',
  'upsize_all_product_types',
  'upsize_product_types',
  'source',
  'brand_id',
  'is_global',
  'default_country',
  'policy_category_id',
  'custom_terms',
  'note_to_user',
  'offer_display_tags',
] as const;
// Selected for the tracking_period derivation only — never whitelisted into
// the response (pickPublicOfferDetail filters them back out).
const OFFER_DETAIL_DERIVATION_FIELDS = [
  'validation_terms',
  'tracking_period_mode',
  'tracking_days',
  'confirm_days',
  'flow_type',
  'tracking_subtitle',
  'confirm_subtitle',
] as const;
// Exclusion projection for the public LIST endpoints (which otherwise return
// whole docs): raw tracking-period config stays admin-only there too.
const PUBLIC_LIST_EXCLUDED_FIELDS_SELECT =
  '-tracking_period_mode -tracking_days -confirm_days -flow_type -tracking_subtitle -confirm_subtitle';
const PUBLIC_OFFER_DETAIL_SELECT = [
  ...PUBLIC_OFFER_DETAIL_FIELDS,
  ...OFFER_DETAIL_DERIVATION_FIELDS,
].join(' ');

const PUBLIC_COUPON_FIELDS = [
  '_id',
  'name',
  'description',
  'code',
  'code_enabled',
  'offer_id',
  'start_date',
  'end_date',
  'start_time',
  'end_time',
  'eligibility',
  'min_spend',
  'min_spend_currency',
  'max_cap',
  'max_cap_enabled',
  'max_cap_currency',
  'discount',
  'discount_type',
  'discount_currency',
  'quantity',
  'unlimited_amount_enabled',
  'one_time_use_enabled',
  'usage_per_user',
  'terms_and_conditions',
] as const;
const PUBLIC_COUPON_SELECT = [
  ...PUBLIC_COUPON_FIELDS,
  'disabled',
  'quantity_used',
].join(' ');

function pickPublicOfferDetail(offer: Record<string, any> | null) {
  if (!offer) return null;
  return PUBLIC_OFFER_DETAIL_FIELDS.reduce<Record<string, any>>(
    (acc, field) => {
      if (offer[field] !== undefined) {
        acc[field] = offer[field];
      }
      return acc;
    },
    {},
  );
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Optional cashback-tracking-period fields on Create Brand. Absent keys are
 * omitted so schema defaults apply; present valid values are persisted.
 */
function parseTrackingPeriodCreateFields(
  body: Record<string, any>,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const mode = body.tracking_period_mode;
  if (mode === 'auto' || mode === 'manual') {
    fields.tracking_period_mode = mode;
  }
  if (mode === 'manual') {
    // Same validator the admin update path uses: absent means "use the default",
    // but a supplied-yet-invalid value is a 400 rather than a silent fallback.
    const trackingDays = coerceOptionalDayCount(
      body.tracking_days,
      'tracking_days',
    );
    const confirmDays = coerceOptionalDayCount(
      body.confirm_days,
      'confirm_days',
    );
    if (trackingDays !== undefined) fields.tracking_days = trackingDays;
    if (confirmDays !== undefined) fields.confirm_days = confirmDays;
  }
  if (body.flow_type === 'two_step' || body.flow_type === 'three_step') {
    fields.flow_type = body.flow_type;
  }
  if (typeof body.tracking_subtitle === 'string') {
    fields.tracking_subtitle = parseBoundedOptionalText(
      body.tracking_subtitle,
      'tracking_subtitle',
      MAX_TRACKING_SUBTITLE_LENGTH,
    );
  }
  if (typeof body.confirm_subtitle === 'string') {
    fields.confirm_subtitle = parseBoundedOptionalText(
      body.confirm_subtitle,
      'confirm_subtitle',
      MAX_TRACKING_SUBTITLE_LENGTH,
    );
  }
  return fields;
}

const COUPON_OPTIONAL_STRING_FIELDS = [
  'description',
  'code',
  'start_time',
  'end_time',
  'eligibility',
  'min_spend',
  'min_spend_currency',
  'max_cap_currency',
  'discount_currency',
  'id',
  'link',
  'terms_and_conditions',
] as const;

const COUPON_OPTIONAL_BOOLEAN_FIELDS = [
  'code_enabled',
  'max_cap_enabled',
  'unlimited_amount_enabled',
  'one_time_use_enabled',
] as const;

const COUPON_OPTIONAL_NUMBER_FIELDS = [
  'max_cap',
  'discount',
  'quantity',
  'usage_per_user',
] as const;

function invalidCouponField(field: string): never {
  throw new BadRequestException(`Invalid coupon field: ${field}`);
}

function assertCouponUpdateRuntimeShape(body: UpdateCouponDto): void {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Invalid coupon payload');
  }
  for (const field of COUPON_OPTIONAL_STRING_FIELDS) {
    const value = body[field];
    if (value !== undefined && typeof value !== 'string') {
      invalidCouponField(field);
    }
  }
  for (const field of COUPON_OPTIONAL_BOOLEAN_FIELDS) {
    const value = body[field];
    if (value !== undefined && typeof value !== 'boolean') {
      invalidCouponField(field);
    }
  }
  for (const field of COUPON_OPTIONAL_NUMBER_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (parseOptionalNumber(value) === null) invalidCouponField(field);
  }
  if (
    body.disabled !== undefined &&
    typeof body.disabled !== 'boolean' &&
    body.disabled !== ('true' as never) &&
    body.disabled !== ('false' as never)
  ) {
    invalidCouponField('disabled');
  }
  if (
    body.discount_type !== undefined &&
    body.discount_type !== 'percent' &&
    body.discount_type !== 'cash'
  ) {
    invalidCouponField('discount_type');
  }
}

function couponCalendarDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

function couponBangkokBoundary(
  dateValue: unknown,
  timeValue: unknown,
  endOfDay: boolean,
): number | null {
  const date = couponCalendarDate(dateValue);
  const dateMatch = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  const time = typeof timeValue === 'string' ? timeValue.trim() : '';
  const timeMatch = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (time && !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = timeMatch ? Number(timeMatch[1]) : endOfDay ? 23 : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : endOfDay ? 59 : 0;
  const second = timeMatch?.[3]
    ? Number(timeMatch[3])
    : !timeMatch && endOfDay
      ? 59
      : 0;
  const millisecond = !timeMatch && endOfDay ? 999 : 0;
  const timestamp =
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
    BANGKOK_UTC_OFFSET_MS;

  // Date.UTC normalizes impossible dates (for example 31 February). Reject
  // those rather than silently shifting a coupon's availability window.
  const bangkokLocal = new Date(timestamp + BANGKOK_UTC_OFFSET_MS);
  if (
    bangkokLocal.getUTCFullYear() !== year ||
    bangkokLocal.getUTCMonth() !== month - 1 ||
    bangkokLocal.getUTCDate() !== day
  ) {
    return null;
  }
  return timestamp;
}

function isPublicCouponEligible(
  coupon: Record<string, any>,
  now: Date,
): boolean {
  const start = couponBangkokBoundary(
    coupon.start_date,
    coupon.start_time,
    false,
  );
  const end = couponBangkokBoundary(coupon.end_date, coupon.end_time, true);
  const nowTime = now.getTime();
  if (
    parseBoolean(coupon.disabled) ||
    start === null ||
    end === null ||
    !Number.isFinite(nowTime) ||
    start > nowTime ||
    end < nowTime
  ) {
    return false;
  }

  const quantity = parseOptionalNumber(coupon.quantity) ?? 0;
  const quantityUsed = parseOptionalNumber(coupon.quantity_used) ?? 0;
  const unlimitedAmountEnabled =
    coupon.unlimited_amount_enabled === undefined
      ? quantity <= 0
      : parseBoolean(coupon.unlimited_amount_enabled);
  return unlimitedAmountEnabled || (quantity > 0 && quantityUsed < quantity);
}

function pickPublicCoupon(coupon: Record<string, any>) {
  const result = PUBLIC_COUPON_FIELDS.reduce<Record<string, any>>(
    (acc, field) => {
      if (coupon[field] !== undefined) acc[field] = coupon[field];
      return acc;
    },
    {},
  );
  const code = typeof coupon.code === 'string' ? coupon.code.trim() : '';
  const quantity = parseOptionalNumber(coupon.quantity) ?? 0;
  const quantityUsed = parseOptionalNumber(coupon.quantity_used) ?? 0;
  const codeEnabled =
    coupon.code_enabled === undefined
      ? Boolean(code)
      : parseBoolean(coupon.code_enabled);
  result.code_enabled = codeEnabled;
  result.code = codeEnabled ? code : '';
  if (coupon.one_time_use_enabled !== undefined) {
    result.one_time_use_enabled = parseBoolean(coupon.one_time_use_enabled);
  }
  result.unlimited_amount_enabled =
    coupon.unlimited_amount_enabled === undefined
      ? quantity <= 0
      : parseBoolean(coupon.unlimited_amount_enabled);
  if (coupon.max_cap_enabled !== undefined) {
    result.max_cap_enabled = parseBoolean(coupon.max_cap_enabled);
  }
  const populatedOffer =
    coupon.offer_id && typeof coupon.offer_id === 'object'
      ? coupon.offer_id
      : null;
  if (populatedOffer) {
    result.offer_id = ['_id', 'offer_name', 'offer_name_display'].reduce<
      Record<string, unknown>
    >((offer, field) => {
      if (populatedOffer[field] !== undefined) {
        offer[field] = populatedOffer[field];
      }
      return offer;
    }, {});
    const destination = safeCouponDestination(populatedOffer.tracking_link);
    if (destination) result.destination_url = destination;
  }
  result.remaining_quantity = result.unlimited_amount_enabled
    ? null
    : Math.max(0, quantity - quantityUsed);
  return result;
}

function safeCouponDestination(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const hasSafeProtocol =
      url.protocol === 'https:' || url.protocol === 'http:';
    return hasSafeProtocol && !url.username && !url.password ? trimmed : null;
  } catch {
    return null;
  }
}

function parseBoundedOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  const text = String(value ?? '').trim();
  if (text.length > maxLength) {
    throw new BadRequestException(
      `${field} must be ${maxLength} characters or fewer`,
    );
  }
  return text || undefined;
}

function slugifyOfferLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function offerOwnerIdForRequestKey(requestKey: string): Types.ObjectId {
  return new Types.ObjectId(
    createHash('sha256')
      .update(`gogocash:offer-create-owner:v1:${requestKey}`)
      .digest('hex')
      .slice(0, 24),
  );
}

function stableOfferNumericId(ownerId: Types.ObjectId): number {
  return Number.parseInt(ownerId.toHexString().slice(0, 12), 16);
}

function offerUploadIdentity(file: Express.Multer.File | undefined) {
  if (!file) return null;
  const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : undefined;
  return {
    original_name: String(file.originalname ?? ''),
    content_type: String(file.mimetype ?? ''),
    size: Number.isSafeInteger(file.size) && file.size >= 0 ? file.size : null,
    ...(buffer
      ? { sha256: createHash('sha256').update(buffer).digest('hex') }
      : {}),
  };
}

function parseProductTypeRows(value: unknown): any[] {
  return parseProductTypeRowsField(value) ?? [];
}

@Injectable()
export class OfferService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OfferService.name);
  private filePath = join(process.cwd(), 'uploads', 'data', 'offers.json');

  constructor(
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
    @InjectModel(FavoriteOffer.name)
    private favoriteOfferModel: Model<FavoriteOffer>,
    @InjectModel(Banner.name)
    private bannerModel: Model<Banner>,
    @InjectModel(ALL_BRAND_BANNER_MODEL)
    private allBrandBannerModel: Model<Banner>,
    @InjectModel(TopBrandConfig.name)
    private topBrandConfigModel: Model<TopBrandConfig>,
    @InjectModel(LandingRailConfig.name)
    private landingRailConfigModel: Model<LandingRailConfig>,
    @InjectModel(MissionOrder.name)
    private missionOrderModel: Model<MissionOrder>,
    @InjectModel(Quest.name) private questModel: Model<Quest>,
    @InjectModel(FeaturedSearchTerm.name)
    private featuredSearchModel: Model<FeaturedSearchTerm>,
    @InjectModel(SearchBoostRule.name)
    private searchBoostModel: Model<SearchBoostRule>,
    @InjectModel(SearchBlacklist.name)
    private searchBlacklistModel: Model<SearchBlacklist>,
    private readonly storedMediaService: StoredMediaService,
    private readonly categoryIntegrity: CategoryIntegrityService,
    private readonly policyMediaWrite: PolicyMediaWriteService,
    private readonly policyMediaRegistry: PolicyMediaAssetRegistryService,
    private readonly policyMediaCleanup: PolicyMediaCleanupService,
    // #498 — conversion counts drive the Top Brands min-10 auto-fill ranking.
    // Placed at the end of the required params so positional test construction
    // stays aligned.
    @InjectModel(Conversion.name)
    private conversionModel: Model<Conversion>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional()
    @InjectModel(SPECIFIC_PAGE_BANNER_MODEL)
    private specificPageBannerModel?: Model<Banner>,
  ) {}

  /**
   * One-shot index migration: the former `{ offer_id: 1 }` unique index becomes
   * a compound `{ source, offer_id }` after the Optimise integration. Drop the
   * legacy index on startup if it still exists so Mongoose can create the new
   * compound index cleanly. Idempotent — a no-op once the migration has run.
   *
   * Deferred so Cloud Run can bind PORT before the first Mongo round-trip.
   */
  onApplicationBootstrap(): void {
    void this.migrateLegacyOfferIndex();
  }

  private async migrateLegacyOfferIndex(): Promise<void> {
    try {
      const indexes = await this.offerModel.collection.indexes();
      const legacy = indexes.find((idx) => idx.name === 'offer_id_1');
      if (legacy) {
        await this.offerModel.collection.dropIndex('offer_id_1');
        this.logger.log(
          'Dropped legacy `offer_id_1` unique index; compound `source_1_offer_id_1` will be created by Mongoose.',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Offer index migration check skipped: ${msg}`);
    }
  }
  async findAll(
    page: number,
    limit: number,
    search: string,
    categories: string,
    country?: string,
    admin = false,
    /** Admin-only curation filters. Ignored on public (`admin=false`) calls. */
    adminFilters: { status?: string; source?: string } = {},
  ) {
    const filter: any = {};
    if (search) {
      const safeSearch = escapeRegexLiteral(search);
      const trimmedSearch = search.trim();
      const orConditions: Record<string, unknown>[] = [
        { offer_name: { $regex: safeSearch, $options: 'i' } },
        { offer_name_display: { $regex: safeSearch, $options: 'i' } },
        { categories: { $regex: safeSearch, $options: 'i' } },
        { lookup_value: { $regex: safeSearch, $options: 'i' } },
        { countries: { $regex: safeSearch, $options: 'i' } },
      ];
      const numericOfferId = Number.parseInt(trimmedSearch, 10);
      if (
        trimmedSearch.length > 0 &&
        String(numericOfferId) === trimmedSearch
      ) {
        orConditions.push({ offer_id: numericOfferId });
      }
      if (
        Types.ObjectId.isValid(trimmedSearch) &&
        trimmedSearch.length === 24
      ) {
        orConditions.push({ _id: new Types.ObjectId(trimmedSearch) });
      }
      filter.$or = orConditions;
    }
    if (categories) {
      // #438 — match partner feed `categories` OR an enabled admin brand-category
      // display override. Admin-assigned Electronics brands were invisible in
      // customer category browse when only the display tag was set.
      const safeCategory = escapeRegexLiteral(categories);
      const categoryClause = {
        $or: [
          { categories: { $regex: safeCategory, $options: 'i' } },
          {
            'offer_display_tags.brand_category_enabled': true,
            'offer_display_tags.brand_category_label': {
              $regex: safeCategory,
              $options: 'i',
            },
          },
        ],
      };
      if (!Array.isArray(filter.$and)) {
        filter.$and = [];
      }
      filter.$and.push(categoryClause);
    }
    const countryRegex = countryFilterRegex(country);
    if (countryRegex) {
      // Token-anchored ISO-2/full-name match — the app sends ISO-2 codes while
      // Involve offers store full names (see countryFilterRegex).
      filter['countries'] = {
        $regex: countryRegex,
        $options: 'i',
      };
    }
    if (!admin) {
      filter.disabled = { $ne: true };
      // Hide pending/rejected offers from the customer app. Legacy Involve docs
      // default to `status: 'approved'` via the Offer schema, so they remain visible.
      filter.status = { $nin: ['pending_review', 'rejected'] };
    } else {
      if (adminFilters.status) {
        filter.status = adminFilters.status;
      }
      if (adminFilters.source) {
        filter.source = adminFilters.source;
      }
    }
    let listQuery = this.offerModel.find(filter);
    if (!admin) {
      // Raw tracking-period config is admin-only (the detail route serves the
      // derived tracking_period instead) — keep the public list surfaces
      // consistent with that contract.
      listQuery = listQuery.select(PUBLIC_LIST_EXCLUDED_FIELDS_SELECT);
    }
    if (admin) {
      listQuery = listQuery.sort({
        datetime_created: -1,
        offer_name_display: 1,
        offer_name: 1,
      });
    }
    const data = await listQuery
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const rankedData =
      !admin && search
        ? await this.rankPublicSearchResults(search, data)
        : data;
    const total = await this.offerModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    return { page, limit, total, totalPages, data: rankedData };
  }

  private async rankPublicSearchResults(
    search: string,
    offers: OfferDocument[],
  ) {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) {
      return offers;
    }

    const [blacklist, boosts, featured] = await Promise.all([
      this.searchBlacklistModel.find().lean(),
      this.searchBoostModel.find({ is_active: { $ne: false } }).lean(),
      this.featuredSearchModel
        .find({ is_active: { $ne: false } })
        .sort({ sort_order: 1 })
        .lean(),
    ]);

    if (
      blacklist.some((entry) =>
        normalizedQuery.includes(String(entry.term).toLowerCase()),
      )
    ) {
      return [];
    }

    const filtered = offers.filter((offer) => {
      const haystack =
        `${offer.offer_name_display ?? ''} ${offer.offer_name ?? ''} ${offer.categories ?? ''}`.toLowerCase();
      return !blacklist.some((entry) =>
        haystack.includes(String(entry.term).toLowerCase()),
      );
    });
    const featuredTerms = featured.map((entry) =>
      String(entry.term).toLowerCase(),
    );

    return rankOffersWithSearchRules(
      normalizedQuery,
      filtered,
      boosts.map((rule) => ({
        offerId: String(rule.offer_id),
        treatment:
          rule.treatment === 'pinned' || rule.treatment === 'blocked'
            ? rule.treatment
            : 'boost',
        keywords: normalizeSearchRuleKeywords(rule.keywords),
        weight: Number(rule.weight ?? rule.boost_weight ?? 1),
        active: rule.is_active !== false,
      })),
      featuredTerms,
    );
  }

  async getFeaturedSearchTerms() {
    const data = await this.featuredSearchModel
      .find({ is_active: { $ne: false } })
      .sort({ sort_order: 1 })
      .lean();
    return { data };
  }

  async findAllExtra() {
    const filter: any = {};
    filter.disabled = { $ne: true };
    filter.status = { $nin: ['pending_review', 'rejected'] };
    filter.extra_store = true;

    const dataExtra = await this.offerModel
      .find(filter)
      .select(PUBLIC_LIST_EXCLUDED_FIELDS_SELECT)
      .sort({ extra_store_sort: 1 })
      .lean();

    return dataExtra;
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const offer = await this.offerModel
      .findOne({ _id: id, ...ACTIVE_OFFER_FILTER } as any)
      .select(PUBLIC_OFFER_DETAIL_SELECT)
      .lean();
    const picked = pickPublicOfferDetail(offer as Record<string, any> | null);
    if (!picked) {
      return null;
    }
    // Derived tracking windows are the only tracking-period data customers
    // see; the raw mode/day/validation fields stay admin-only.
    return {
      ...picked,
      tracking_period: resolveTrackingPeriod(offer as Record<string, any>),
    };
  }

  /** Permanent delete with a durable, globally fenced media cleanup replay. */
  async removeOffer(id: string): Promise<{
    message: string;
    media_cleanup_pending?: boolean;
    media_cleanup_request_key?: string;
  }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Offer not found');
    }
    return this.categoryIntegrity.withNormalWrite({
      legacy: async () => {
        const offer = await this.offerModel.findById(id);
        if (!offer) throw new NotFoundException('Offer not found');
        const offerObjectId = new Types.ObjectId(id);
        await Promise.all([
          this.favoriteOfferModel.deleteMany({ offer_id: offerObjectId }),
          this.topBrandConfigModel.updateOne(
            {},
            {
              $pull: {
                brands: { offerId: id },
                brandsDesktop: { offerId: id },
                brandsMobile: { offerId: id },
              },
            },
          ),
          this.searchBoostModel.deleteMany({ offer_id: id }),
        ]);
        await this.offerModel.findByIdAndDelete(id);
        return { message: 'Offer deleted successfully' };
      },
      enforced: () => this.removeOfferWithIntegrity(id),
    });
  }

  private async removeOfferWithIntegrity(id: string): Promise<{
    message: string;
    media_cleanup_pending?: boolean;
    media_cleanup_request_key?: string;
  }> {
    const offerObjectId = new Types.ObjectId(id);
    const cleanupRequestKey = `offer-delete:${id}:v1`;
    try {
      await this.categoryIntegrity.withIntegrityMutation(async (session) => {
        const offer = await this.offerModel
          .findById(id)
          .session(session)
          .lean();
        if (!offer) return;
        const assets = commandOwnedOfferAssets(
          offer as unknown as Record<string, unknown>,
        );
        if (assets.length > 0) {
          await this.policyMediaCleanup.journalCommandOwnedAssets(
            {
              owner_type: 'offer',
              owner_id: offerObjectId,
              request_key: cleanupRequestKey,
              payload_hash: policyMediaWritePayloadHash({
                operation: 'offer-delete',
                owner_id: id,
                assets: assets.map((asset) => ({
                  owner_key: asset.owner_key,
                  owner_attempt_token: asset.owner_attempt_token,
                  object_key: asset.object_key,
                  url: asset.url,
                  sha256: asset.sha256,
                })),
              }),
              attempt_token: cleanupRequestKey,
              reason: 'content-delete',
              assets,
            },
            session,
          );
        }
        // MongoDB forbids parallel operations on one transaction session.
        await this.favoriteOfferModel.deleteMany(
          { offer_id: offerObjectId },
          { session },
        );
        await this.topBrandConfigModel.updateOne(
          {},
          {
            $pull: {
              brands: { offerId: id },
              brandsDesktop: { offerId: id },
              brandsMobile: { offerId: id },
            },
          },
          { session },
        );
        await this.searchBoostModel.deleteMany({ offer_id: id }, { session });
        const deleted = await this.offerModel.deleteOne(
          { _id: offerObjectId },
          { session },
        );
        if (deleted.deletedCount !== 1) {
          throw new ConflictException('Offer changed; refresh and retry');
        }
      });
    } catch (error) {
      let authoritativeOwner: unknown;
      try {
        authoritativeOwner = await this.offerModel
          .findById(id)
          .read('primary')
          .lean();
      } catch {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'OFFER_DELETE_OUTCOME_UNCERTAIN',
          message:
            'Offer deletion outcome is uncertain; media cleanup was refused.',
          request_key: cleanupRequestKey,
        });
      }
      if (authoritativeOwner) throw error;
    }

    let cleanup: { deleted: number; pending: number };
    try {
      cleanup = await this.policyMediaCleanup.processRequest(cleanupRequestKey);
    } catch {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'OFFER_MEDIA_CLEANUP_PENDING',
        message: `Offer deleted, but media cleanup is pending. Retry with key ${cleanupRequestKey}.`,
        request_key: cleanupRequestKey,
      });
    }
    return {
      message: 'Offer deleted successfully',
      ...(cleanup.pending > 0
        ? {
            media_cleanup_pending: true,
            media_cleanup_request_key: cleanupRequestKey,
          }
        : {}),
    };
  }

  async createAdminOffer(
    body: Record<string, any>,
    files: {
      banner_mobile?: Express.Multer.File[];
      logo_desktop?: Express.Multer.File[];
      logo_mobile?: Express.Multer.File[];
      banner?: Express.Multer.File[];
      logo_circle?: Express.Multer.File[];
    } = {},
  ) {
    const brandName = String(
      body.brand_name ?? body.offer_name_display ?? '',
    ).trim();
    if (!brandName) {
      throw new BadRequestException('brand_name is required');
    }
    const trackingLink = String(
      body.affiliate_tracking_link ?? body.tracking_link ?? '',
    ).trim();
    if (!trackingLink) {
      throw new BadRequestException('affiliate_tracking_link is required');
    }
    const policyCategoryId = String(body.policy_category_id ?? '').trim();
    const customTerms = parseBoundedOptionalText(
      body.custom_terms,
      'custom_terms',
      MAX_CUSTOM_TERMS_LENGTH,
    );
    const noteToUser = parseBoundedOptionalText(
      body.note_to_user,
      'note_to_user',
      MAX_NOTE_TO_USER_LENGTH,
    );
    const trackingPeriodFields = parseTrackingPeriodCreateFields(body);
    const wantsTopBrand = parseBoolean(body.extra_store, false);

    const created = await this.categoryIntegrity.withNormalWrite({
      legacy: async () => {
        const upload = async (
          label: string,
          file: Express.Multer.File | undefined,
          folder: MediaFolder,
        ): Promise<string> => {
          if (!file) return '';
          try {
            return await this.storedMediaService.upload(file, folder);
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : String(error);
            throw new InternalServerErrorException(
              `Failed to upload ${label}: ${reason}`,
            );
          }
        };
        const logoFile = files.logo_desktop?.[0] ?? files.logo_mobile?.[0];
        const bannerFile =
          files.banner?.[0] ??
          files.banner_mobile?.[0] ??
          files.logo_circle?.[0];
        const [logoAsset, bannerAsset] = await Promise.all([
          // #493 — banners are wide hero art and must not take the logo width cap.
          upload('logo (desktop)', logoFile, MEDIA_FOLDER.BRANDS),
          upload('banner', bannerFile, MEDIA_FOLDER.BRAND_BANNERS),
        ]);
        const now = new Date();
        const manualId = Date.now();
        const commissionStore = parseOptionalNumber(body.commission_store);
        const maxCap = parseOptionalNumber(body.max_cap);
        return this.offerModel.create({
          offer_id: manualId,
          merchant_id: manualId,
          offer_name: `${brandName} - CPS`,
          offer_name_display: brandName,
          description: String(body.description ?? '').trim(),
          preview_url: trackingLink,
          currency: String(body.currency ?? 'THB').trim() || 'THB',
          logo: logoAsset || String(body.logo ?? ''),
          lookup_value:
            String(body.lookup_value ?? '').trim() ||
            slugifyOfferLookup(brandName) ||
            `brand_${manualId}`,
          validation_terms: 30,
          payment_terms: 60,
          datetime_updated: now,
          datetime_created: now,
          marketplace_store_offer: true,
          categories:
            String(body.categories ?? 'Shopping').trim() || 'Shopping',
          countries: String(body.countries ?? 'Thailand').trim() || 'Thailand',
          commissions: [
            {
              Commission:
                commissionStore != null && !Number.isNaN(commissionStore)
                  ? `${commissionStore}%`
                  : '0%',
            },
          ],
          special_commissions: [],
          tracking_link: trackingLink,
          commission_tracking: 'CPS',
          tracking_type: 'link',
          directory_page: trackingLink,
          logo_desktop: logoAsset,
          logo_mobile: logoAsset,
          banner: bannerAsset,
          banner_mobile: bannerAsset,
          logo_circle: bannerAsset,
          disabled: parseBoolean(body.disabled, false),
          commission_store: commissionStore,
          max_cap: maxCap,
          extra_store: parseBoolean(body.extra_store, false),
          extra_point: parseOptionalNumber(body.extra_point) ?? 1,
          product_type: parseProductTypeRows(
            body.product_types ?? body.product_type,
          ),
          source: 'manual',
          status: 'approved',
          is_global: parseBoolean(body.is_global, false),
          default_country:
            String(body.default_country ?? '').trim() || undefined,
          app_deeplink: String(body.app_deeplink ?? '').trim() || undefined,
          offer_display_tags: parseOfferDisplayTagsField(
            body.offer_display_tags,
          ),
          policy_category_id:
            policyCategoryId === 'custom' ||
            Types.ObjectId.isValid(policyCategoryId)
              ? policyCategoryId
              : undefined,
          custom_terms: customTerms,
          note_to_user: noteToUser,
          ...trackingPeriodFields,
        });
      },
      enforced: async () => {
        await this.categoryIntegrity.assertPolicyCategoryAssignmentReady(
          policyCategoryId,
        );

        // The admin exposes two physical assets. Older clients may still send a
        // legacy field, so accept it as a fallback but upload each chosen file once.
        const logoFile = files.logo_desktop?.[0] ?? files.logo_mobile?.[0];
        const bannerFile =
          files.banner?.[0] ??
          files.banner_mobile?.[0] ??
          files.logo_circle?.[0];

        const explicitRequestKey =
          typeof body.request_key === 'string' && body.request_key.trim()
            ? body.request_key.trim()
            : undefined;
        const offerOwnerId = explicitRequestKey
          ? offerOwnerIdForRequestKey(explicitRequestKey)
          : new Types.ObjectId();
        const requestKey =
          explicitRequestKey ??
          `offer-create:${offerOwnerId.toHexString()}:${randomUUID()}`;
        const now = new Date();
        const manualId = stableOfferNumericId(offerOwnerId);
        const commissionStore = parseOptionalNumber(body.commission_store);
        const maxCap = parseOptionalNumber(body.max_cap);

        const categories =
          String(body.categories ?? 'Shopping').trim() || 'Shopping';
        const document = {
          _id: offerOwnerId,
          offer_id: manualId,
          merchant_id: manualId,
          offer_name: `${brandName} - CPS`,
          offer_name_display: brandName,
          description: String(body.description ?? '').trim(),
          preview_url: trackingLink,
          currency: String(body.currency ?? 'THB').trim() || 'THB',
          logo: String(body.logo ?? '').trim(),
          lookup_value:
            String(body.lookup_value ?? '').trim() ||
            slugifyOfferLookup(brandName) ||
            `brand_${manualId}`,
          validation_terms: 30,
          payment_terms: 60,
          datetime_updated: now,
          datetime_created: now,
          marketplace_store_offer: true,
          categories,
          countries: String(body.countries ?? 'Thailand').trim() || 'Thailand',
          commissions: [
            {
              Commission:
                commissionStore != null && !Number.isNaN(commissionStore)
                  ? `${commissionStore}%`
                  : '0%',
            },
          ],
          special_commissions: [],
          tracking_link: trackingLink,
          commission_tracking: 'CPS',
          tracking_type: 'link',
          directory_page: trackingLink,
          logo_desktop: String(body.logo_desktop ?? body.logo ?? '').trim(),
          logo_mobile: String(body.logo_mobile ?? body.logo ?? '').trim(),
          banner: String(body.banner ?? '').trim(),
          banner_mobile: String(body.banner_mobile ?? body.banner ?? '').trim(),
          logo_circle: String(body.logo_circle ?? body.banner ?? '').trim(),
          disabled: parseBoolean(body.disabled, false),
          commission_store: commissionStore,
          max_cap: maxCap,
          extra_store: parseBoolean(body.extra_store, false),
          extra_point: parseOptionalNumber(body.extra_point) ?? 1,
          product_type: parseProductTypeRows(
            body.product_types ?? body.product_type,
          ),
          source: 'manual' as const,
          status: 'approved' as const,
          is_global: parseBoolean(body.is_global, false),
          default_country:
            String(body.default_country ?? '').trim() || undefined,
          app_deeplink: String(body.app_deeplink ?? '').trim() || undefined,
          offer_display_tags: parseOfferDisplayTagsField(
            body.offer_display_tags,
          ),
          custom_terms: customTerms,
          note_to_user: noteToUser,
          ...trackingPeriodFields,
        };
        const persist = async (
          assets: PolicyMediaWriteAssets,
          session: import('mongoose').ClientSession,
        ) => {
          const assignment =
            await this.categoryIntegrity.policyCategoryAssignmentInSession(
              policyCategoryId,
              categories,
              session,
            );
          const uploadedLogo = assets.logo;
          const uploadedBanner = assets.banner;
          const payload = {
            ...document,
            ...assignment,
            ...(uploadedLogo
              ? {
                  logo: uploadedLogo.url,
                  logo_desktop: uploadedLogo.url,
                  logo_mobile: uploadedLogo.url,
                  logo_asset: uploadedLogo,
                }
              : {}),
            ...(uploadedBanner
              ? {
                  banner: uploadedBanner.url,
                  banner_mobile: uploadedBanner.url,
                  logo_circle: uploadedBanner.url,
                  banner_asset: uploadedBanner,
                }
              : {}),
          };
          for (const url of new Set(
            [
              payload.logo,
              payload.logo_desktop,
              payload.logo_mobile,
              payload.banner,
              payload.banner_mobile,
              payload.logo_circle,
            ].filter((value): value is string => Boolean(value)),
          )) {
            await this.policyMediaRegistry.touchAttachInSession(url, session);
          }
          const created = await this.offerModel.create(
            [payload as unknown as Offer],
            { session },
          );
          return created[0]!;
        };

        const uploads = [
          ...(logoFile
            ? [
                {
                  role: 'logo',
                  file: logoFile,
                  folder: MEDIA_FOLDER.BRANDS,
                },
              ]
            : []),
          ...(bannerFile
            ? [
                {
                  role: 'banner',
                  file: bannerFile,
                  folder: MEDIA_FOLDER.BRAND_BANNERS,
                },
              ]
            : []),
        ];
        if (uploads.length === 0 && !explicitRequestKey) {
          return this.categoryIntegrity.withIntegrityMutation((session) =>
            persist({}, session),
          );
        }
        return this.policyMediaWrite.execute({
          requestKey,
          payloadHash: policyMediaWritePayloadHash({
            request_key: requestKey,
            owner_id: String(offerOwnerId),
            brand_name: brandName,
            tracking_link: trackingLink,
            policy_category_id: policyCategoryId || null,
            categories,
            description: document.description,
            currency: document.currency,
            countries: document.countries,
            lookup_value: String(body.lookup_value ?? '').trim() || null,
            logo: document.logo,
            logo_desktop: document.logo_desktop,
            logo_mobile: document.logo_mobile,
            banner: document.banner,
            banner_mobile: document.banner_mobile,
            logo_circle: document.logo_circle,
            disabled: document.disabled,
            commission_store: document.commission_store,
            max_cap: document.max_cap,
            extra_store: document.extra_store,
            extra_point: document.extra_point,
            product_type: document.product_type,
            is_global: document.is_global,
            default_country: document.default_country ?? null,
            app_deeplink: document.app_deeplink ?? null,
            offer_display_tags: document.offer_display_tags ?? null,
            custom_terms: document.custom_terms ?? null,
            note_to_user: document.note_to_user ?? null,
            uploads: {
              logo: offerUploadIdentity(logoFile),
              banner: offerUploadIdentity(bannerFile),
            },
          }),
          ownerType: 'offer',
          ownerId: offerOwnerId,
          operation: 'offer-create',
          uploads,
          commit: persist,
          readCommittedOwner: () =>
            this.offerModel.findById(offerOwnerId).read('primary').exec(),
        });
      },
    });

    // #475 — create with Top Brand on also upserts the curated list.
    const createdId = String(
      (created as { _id?: unknown } | null | undefined)?._id ?? '',
    );
    if (createdId && wantsTopBrand) {
      try {
        await syncOfferTopBrandMembership(
          this.topBrandConfigModel,
          createdId,
          true,
        );
      } catch (error) {
        // Keep Brand Info toggle aligned when the curated list is full.
        await this.offerModel
          .findByIdAndUpdate(createdId, { $set: { extra_store: false } })
          .exec();
        throw error;
      }
    }
    return created;
  }

  async getCategoryList(search: string) {
    const filter: Record<string, unknown> = {
      $or: [
        { lifecycle_status: 'active' },
        { lifecycle_status: { $exists: false } },
      ],
    };
    if (search) {
      filter['name'] = {
        $regex: escapeRegexLiteral(search),
        $options: 'i',
      };
    }
    const categoriesAll = await this.categoryModel.find(filter).lean();
    return categoriesAll;
  }

  async findMyOffer(user_id: string, payload: GetMyOfferDto) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(user_id),
    });
    if (!user) {
      throw new Error('User not found');
    }
    const list = await this.deeplinkModel
      .find({ user_id: user._id })
      .skip((payload.page - 1) * payload.limit)
      .limit(payload.limit)
      .lean();

    const dt = await Promise.all(
      list.map(async (item) => {
        const offer = await this.offerModel.findOne({
          offer_id: item.offer_id,
        });
        return { ...item, offer_name: offer?.offer_name };
        // item['offer_name'] = offer?.offer_name;
      }),
    );
    return dt;
  }

  async writeJJsonToFile(payload: any): Promise<any> {
    const json = JSON.stringify(payload, null, 2);
    await fs.mkdir(join(process.cwd(), 'uploads', 'data'), { recursive: true });
    await fs.writeFile(this.filePath, json, 'utf8');
    return payload;
  }

  async favoriteOfferByUser(
    idUser: string,
    idOffer: string,
  ): Promise<FavoriteOffer | null> {
    const existing = await this.favoriteOfferModel.findOne({
      user_id: new Types.ObjectId(idUser),
      offer_id: new Types.ObjectId(idOffer),
    });
    if (existing) {
      await this.favoriteOfferModel.deleteOne({
        user_id: new Types.ObjectId(idUser),
        offer_id: new Types.ObjectId(idOffer),
      });
      return null;
    }
    const favoriteOffer = new this.favoriteOfferModel({
      user_id: new Types.ObjectId(idUser),
      offer_id: new Types.ObjectId(idOffer),
    });
    const data = await favoriteOffer.save();
    return data;
  }

  async getFavoriteOfferByUser(
    idUser: string,
    page: number,
    limit: number,
  ): Promise<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    data: FavoriteOffer[];
  }> {
    const filter = { user_id: new Types.ObjectId(idUser) };

    const data = await this.favoriteOfferModel
      .find(filter)
      .populate('offer_id', [
        'offer_name',
        'offer_id',
        'logo_desktop',
        'logo',
        'logo_mobile',
        'commissions',
        'offer_name_display',
      ])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await this.favoriteOfferModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return { page, limit, total, totalPages, data };
  }

  async getBannerHome() {
    // logic get banner home
    return this.bannerModel.findOne().exec();
  }

  async getAllBrandBanner() {
    return this.getSpecificPageBanner('all-brands');
  }

  async getSpecificPageBanner(targetValue: string) {
    const target = requireSpecificPageBannerTarget(targetValue);
    const banner =
      (await this.specificPageBannerModel?.findOne({ target }).exec()) ?? null;
    if (banner || target !== 'all-brands') {
      return banner;
    }
    return this.allBrandBannerModel.findOne().exec();
  }

  /**
   * Public home "top brands": the admin-curated, ordered list (saveTopBrands).
   * Resolves each saved offerId to live brand name + logo, pairs it with the
   * admin-set cashback label, and preserves the saved order. Unknown offer ids
   * are dropped; no config → empty list (the client falls back to fixtures).
   */
  async getDisplayTopBrands() {
    const config = await this.topBrandConfigModel.findOne().exec();
    const desktopEntries = resolveDeviceBrandEntries(config, 'desktop');
    const mobileEntries = resolveDeviceBrandEntries(config, 'mobile');
    const unionIds = [
      ...new Set([
        ...desktopEntries.map((entry) => entry.offerId),
        ...mobileEntries.map((entry) => entry.offerId),
      ]),
    ];

    const offers = unionIds.length
      ? await this.offerModel
          .find({
            _id: { $in: unionIds },
            ...ACTIVE_OFFER_FILTER,
          } as any)
          .select(TOP_BRAND_CARD_FIELDS)
          .exec()
      : [];
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    const toDisplay = (entries: { offerId: string; cashback: string }[]) =>
      entries
        .map((entry) => {
          const offer = offerById.get(entry.offerId);
          return offer ? toTopBrandCard(offer) : null;
        })
        .filter((brand): brand is TopBrandCard => brand !== null);

    let dataDesktop = toDisplay(desktopEntries);
    let dataMobile = toDisplay(mobileEntries);

    // #498 — Top Brands always display at least MIN_TOP_BRANDS. When admin
    // curation is short, fill the remaining slots with the highest-conversion
    // brands not already shown, preserving admin order. Only aggregate when a
    // fill is actually needed (skips the query on a fully-curated rail).
    if (
      dataDesktop.length < MIN_TOP_BRANDS ||
      dataMobile.length < MIN_TOP_BRANDS
    ) {
      const excluded = new Set(unionIds.map((id) => String(id)));
      const fillCards = await this.resolveTopBrandConversionFill(excluded);
      dataDesktop = appendTopBrandFill(dataDesktop, fillCards, MIN_TOP_BRANDS);
      dataMobile = appendTopBrandFill(dataMobile, fillCards, MIN_TOP_BRANDS);
    }

    // `data` stays desktop-shaped for legacy clients / E2E pollers.
    return { data: dataDesktop, dataDesktop, dataMobile };
  }

  /**
   * #498 — highest-conversion brands to fill the Top Brands rail up to the
   * minimum. Ranks active offers by approved-conversion count over a recent
   * window (aggregated from the Conversion collection), excludes the given
   * offer ObjectIds (already-curated). The ranked numeric offer-id list is
   * cached so the aggregation runs at most once per TTL, not per request.
   */
  private async resolveTopBrandConversionFill(
    excludedOfferObjectIds: Set<string>,
  ): Promise<TopBrandCard[]> {
    let rankedOfferIds = await this.cacheManager.get<number[]>(
      TOP_BRAND_FILL_CACHE_KEY,
    );
    if (!Array.isArray(rankedOfferIds)) {
      const since = new Date(Date.now() - TOP_BRAND_FILL_WINDOW_MS);
      const ranked = await this.conversionModel.aggregate<{ _id: number }>([
        {
          $match: {
            conversion_status: 'approved',
            datetime_conversion: { $gte: since },
          },
        },
        { $group: { _id: '$offer_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: TOP_BRAND_FILL_CANDIDATES },
      ]);
      rankedOfferIds = ranked
        .map((row) => row._id)
        .filter((id): id is number => typeof id === 'number');
      await this.cacheManager.set(
        TOP_BRAND_FILL_CACHE_KEY,
        rankedOfferIds,
        TOP_BRAND_FILL_CACHE_TTL_MS,
      );
    }
    if (rankedOfferIds.length === 0) {
      return [];
    }

    const offers = await this.offerModel
      .find({
        offer_id: { $in: rankedOfferIds },
        ...ACTIVE_OFFER_FILTER,
      } as any)
      .select(TOP_BRAND_CARD_FIELDS)
      .exec();
    const offerByNumericId = new Map(
      offers.map((offer) => [(offer as { offer_id: number }).offer_id, offer]),
    );

    const cards: TopBrandCard[] = [];
    for (const numericId of rankedOfferIds) {
      const offer = offerByNumericId.get(numericId);
      if (!offer) continue;
      if (excludedOfferObjectIds.has(String((offer as { _id: unknown })._id))) {
        continue;
      }
      cards.push(toTopBrandCard(offer));
      if (cards.length >= MIN_TOP_BRANDS) break;
    }
    return cards;
  }

  /**
   * Public home "landing rails": every enabled admin-curated rail
   * ("Trending Brands", "Travel Deals are Here!", "Makeup Must Have!"), ordered
   * by position, each hydrated from live offer economics exactly like
   * {@link getDisplayTopBrands}. Rails whose curated offers all resolve to
   * unknown/inactive offers still return (with empty cards) so the customer app
   * can fall back to its fixture for that rail. No rails → empty list (the
   * client falls back to fixtures entirely).
   */
  async getDisplayLandingRails() {
    const rails = sortLandingRails(
      await this.landingRailConfigModel
        .find({ enabled: { $ne: false } })
        .exec(),
    );
    if (rails.length === 0) {
      return { data: [] };
    }

    const unionIds = [
      ...new Set(
        rails.flatMap((rail) => [
          ...resolveDeviceBrandEntries(rail, 'desktop').map((e) => e.offerId),
          ...resolveDeviceBrandEntries(rail, 'mobile').map((e) => e.offerId),
        ]),
      ),
    ];

    const offers =
      unionIds.length === 0
        ? []
        : await this.offerModel
            .find({
              _id: { $in: unionIds },
              ...ACTIVE_OFFER_FILTER,
            } as any)
            .select(
              'offer_id offer_name offer_name_display logo logo_desktop logo_mobile logo_circle commission_store commissions',
            )
            .exec();
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    const toDisplay = (entries: { offerId: string; cashback: string }[]) =>
      entries
        .map((entry) => {
          const offer = offerById.get(entry.offerId);
          if (!offer) {
            return null;
          }
          const row = offer as {
            _id: unknown;
            offer_id: number;
            offer_name: string;
            offer_name_display?: string;
            logo?: string;
            logo_desktop?: string;
            logo_mobile?: string;
            logo_circle?: string;
            commission_store?: unknown;
            commissions?: unknown[];
          };
          return {
            _id: String(row._id),
            offer_id: row.offer_id,
            brand: row.offer_name_display?.trim() || row.offer_name,
            logo: resolvePublicOfferLogo(row),
            cashback: resolveOfferCashbackLabel(row),
          };
        })
        .filter((brand) => brand !== null);

    const data = rails.map((rail, index) => {
      const meta = normalizeLandingRailMeta(rail, index);
      const dataDesktop = toDisplay(resolveDeviceBrandEntries(rail, 'desktop'));
      const dataMobile = toDisplay(resolveDeviceBrandEntries(rail, 'mobile'));
      return {
        railId: meta.railId,
        title: meta.title,
        emoji: meta.emoji,
        link: meta.link,
        cardVariant: meta.cardVariant || DEFAULT_LANDING_RAIL_CARD_VARIANT,
        position: meta.position,
        // `data` stays desktop-shaped for legacy clients / E2E pollers.
        data: dataDesktop,
        dataDesktop,
        dataMobile,
      };
    });

    return { data };
  }

  async updateCoupon(body: UpdateCouponDto) {
    assertCouponUpdateRuntimeShape(body);
    const offerId = requireObjectId(String(body.offer_id), 'offer_id');
    const discount = body.discount ? Number(body.discount) : 0;
    const quantity = body.quantity ? Number(body.quantity) : 0;
    const disabled = parseBoolean(body.disabled);
    const codeEnabled = body.code_enabled ?? Boolean(body.code?.trim());
    const isEdit = Boolean(body.id);
    // New coupons retain the documented one-time / one-use default. Existing
    // legacy coupons are sparse data: omitted fields must remain omitted on an
    // unrelated edit instead of silently changing their redemption semantics.
    const oneTimeUseEnabled = body.one_time_use_enabled ?? true;
    const usagePerUser =
      body.one_time_use_enabled === true ||
      (!isEdit && body.one_time_use_enabled === undefined)
        ? 1
        : (parseOptionalNumber(body.usage_per_user) ?? 1);
    const unlimitedAmountEnabled =
      body.unlimited_amount_enabled ?? quantity <= 0;
    const maxCap = parseOptionalNumber(body.max_cap);
    const patch = {
      offer_id: offerId,
      discount,
      quantity,
      disabled,
      name: body.name,
      code: codeEnabled ? (body.code ?? '') : '',
      code_enabled: codeEnabled,
      description: body.description ?? '',
      start_date: body.start_date,
      end_date: body.end_date,
      ...(body.start_time !== undefined
        ? { start_time: body.start_time.trim() }
        : {}),
      ...(body.end_time !== undefined
        ? { end_time: body.end_time.trim() }
        : {}),
      eligibility: body.eligibility ?? '',
      min_spend: body.min_spend ?? '',
      ...(body.min_spend_currency !== undefined
        ? { min_spend_currency: body.min_spend_currency }
        : {}),
      ...(body.max_cap !== undefined ? { max_cap: maxCap } : {}),
      ...(body.max_cap_enabled !== undefined
        ? { max_cap_enabled: body.max_cap_enabled }
        : {}),
      ...(body.max_cap_currency !== undefined
        ? { max_cap_currency: body.max_cap_currency }
        : {}),
      ...(body.discount_type !== undefined
        ? { discount_type: body.discount_type }
        : {}),
      ...(body.discount_currency !== undefined
        ? { discount_currency: body.discount_currency }
        : {}),
      ...(!isEdit || body.one_time_use_enabled !== undefined
        ? { one_time_use_enabled: oneTimeUseEnabled }
        : {}),
      ...(!isEdit || body.usage_per_user !== undefined
        ? { usage_per_user: usagePerUser }
        : {}),
      unlimited_amount_enabled: unlimitedAmountEnabled,
      link: body.link ?? '',
      ...(body.terms_and_conditions !== undefined
        ? { terms_and_conditions: body.terms_and_conditions.trim() }
        : {}),
    };
    if (body?.id) {
      return this.couponModel.findByIdAndUpdate(
        requireObjectId(body.id),
        mongoSetUpdate(patch),
        {
          new: true,
        },
      );
    }
    return this.couponModel.create({
      ...patch,
      disabled: disabled as boolean,
    });
  }

  async getCoupon(page: number, limit: number, search: string) {
    const filter: Record<string, unknown> = {
      archived_at: { $exists: false },
    };
    if (search.trim().length > 0) {
      filter.$or = [
        {
          name: {
            $regex: escapeRegexLiteral(search),
            $options: 'i',
          },
        },
        {
          code: {
            $regex: escapeRegexLiteral(search),
            $options: 'i',
          },
        },
      ];
    }
    const data = await this.couponModel
      .find(filter)
      .populate('offer_id', ['offer_name'])
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const total = await this.couponModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return { page, limit, total, totalPages, data };
  }

  async archiveCoupon(
    id: string,
    actor: { adminEmail?: string; adminId: string },
  ) {
    const couponId = requireObjectId(id, 'coupon id');
    const archivedAt = new Date();
    const archived = await this.couponModel.findOneAndUpdate(
      {
        _id: couponId,
        archived_at: { $exists: false },
      },
      mongoSetUpdate({
        archived_at: archivedAt,
        archived_by_admin_id: actor.adminId,
        ...(actor.adminEmail
          ? { archived_by_admin_email: actor.adminEmail }
          : {}),
        disabled: true,
      }),
      { new: true },
    );

    if (archived) {
      return {
        alreadyArchived: false,
        archived: true,
        id: couponId.toHexString(),
        message: 'Coupon deleted successfully.',
      };
    }

    const existingCoupon = await this.couponModel.exists({ _id: couponId });
    if (!existingCoupon) {
      throw new NotFoundException('Coupon not found.');
    }

    return {
      alreadyArchived: true,
      archived: true,
      id: couponId.toHexString(),
      message: 'Coupon was already deleted.',
    };
  }

  async getCouponId(id: string, now = new Date()) {
    const offerId = requireObjectId(id, 'offer id');
    const coupons = (await this.couponModel
      .find({
        archived_at: { $exists: false },
        offer_id: offerId,
      })
      .populate('offer_id', [
        'offer_name',
        'offer_name_display',
        'tracking_link',
      ])
      .select(PUBLIC_COUPON_SELECT)
      .sort({ end_date: 1, createdAt: -1 })
      .lean()) as unknown as Record<string, any>[];
    return coupons
      .filter((coupon) => isPublicCouponEligible(coupon, now))
      .map(pickPublicCoupon);
  }

  private questTaskOfferObjectId(
    task: Partial<QuestTask> | any,
  ): Types.ObjectId | null {
    const raw = task?.offer?._id ?? task?.offer;
    if (!raw) return null;
    const value =
      raw instanceof Types.ObjectId ? raw.toHexString() : String(raw);
    return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
  }

  async getOfferExtraPoint() {
    const quest = await this.questModel
      .findOne(activeQuestFilter())
      .sort({ start_date: -1, _id: -1 })
      .lean();
    const tasks = ((quest as any)?.tasks ?? [])
      .filter(
        (task: Partial<QuestTask>) =>
          task.enabled !== false &&
          (task.task_type === undefined ||
            task.task_type === 'brand_purchase') &&
          Number(task.points ?? task.extra_point) > 1 &&
          this.questTaskOfferObjectId(task),
      )
      .sort(
        (a: Partial<QuestTask>, b: Partial<QuestTask>) =>
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      );

    if (tasks.length > 0) {
      const orderedOfferIds = tasks.map((task: Partial<QuestTask>) =>
        this.questTaskOfferObjectId(task),
      ) as Types.ObjectId[];
      const offers = await this.offerModel
        .find({
          _id: { $in: orderedOfferIds },
          ...ACTIVE_OFFER_FILTER,
        } as any)
        .lean();
      const offerById = new Map(
        offers.map((offer) => [String((offer as any)._id), offer]),
      );

      return tasks
        .map((task: Partial<QuestTask>) => {
          const offerId = this.questTaskOfferObjectId(task);
          if (!offerId) return null;
          const offer = offerById.get(offerId.toHexString());
          if (!offer) return null;
          const brand =
            (offer as any).offer_name_display ||
            (offer as any).offer_name ||
            'this merchant';
          const wordingEn =
            typeof task.wording_en === 'string' && task.wording_en.trim()
              ? task.wording_en.trim()
              : typeof task.wording === 'string' && task.wording.trim()
                ? task.wording.trim()
                : `Make an order on ${brand}`;
          const wordingTh =
            typeof task.wording_th === 'string' && task.wording_th.trim()
              ? task.wording_th.trim()
              : `สั่งซื้อที่ ${brand}`;
          return {
            ...offer,
            extra_point: Number(task.points ?? task.extra_point),
            quest_task_sort_order: Number(task.sort_order ?? 0),
            quest_task_wording: wordingEn,
            quest_task_wording_en: wordingEn,
            quest_task_wording_th: wordingTh,
          };
        })
        .filter((offer) => offer !== null);
    }

    if (effectiveQuestRewardModel((quest as any)?.reward_model) === 'task_v2') {
      return [];
    }

    return this.offerModel
      .find({ extra_point: { $gt: 1 }, ...ACTIVE_OFFER_FILTER } as any)
      .sort({ extra_point: -1, offer_name: 1 })
      .lean();
  }

  async saveMissingOrder(
    user_id: string,
    payload: SaveMissingOrderDto,
    files: Express.Multer.File[] | undefined,
  ) {
    if (files !== undefined && !Array.isArray(files)) {
      throw new BadRequestException(
        'Evidence files must be provided as an array.',
      );
    }
    const userObjectId = requireObjectId(user_id, 'user id');
    const offerObjectId = requireObjectId(payload.offer_id, 'offer id');
    const orderId = payload.orderId.trim();
    const amount = Number(payload.amount);
    const purchaseDate = new Date(payload.purchaseDate);
    if (
      !orderId ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Number.isNaN(purchaseDate.getTime())
    ) {
      throw new BadRequestException(
        'Order ID, purchase date, and amount must be valid.',
      );
    }
    if (files && files.length > 0) {
      throw new ServiceUnavailableException(
        MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE,
      );
    }
    const [offer, user] = await Promise.all([
      this.offerModel
        .findById(offerObjectId)
        .select('source offer_id offer_name offer_name_display')
        .lean(),
      this.userModel
        .findOne({ _id: userObjectId })
        .select('username name email mobile phone')
        .lean(),
    ]);
    if (!offer) {
      throw new NotFoundException(`Offer ${payload.offer_id} not found`);
    }
    if (!user) {
      throw new NotFoundException(`User ${user_id} not found`);
    }

    const offerRow = offer as unknown as {
      source?: string;
      offer_id?: number;
      offer_name?: string;
      offer_name_display?: string;
    };
    const userRow = user as unknown as {
      username?: string;
      name?: string;
      email?: string;
      mobile?: string;
      phone?: string;
    };
    const offerSource = offerRow.source?.trim() ?? '';
    const providerOfferId = Number(offerRow.offer_id);
    const offerName =
      offerRow.offer_name_display?.trim() || offerRow.offer_name?.trim() || '';
    if (!offerName) {
      throw new BadRequestException(
        'The selected brand is missing a display name. Choose another brand.',
      );
    }
    if (!offerSource || !Number.isFinite(providerOfferId)) {
      throw new ServiceUnavailableException(
        'The selected offer is missing canonical provider details.',
      );
    }

    const missingOrder = new this.missionOrderModel({
      user_id: userObjectId,
      offer_id: offerObjectId,
      customer_snapshot: buildMissionOrderCustomerSnapshot(userRow),
      offer_snapshot: {
        source: offerSource,
        provider_offer_id: providerOfferId,
        name: offerName,
      },
      evidence_refs: [],
      order_id: orderId,
      purchase_date: purchaseDate,
      remarks: payload.note.trim(),
      order_amount: amount,
      currency: 'THB',
      status: 'pending',
      notes: [],
      schema_version: MISSION_ORDER_SCHEMA_VERSION,
      dedupe_key: buildMissionOrderDedupeKey(
        user_id,
        payload.offer_id,
        orderId,
      ),
    });
    const saved = await missingOrder.save();
    const savedRow =
      typeof (saved as any).toObject === 'function'
        ? (saved as any).toObject()
        : saved;
    return toCustomerMissionOrderClaim(savedRow as Record<string, unknown>);
  }

  async getMissingOrder(
    page: number,
    limit: number,
    search: string,
    user_id: string,
  ) {
    // Escape user input before using it as a regex (ReDoS / injection guard).
    const safeSearch = escapeRegexLiteral(search ?? '');
    const filter = {
      user_id: new Types.ObjectId(user_id),
      $or: [
        { order_id: { $regex: safeSearch, $options: 'i' } },
        { orderId: { $regex: safeSearch, $options: 'i' } },
      ],
    };
    const data = await this.missionOrderModel
      .find(filter)
      .populate('offer_id', ['offer_name'])
      .populate('user_id', ['name', 'email'])
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const total = await this.missionOrderModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      data: data.map((row) =>
        toCustomerMissionOrderClaim(row as unknown as Record<string, unknown>),
      ),
    };
  }
}
