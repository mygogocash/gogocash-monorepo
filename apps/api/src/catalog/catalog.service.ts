import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';

import { Brand } from '../brand/schemas/brand.schema';
import {
  CreateCatalogBannerDto,
  CreateCatalogProductDto,
  ListCatalogDto,
  UpdateCatalogBannerDto,
  UpdateCatalogProductDto,
  UpdateShopDto,
} from './dto/catalog.dto';
import { escapeRegexLiteral } from './escape-regex';
import { CatalogBanner } from './schemas/catalog-banner.schema';
import type { CatalogBannerPlacement } from './schemas/catalog-banner.schema';
import { CatalogProduct } from './schemas/catalog-product.schema';

type Actor = { userId?: string; email?: string };

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(CatalogBanner.name)
    private readonly bannerModel: Model<CatalogBanner>,
    @InjectModel(CatalogProduct.name)
    private readonly productModel: Model<CatalogProduct>,
    @InjectModel(Brand.name) private readonly brandModel: Model<Brand>,
  ) {}

  async getHome(query: ListCatalogDto) {
    const [banners, shops, products] = await Promise.all([
      this.listPublishedBanners({
        ...query,
        placement: query.placement || 'home_hero',
      }),
      this.listPublishedShops(query),
      this.listPublishedProducts(query),
    ]);

    return { banners, shops, products };
  }

  async listPublishedBanners(query: ListCatalogDto = {}) {
    const now = new Date();
    const filter: QueryFilter<CatalogBanner> = {
      status: 'published',
      $and: [
        {
          $or: [
            { starts_at: { $exists: false } },
            { starts_at: { $lte: now } },
          ],
        },
        { $or: [{ ends_at: { $exists: false } }, { ends_at: { $gte: now } }] },
      ],
    };
    if (query.placement)
      filter.placement = this.toBannerPlacement(query.placement);
    if (query.locale) filter.locale = { $in: ['all', query.locale] };

    return this.bannerModel
      .find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(Math.min(query.limit || 10, 50))
      .lean()
      .exec();
  }

  async listPublishedProducts(query: ListCatalogDto = {}) {
    const filter = this.publishedProductFilter();
    if (query.shop_slug) filter.shop_slug = query.shop_slug;
    if (query.search) {
      filter.title = {
        $regex: escapeRegexLiteral(query.search),
        $options: 'i',
      };
    }

    return this.productModel
      .find(filter)
      .sort({ published_at: -1, createdAt: -1 })
      .limit(Math.min(query.limit || 20, 100))
      .lean()
      .exec();
  }

  async getPublishedProduct(slug: string) {
    const product = await this.productModel
      .findOne(this.publishedProductFilter({ slug }))
      .lean()
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async listPublishedShops(query: ListCatalogDto = {}) {
    const filter: QueryFilter<Brand> = {
      disabled: false,
      shop_visible: true,
      shop_status: 'published',
    };
    if (query.search) {
      filter.brand_name = {
        $regex: escapeRegexLiteral(query.search),
        $options: 'i',
      };
    }

    return this.brandModel
      .find(filter)
      .sort({ brand_name: 1 })
      .limit(Math.min(query.limit || 20, 100))
      .lean()
      .exec();
  }

  listAdminBanners(query: ListCatalogDto = {}) {
    const filter: QueryFilter<CatalogBanner> = {};
    if (query.placement)
      filter.placement = this.toBannerPlacement(query.placement);
    return this.bannerModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(Math.min(query.limit || 50, 100))
      .lean()
      .exec();
  }

  async createBanner(dto: CreateCatalogBannerDto, actor?: Actor) {
    this.assertValidSchedule(dto.starts_at, dto.ends_at);
    return this.bannerModel.create({
      ...dto,
      created_by: actor?.email || actor?.userId,
      updated_by: actor?.email || actor?.userId,
      starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
    });
  }

  async updateBanner(id: string, dto: UpdateCatalogBannerDto, actor?: Actor) {
    this.assertObjectId(id);
    this.assertValidSchedule(dto.starts_at, dto.ends_at);
    const updated = await this.bannerModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          updated_by: actor?.email || actor?.userId,
          starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
          ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Banner not found');
    return updated;
  }

  archiveBanner(id: string, actor?: Actor) {
    return this.updateBanner(
      id,
      { status: 'archived' } as UpdateCatalogBannerDto,
      actor,
    );
  }

  listAdminProducts(query: ListCatalogDto = {}) {
    const filter: QueryFilter<CatalogProduct> = {};
    if (query.shop_slug) filter.shop_slug = query.shop_slug;
    if (query.search) {
      filter.title = {
        $regex: escapeRegexLiteral(query.search),
        $options: 'i',
      };
    }
    return this.productModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(Math.min(query.limit || 50, 100))
      .lean()
      .exec();
  }

  async createProduct(dto: CreateCatalogProductDto, actor?: Actor) {
    await this.assertBrandExists(dto.brand_id);
    await this.assertSlugAvailable(dto.slug);
    this.assertValidSchedule(dto.scheduled_start_at, dto.scheduled_end_at);
    return this.productModel.create({
      ...dto,
      brand_id: new Types.ObjectId(dto.brand_id),
      offer_id: dto.offer_id ? new Types.ObjectId(dto.offer_id) : undefined,
      slug: this.normalizeSlug(dto.slug),
      currency: dto.currency.toUpperCase(),
      published_at: dto.status === 'published' ? new Date() : undefined,
      scheduled_start_at: dto.scheduled_start_at
        ? new Date(dto.scheduled_start_at)
        : undefined,
      scheduled_end_at: dto.scheduled_end_at
        ? new Date(dto.scheduled_end_at)
        : undefined,
      created_by: actor?.email || actor?.userId,
      updated_by: actor?.email || actor?.userId,
    });
  }

  async updateProduct(id: string, dto: UpdateCatalogProductDto, actor?: Actor) {
    this.assertObjectId(id);
    if (dto.brand_id) await this.assertBrandExists(dto.brand_id);
    if (dto.slug) await this.assertSlugAvailable(dto.slug, id);
    this.assertValidSchedule(dto.scheduled_start_at, dto.scheduled_end_at);

    const patch: Record<string, unknown> = {
      ...dto,
      updated_by: actor?.email || actor?.userId,
    };
    if (dto.brand_id) patch.brand_id = new Types.ObjectId(dto.brand_id);
    if (dto.offer_id) patch.offer_id = new Types.ObjectId(dto.offer_id);
    if (dto.slug) patch.slug = this.normalizeSlug(dto.slug);
    if (dto.currency) patch.currency = dto.currency.toUpperCase();
    if (dto.status === 'published') patch.published_at = new Date();
    if (dto.scheduled_start_at)
      patch.scheduled_start_at = new Date(dto.scheduled_start_at);
    if (dto.scheduled_end_at)
      patch.scheduled_end_at = new Date(dto.scheduled_end_at);

    const updated = await this.productModel
      .findByIdAndUpdate(id, patch, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  archiveProduct(id: string, actor?: Actor) {
    return this.updateProduct(
      id,
      { status: 'archived' } as UpdateCatalogProductDto,
      actor,
    );
  }

  listAdminShops(query: ListCatalogDto = {}) {
    const filter: QueryFilter<Brand> = { disabled: false };
    if (query.search) {
      filter.brand_name = {
        $regex: escapeRegexLiteral(query.search),
        $options: 'i',
      };
    }
    return this.brandModel
      .find(filter)
      .sort({ updatedAt: -1, brand_name: 1 })
      .limit(Math.min(query.limit || 50, 100))
      .lean()
      .exec();
  }

  listAdminBrands(query: ListCatalogDto = {}) {
    return this.listAdminShops(query);
  }

  async updateShop(brandId: string, dto: UpdateShopDto, actor?: Actor) {
    this.assertObjectId(brandId);
    if (dto.shop_slug) {
      const existing = await this.brandModel
        .findOne({ shop_slug: dto.shop_slug, _id: { $ne: brandId } })
        .lean()
        .exec();
      if (existing) throw new ConflictException('Shop slug already exists');
    }

    const updated = await this.brandModel
      .findByIdAndUpdate(
        brandId,
        {
          ...dto,
          shop_slug: dto.shop_slug
            ? this.normalizeSlug(dto.shop_slug)
            : dto.shop_slug,
          fulfillment_owner: dto.fulfillment_owner || 'gogocash',
          updated_by: actor?.email || actor?.userId,
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Brand not found');
    return updated;
  }

  private async assertBrandExists(id: string) {
    this.assertObjectId(id);
    const exists = await this.brandModel.exists({ _id: id, disabled: false });
    if (!exists) throw new BadRequestException('Brand does not exist');
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const normalized = this.normalizeSlug(slug);
    const filter: QueryFilter<CatalogProduct> = { slug: normalized };
    if (exceptId) filter._id = { $ne: exceptId };
    const existing = await this.productModel.findOne(filter).lean().exec();
    if (existing) throw new ConflictException('Product slug already exists');
  }

  private normalizeSlug(slug: string) {
    return slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private assertValidSchedule(startsAt?: string, endsAt?: string) {
    if (
      startsAt &&
      endsAt &&
      new Date(startsAt).getTime() > new Date(endsAt).getTime()
    ) {
      throw new BadRequestException('Schedule start must be before end');
    }
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
  }

  private publishedProductFilter(
    filter: QueryFilter<CatalogProduct> = {},
  ): QueryFilter<CatalogProduct> {
    const now = new Date();
    return {
      ...filter,
      status: 'published',
      $and: [
        {
          $or: [
            { scheduled_start_at: { $exists: false } },
            { scheduled_start_at: { $lte: now } },
          ],
        },
        {
          $or: [
            { scheduled_end_at: { $exists: false } },
            { scheduled_end_at: { $gte: now } },
          ],
        },
      ],
    };
  }

  private toBannerPlacement(value: string): CatalogBannerPlacement {
    const allowed: CatalogBannerPlacement[] = [
      'home_hero',
      'home_grid',
      'shop_list',
      'product_detail',
      'modal',
    ];
    if (!allowed.includes(value as CatalogBannerPlacement)) {
      throw new BadRequestException('Invalid banner placement');
    }
    return value as CatalogBannerPlacement;
  }
}
