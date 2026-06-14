import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
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
      filter.brand_name = { $regex: dto.search.trim(), $options: 'i' };
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
    if (dto.country)
      variantFilter.countries = { $regex: dto.country, $options: 'i' };
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
      .filter((b) => (dto.country ? b.variants.length > 0 : true));

    return {
      data: brands,
      page,
      limit,
      total: dto.country ? brands.length : totalAll,
      totalPages: Math.max(
        1,
        Math.ceil((dto.country ? brands.length : totalAll) / limit),
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
      .find({ brand_id: brand._id, disabled: false })
      .lean();
    if (variants.length === 0) {
      throw new NotFoundException('Brand has no active variants.');
    }
    // Reproduces lib/offer/offerVisibility.ts pickBrandVariant priority on the server.
    const normalized = (userCountry ?? '').trim().toLowerCase();
    const matches = (v: Offer, country: string) =>
      (v.countries ?? '')
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean)
        .includes(country);

    const brandLean = brand as BrandLean;
    if (normalized) {
      const variant = variants.find((v) => matches(v as Offer, normalized));
      if (variant) return { brand: brandLean, variant: variant as VariantLean };
    }
    const def = (brand.default_country ?? '').trim().toLowerCase();
    if (def) {
      const variant = variants.find((v) => matches(v as Offer, def));
      if (variant) return { brand: brandLean, variant: variant as VariantLean };
    }
    return { brand: brandLean, variant: variants[0] as VariantLean };
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid brand id.');
    if (dto.brand_slug) {
      const slug = dto.brand_slug.trim();
      const conflict = await this.brandModel
        .findOne({ brand_slug: slug, _id: { $ne: id } })
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
    const updated = await this.brandModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
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
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid brand id.');
    const brand = await this.brandModel.findById(id);
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
