import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import {
  requireObjectId,
  mongoSetUpdate,
  mongoCaseInsensitiveRegex,
} from 'src/common/mongo-query';
import { countryFilterRegex } from 'src/utils/country';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { Offer, OfferDocument } from '../offer/schemas/offer.schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ListBrandsDto } from './dto/list-brands.dto';

/**
 * Plain-object shapes used by the controller. Kept explicit so the
 * inferred Mongoose return types don't leak through public APIs.
 */
interface BrandLean extends Brand {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
interface VariantLean extends Offer {
  _id: Types.ObjectId;
}
export interface BrandWithVariants extends BrandLean {
  variants: VariantLean[];
}
export interface BrandListResponse {
  data: BrandWithVariants[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface BrandResolveResponse {
  brand: BrandLean;
  variant: VariantLean;
}

/**
 * Slugify a brand name into a URL-safe identifier.
 * - lowercase, ASCII-folded (drop diacritics)
 * - non-alphanumerics collapsed to single underscore
 * - trim leading/trailing underscores
 *
 * Mirrors the customer-app `slugifyBrandForLookup` so generated slugs line up
 * with `lookup_value` stems used for the dedupe heuristic.
 */
export function slugifyBrand(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

@Injectable()
export class BrandService {
  constructor(
    @InjectModel(Brand.name) private readonly brandModel: Model<BrandDocument>,
    @InjectModel(Offer.name) private readonly offerModel: Model<OfferDocument>,
  ) {}

  /** Create a new parent brand. Auto-generates `brand_slug` if omitted. */
  async create(dto: CreateBrandDto): Promise<BrandDocument> {
    const slug = (dto.brand_slug || slugifyBrand(dto.brand_name)).trim();
    if (!slug) {
      throw new BadRequestException(
        'Could not derive a brand_slug from the supplied name; pass `brand_slug` explicitly.',
      );
    }
    const existing = await this.brandModel.findOne({ brand_slug: slug }).lean();
    if (existing) {
      throw new ConflictException(
        `A brand with slug "${slug}" already exists. Pass a different brand_slug or update the existing record.`,
      );
    }
    if (dto.is_global && !dto.default_country) {
      throw new BadRequestException(
        'Global brands must specify a `default_country` so customers without a dedicated variant can be routed to it.',
      );
    }
    const created = await this.brandModel.create({
      ...dto,
      brand_slug: slug,
    });
    return created;
  }

  /**
   * Paginated brand list with each brand's country variants (offer rows) embedded.
   * The admin grouped table calls this once and renders both layers without extra queries.
   */
  async list(dto: ListBrandsDto): Promise<BrandListResponse> {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 200);
    const filter: QueryFilter<Brand> = { disabled: false };
    if (dto.search) {
      filter.brand_name = mongoCaseInsensitiveRegex(dto.search);
    }
    if (dto.is_global === 'true') filter.is_global = true;
    if (dto.is_global === 'false') filter.is_global = false;

    // Country filter happens at the variants stage to avoid stale brand-only matches.
    const [brandsRaw, totalAll] = await Promise.all([
      this.brandModel
        .find(filter)
        .sort({ brand_name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.brandModel.countDocuments(filter),
    ]);

    const ids = brandsRaw.map((b) => b._id);
    const variantFilter: QueryFilter<Offer> = { brand_id: { $in: ids } };
    const variantCountryRegex = countryFilterRegex(dto.country);
    if (variantCountryRegex)
      variantFilter.countries = { $regex: variantCountryRegex, $options: 'i' };
    const variants = await this.offerModel
      .find(variantFilter)
      .select(
        '_id brand_id offer_name offer_name_display countries currency commission_store disabled tracking_link logo logo_circle banner extra_store',
      )
      .lean();

    const variantsByBrand = new Map<string, Offer[]>();
    for (const v of variants) {
      const key = String(v.brand_id);
      if (!variantsByBrand.has(key)) variantsByBrand.set(key, []);
      variantsByBrand.get(key)!.push(v);
    }

    // Drop brands with no variants when a country filter was specified — empty groups would be confusing.
    const brands: BrandWithVariants[] = brandsRaw
      .map((b) => ({
        ...(b as BrandLean),
        variants: (variantsByBrand.get(String(b._id)) ?? []) as VariantLean[],
      }))
      .filter((b) => (variantCountryRegex ? b.variants.length > 0 : true));

    // Country mode is defined by the APPLIED filter (null for blank/whitespace
    // input), so the zero-variant drop and totals can't diverge from it.
    return {
      data: brands,
      page,
      limit,
      total: variantCountryRegex ? brands.length : totalAll,
      totalPages: Math.max(
        1,
        Math.ceil((variantCountryRegex ? brands.length : totalAll) / limit),
      ),
    };
  }

  /** Single brand with all variants populated (for the admin edit drawer). */
  async findOne(id: string): Promise<BrandWithVariants> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid brand id.');
    const brand = await this.brandModel.findById(id).lean();
    if (!brand) throw new NotFoundException('Brand not found.');
    const variants = await this.offerModel.find({ brand_id: brand._id }).lean();
    return { ...(brand as BrandLean), variants: variants as VariantLean[] };
  }

  /**
   * Resolve the customer-facing variant for a brand and a given user country.
   * Mirrors the customer-app helper but server-side so deep-links (e.g. `/open/brand/apple`)
   * pick the right tracking link without a client round-trip.
   */
  async resolveVariant(
    brandSlug: string,
    userCountry: string | null,
  ): Promise<BrandResolveResponse> {
    const brand = await this.brandModel
      .findOne({ brand_slug: brandSlug, disabled: false })
      .lean();
    if (!brand) throw new NotFoundException('Brand not found.');
    const variants = await this.offerModel
      .find({
        brand_id: brand._id,
        disabled: false,
        status: { $nin: ['pending_review', 'rejected'] },
      })
      .lean();
    if (variants.length === 0) {
      throw new NotFoundException('Brand has no active variants.');
    }
    // Reproduces lib/offer/offerVisibility.ts pickBrandVariant priority on the
    // server. Variant matching reuses the SAME regex as the list filter so the
    // two paths cannot disagree (review find: a token-split matcher could
    // never match the comma-containing "Korea, Republic of" spelling that the
    // regex path matches).
    const matches = (v: Offer, regexSource: string) =>
      new RegExp(regexSource, 'i').test(v.countries ?? '');

    const brandLean = brand as BrandLean;
    const requestedRegex = countryFilterRegex(userCountry);
    if (requestedRegex) {
      const variant = variants.find((v) => matches(v as Offer, requestedRegex));
      if (variant) return { brand: brandLean, variant: variant as VariantLean };
    }
    const defaultRegex = countryFilterRegex(brand.default_country);
    if (defaultRegex) {
      const variant = variants.find((v) => matches(v as Offer, defaultRegex));
      if (variant) return { brand: brandLean, variant: variant as VariantLean };
    }
    return { brand: brandLean, variant: variants[0] as VariantLean };
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandDocument> {
    const brandId = requireObjectId(id, 'brand id');
    if (dto.brand_slug) {
      const slug = dto.brand_slug.trim();
      const conflict = await this.brandModel
        .findOne({ brand_slug: slug, _id: { $ne: brandId } })
        .lean();
      if (conflict) {
        throw new ConflictException(
          `Slug "${slug}" is already used by another brand.`,
        );
      }
    }
    if (dto.is_global === true && dto.default_country === '') {
      throw new BadRequestException(
        'Cannot enable is_global without a default_country. Set the fallback country first.',
      );
    }
    const patch: Partial<UpdateBrandDto> = {};
    if (dto.brand_name !== undefined) patch.brand_name = dto.brand_name;
    if (dto.brand_slug !== undefined) patch.brand_slug = dto.brand_slug;
    if (dto.default_country !== undefined)
      patch.default_country = dto.default_country;
    if (dto.is_global !== undefined) patch.is_global = dto.is_global;
    if (dto.logo !== undefined) patch.logo = dto.logo;
    if (dto.logo_circle !== undefined) patch.logo_circle = dto.logo_circle;
    if (dto.banner !== undefined) patch.banner = dto.banner;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.categories !== undefined) patch.categories = dto.categories;
    if (dto.shop_slug !== undefined) patch.shop_slug = dto.shop_slug;
    if (dto.shop_status !== undefined) patch.shop_status = dto.shop_status;
    if (dto.shop_visible !== undefined) patch.shop_visible = dto.shop_visible;
    if (dto.fulfillment_owner !== undefined) {
      patch.fulfillment_owner = dto.fulfillment_owner;
    }
    if (dto.support_email !== undefined)
      patch.support_email = dto.support_email;
    if (dto.support_url !== undefined) patch.support_url = dto.support_url;
    if (dto.return_policy !== undefined)
      patch.return_policy = dto.return_policy;
    if (dto.shipping_policy !== undefined) {
      patch.shipping_policy = dto.shipping_policy;
    }

    const updated = await this.brandModel.findByIdAndUpdate(
      brandId,
      mongoSetUpdate(patch),
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updated) throw new NotFoundException('Brand not found.');

    // Mirror visibility fields onto every variant so the customer-side filter stays
    // consistent without a join. Touching only the changed flags avoids redundant writes.
    const variantPatch: Partial<Offer> = {};
    if (dto.is_global !== undefined) variantPatch.is_global = dto.is_global;
    if (dto.default_country !== undefined)
      variantPatch.default_country = dto.default_country;
    if (Object.keys(variantPatch).length > 0) {
      await this.offerModel.updateMany(
        { brand_id: updated._id },
        { $set: variantPatch },
      );
    }

    return updated;
  }

  /**
   * Soft-delete: marks the brand `disabled=true` and disables every variant.
   * Variants stay in the offers collection so historical orders/conversions remain valid.
   */
  async softDelete(id: string): Promise<{ id: string; disabled: true }> {
    const brandId = requireObjectId(id, 'brand id');
    const brand = await this.brandModel.findById(brandId);
    if (!brand) throw new NotFoundException('Brand not found.');
    brand.disabled = true;
    await brand.save();
    await this.offerModel.updateMany(
      { brand_id: brand._id },
      { $set: { disabled: true } },
    );
    return { id: String(brand._id), disabled: true };
  }
}
