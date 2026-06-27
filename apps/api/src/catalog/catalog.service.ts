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
import {
  mongoCaseInsensitiveRegex,
  mongoEq,
  mongoFilter,
  mongoSetUpdate,
  normalizeSlugSegment,
  requireObjectId,
  requireOneOf,
  requireTrimmedString,
} from 'src/common/mongo-query';
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
    if (query.locale) {
      const locale = requireOneOf(
        query.locale,
        ['en', 'th', 'all'] as const,
        'locale',
      );
      filter.locale = { $in: ['all', locale] };
    }

    return this.bannerModel
      .find(mongoFilter(filter))
      .sort({ priority: -1, createdAt: -1 })
      .limit(Math.min(query.limit || 10, 50))
      .lean()
      .exec();
  }

  async listPublishedProducts(query: ListCatalogDto = {}) {
    const filter = this.publishedProductFilter();
    if (query.shop_slug)
      filter.shop_slug = mongoEq(normalizeSlugSegment(query.shop_slug));
    if (query.search) {
      filter.title = mongoCaseInsensitiveRegex(query.search);
    }

    return this.productModel
      .find(mongoFilter(filter))
      .sort({ published_at: -1, createdAt: -1 })
      .limit(Math.min(query.limit || 20, 100))
      .lean()
      .exec();
  }

  async getPublishedProduct(slug: string) {
    const product = await this.productModel
      .findOne(
        mongoFilter(
          this.publishedProductFilter({
            slug: mongoEq(normalizeSlugSegment(slug)),
          }),
        ),
      )
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
      filter.brand_name = mongoCaseInsensitiveRegex(query.search);
    }

    return this.brandModel
      .find(mongoFilter(filter))
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
      .find(mongoFilter(filter))
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
        requireObjectId(id),
        mongoSetUpdate(this.buildBannerSetFields(dto, actor)),
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
    if (query.shop_slug)
      filter.shop_slug = mongoEq(normalizeSlugSegment(query.shop_slug));
    if (query.search) {
      filter.title = mongoCaseInsensitiveRegex(query.search);
    }
    return this.productModel
      .find(mongoFilter(filter))
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

    const updated = await this.productModel
      .findByIdAndUpdate(
        requireObjectId(id),
        mongoSetUpdate(this.buildProductSetFields(dto, actor)),
        { new: true },
      )
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
      filter.brand_name = mongoCaseInsensitiveRegex(query.search);
    }
    return this.brandModel
      .find(mongoFilter(filter))
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
        .findOne(
          mongoFilter({
            shop_slug: mongoEq(this.normalizeSlug(dto.shop_slug)),
            _id: { $ne: requireObjectId(brandId) },
          }),
        )
        .lean()
        .exec();
      if (existing) throw new ConflictException('Shop slug already exists');
    }

    const updated = await this.brandModel
      .findByIdAndUpdate(
        requireObjectId(brandId),
        mongoSetUpdate(this.buildShopSetFields(dto, actor)),
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Brand not found');
    return updated;
  }

  private async assertBrandExists(id: string) {
    this.assertObjectId(id);
    const exists = await this.brandModel.exists(
      mongoFilter({ _id: requireObjectId(id), disabled: false }),
    );
    if (!exists) throw new BadRequestException('Brand does not exist');
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const normalized = this.normalizeSlug(slug);
    const filter: QueryFilter<CatalogProduct> = {
      slug: mongoEq(normalized),
    };
    if (exceptId) {
      filter._id = { $ne: requireObjectId(exceptId) };
    }
    const existing = await this.productModel
      .findOne(mongoFilter(filter))
      .lean()
      .exec();
    if (existing) throw new ConflictException('Product slug already exists');
  }

  private normalizeSlug(slug: string) {
    return normalizeSlugSegment(slug, 120);
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
    requireObjectId(id);
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

  private buildBannerSetFields(
    dto: UpdateCatalogBannerDto,
    actor?: Actor,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      updated_by: actor?.email || actor?.userId,
    };
    if (dto.title !== undefined) {
      fields.title = requireTrimmedString(dto.title, 140, 'title');
    }
    if (dto.subtitle !== undefined) {
      fields.subtitle = requireTrimmedString(dto.subtitle, 280, 'subtitle');
    }
    if (dto.image_url !== undefined) {
      fields.image_url = requireTrimmedString(dto.image_url, 500, 'image url');
    }
    if (dto.image_alt !== undefined) {
      fields.image_alt = requireTrimmedString(dto.image_alt, 160, 'image alt');
    }
    if (dto.placement !== undefined) {
      fields.placement = this.toBannerPlacement(dto.placement);
    }
    if (dto.locale !== undefined) {
      fields.locale = requireTrimmedString(dto.locale, 40, 'locale');
    }
    if (dto.device !== undefined) fields.device = dto.device;
    if (dto.cta_type !== undefined) fields.cta_type = dto.cta_type;
    if (dto.cta_value !== undefined) {
      fields.cta_value = requireTrimmedString(dto.cta_value, 500, 'cta value');
    }
    if (dto.priority !== undefined) fields.priority = dto.priority;
    if (dto.status !== undefined) fields.status = dto.status;
    if (dto.starts_at !== undefined) {
      fields.starts_at = new Date(dto.starts_at);
    }
    if (dto.ends_at !== undefined) {
      fields.ends_at = new Date(dto.ends_at);
    }
    return fields;
  }

  private buildProductSetFields(
    dto: UpdateCatalogProductDto,
    actor?: Actor,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      updated_by: actor?.email || actor?.userId,
    };
    if (dto.title !== undefined) {
      fields.title = requireTrimmedString(dto.title, 160, 'title');
    }
    if (dto.slug !== undefined) {
      fields.slug = this.normalizeSlug(dto.slug);
    }
    if (dto.description !== undefined) {
      fields.description = requireTrimmedString(
        dto.description,
        2000,
        'description',
      );
    }
    if (dto.brand_id !== undefined) {
      fields.brand_id = requireObjectId(dto.brand_id, 'brand id');
    }
    if (dto.offer_id !== undefined) {
      fields.offer_id = requireObjectId(dto.offer_id, 'offer id');
    }
    if (dto.shop_slug !== undefined) {
      fields.shop_slug = normalizeSlugSegment(dto.shop_slug);
    }
    if (dto.default_sku !== undefined) {
      fields.default_sku = requireTrimmedString(dto.default_sku, 120, 'sku');
    }
    if (dto.price_amount !== undefined) fields.price_amount = dto.price_amount;
    if (dto.currency !== undefined) {
      fields.currency = dto.currency.toUpperCase();
    }
    if (dto.inventory_quantity !== undefined) {
      fields.inventory_quantity = dto.inventory_quantity;
    }
    if (dto.images !== undefined) fields.images = dto.images;
    if (dto.variants !== undefined) fields.variants = dto.variants;
    if (dto.tags !== undefined) fields.tags = dto.tags;
    if (dto.status !== undefined) fields.status = dto.status;
    if (dto.status === 'published') fields.published_at = new Date();
    if (dto.scheduled_start_at !== undefined) {
      fields.scheduled_start_at = new Date(dto.scheduled_start_at);
    }
    if (dto.scheduled_end_at !== undefined) {
      fields.scheduled_end_at = new Date(dto.scheduled_end_at);
    }
    if (dto.seo_title !== undefined) {
      fields.seo_title = requireTrimmedString(dto.seo_title, 80, 'seo title');
    }
    if (dto.seo_description !== undefined) {
      fields.seo_description = requireTrimmedString(
        dto.seo_description,
        180,
        'seo description',
      );
    }
    return fields;
  }

  private buildShopSetFields(
    dto: UpdateShopDto,
    actor?: Actor,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      updated_by: actor?.email || actor?.userId,
    };
    if (dto.shop_slug !== undefined) {
      fields.shop_slug = this.normalizeSlug(dto.shop_slug);
    }
    if (dto.shop_status !== undefined) fields.shop_status = dto.shop_status;
    if (dto.shop_visible !== undefined) fields.shop_visible = dto.shop_visible;
    fields.fulfillment_owner = dto.fulfillment_owner || 'gogocash';
    if (dto.support_email !== undefined) {
      fields.support_email = requireTrimmedString(
        dto.support_email,
        180,
        'support email',
      );
    }
    if (dto.support_url !== undefined) {
      fields.support_url = requireTrimmedString(
        dto.support_url,
        500,
        'support url',
      );
    }
    if (dto.return_policy !== undefined) {
      fields.return_policy = requireTrimmedString(
        dto.return_policy,
        2000,
        'return policy',
      );
    }
    if (dto.shipping_policy !== undefined) {
      fields.shipping_policy = requireTrimmedString(
        dto.shipping_policy,
        2000,
        'shipping policy',
      );
    }
    return fields;
  }
}
