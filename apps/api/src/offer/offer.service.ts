import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { Offer, OfferDocument } from 'src/offer/schemas/offer.schema';
import { User } from 'src/user/schemas/user.schema';
import { GetMyOfferDto, SaveMissingOrderDto } from './dto/create-offer.dto';
import { join } from 'path';
import { promises as fs } from 'fs';
import { Category } from './schemas/category.schema';
import { FavoriteOffer } from './schemas/favorite-offer.schema';
import { Banner } from './schemas/banner.schema';
import { TopBrandConfig } from './schemas/top-brand-config.schema';
import { Coupon } from './schemas/coupon.schema';
import { UpdateCouponDto } from './dto/update-offer.dto';
import { MissionOrder } from './schemas/missing-order.schema';
import { StoredMediaService } from 'src/media/stored-media.service';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import { parseOfferDisplayTagsField } from './offer-display-tags.util';
import { Quest, QuestTask } from 'src/point/schemas/quest.schema';
import { FeaturedSearchTerm } from 'src/admin/search/schemas/featured-term.schema';
import { SearchBoostRule } from 'src/admin/search/schemas/boost-rule.schema';
import { SearchBlacklist } from 'src/admin/search/schemas/blacklist.schema';
import { escapeRegexLiteral } from 'src/common/escape-regex';
import { requireObjectId, mongoSetUpdate } from 'src/common/mongo-query';

const ACTIVE_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
};

function activeQuestFilter(now = new Date()) {
  return {
    status: 'open',
    $and: [
      {
        $or: [
          { start_date: { $exists: false } },
          { start_date: null },
          { start_date: { $lte: now } },
        ],
      },
      {
        $or: [
          { end_date: { $exists: false } },
          { end_date: null },
          { end_date: { $gte: now } },
        ],
      },
    ],
  };
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
  'source',
  'brand_id',
  'is_global',
  'default_country',
  'policy_category_id',
  'custom_terms',
  'note_to_user',
] as const;
const PUBLIC_OFFER_DETAIL_SELECT = PUBLIC_OFFER_DETAIL_FIELDS.join(' ');

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

function parseProductTypeRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
    @InjectModel(TopBrandConfig.name)
    private topBrandConfigModel: Model<TopBrandConfig>,
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
      filter.$or = [
        { offer_name: { $regex: safeSearch, $options: 'i' } },
        { offer_name_display: { $regex: safeSearch, $options: 'i' } },
        { categories: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (categories) {
      filter['categories'] = {
        $regex: escapeRegexLiteral(categories),
        $options: 'i',
      };
    }
    if (country) {
      filter['countries'] = {
        $regex: escapeRegexLiteral(country),
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
    const data = await this.offerModel
      .find(filter)
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
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
      return !blacklist.some((entry) =>
        haystack.includes(String(entry.term).toLowerCase()),
      );
    });

    const boostMap = new Map(
      boosts.map((rule) => [
        String(rule.offer_id),
        Number(rule.boost_weight ?? 1),
      ]),
    );
    const featuredTerms = featured.map((entry) =>
      String(entry.term).toLowerCase(),
    );

    return [...filtered].sort((left, right) => {
      const scoreFor = (offer: OfferDocument) => {
        const id = String(offer._id);
        const haystack =
          `${offer.offer_name_display ?? ''} ${offer.offer_name ?? ''}`.toLowerCase();
        let score = boostMap.get(id) ?? 0;
        if (
          featuredTerms.some(
            (term) => normalizedQuery.includes(term) && haystack.includes(term),
          )
        ) {
          score += 1000;
        }
        return score;
      };

      return scoreFor(right) - scoreFor(left);
    });
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
    return pickPublicOfferDetail(offer as Record<string, any> | null);
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

    const upload = async (label: string, file?: Express.Multer.File) => {
      if (!file) return '';
      try {
        return await this.storedMediaService.upload(file, MEDIA_FOLDER.BRANDS);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new InternalServerErrorException(
          `Failed to upload ${label}: ${reason}`,
        );
      }
    };
    const [logoDesktop, logoMobile, banner, bannerMobile, logoCircle] =
      await Promise.all([
        upload('logo (desktop)', files.logo_desktop?.[0]),
        upload('logo (mobile)', files.logo_mobile?.[0]),
        upload('banner', files.banner?.[0]),
        upload('banner (mobile)', files.banner_mobile?.[0]),
        upload('logo (circle)', files.logo_circle?.[0]),
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
      logo: logoDesktop || logoMobile || String(body.logo ?? ''),
      lookup_value:
        String(body.lookup_value ?? '').trim() ||
        slugifyOfferLookup(brandName) ||
        `brand_${manualId}`,
      validation_terms: 30,
      payment_terms: 60,
      datetime_updated: now,
      datetime_created: now,
      marketplace_store_offer: true,
      categories: String(body.categories ?? 'Shopping').trim() || 'Shopping',
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
      logo_desktop: logoDesktop,
      logo_mobile: logoMobile,
      banner,
      banner_mobile: bannerMobile,
      logo_circle: logoCircle,
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
      default_country: String(body.default_country ?? '').trim() || undefined,
      app_deeplink: String(body.app_deeplink ?? '').trim() || undefined,
      offer_display_tags: parseOfferDisplayTagsField(body.offer_display_tags),
    });
  }

  async getCategoryList(search: string) {
    const filter = {};
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

  /**
   * Public home "top brands": the admin-curated, ordered list (saveTopBrands).
   * Resolves each saved offerId to live brand name + logo, pairs it with the
   * admin-set cashback label, and preserves the saved order. Unknown offer ids
   * are dropped; no config → empty list (the client falls back to fixtures).
   */
  async getDisplayTopBrands() {
    const config = await this.topBrandConfigModel.findOne().exec();
    const entries = config?.brands ?? [];
    if (entries.length === 0) {
      return { data: [] };
    }

    const offers = await this.offerModel
      .find({
        _id: { $in: entries.map((entry) => entry.offerId) },
        ...ACTIVE_OFFER_FILTER,
      } as any)
      .select('offer_id offer_name logo')
      .exec();
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    const data = entries
      .map((entry) => {
        const offer = offerById.get(entry.offerId);
        if (!offer) {
          return null;
        }
        return {
          _id: String((offer as any)._id),
          offer_id: offer.offer_id,
          brand: offer.offer_name,
          logo: offer.logo,
          cashback: entry.cashback,
        };
      })
      .filter((brand) => brand !== null);

    return { data };
  }

  async updateCoupon(body: UpdateCouponDto) {
    const offerId = requireObjectId(String(body.offer_id), 'offer_id');
    const discount = body.discount ? Number(body.discount) : 0;
    const quantity = body.quantity ? Number(body.quantity) : 0;
    const disabled = parseBoolean(body.disabled);
    const patch = {
      offer_id: offerId,
      discount,
      quantity,
      disabled,
      name: body.name,
      code: body.code ?? '',
      description: body.description ?? '',
      start_date: body.start_date,
      end_date: body.end_date,
      eligibility: body.eligibility ?? '',
      min_spend: body.min_spend ?? '',
      link: body.link ?? '',
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
    const filter =
      search.trim().length > 0
        ? {
            $or: [
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
            ],
          }
        : {};
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

  async getCouponId(id: string) {
    return this.couponModel
      .find({ offer_id: new Types.ObjectId(id) })
      .populate('offer_id', ['offer_name']);
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
    const quest = await this.questModel.findOne(activeQuestFilter()).lean();
    const tasks = ((quest as any)?.tasks ?? [])
      .filter(
        (task: Partial<QuestTask>) =>
          task.enabled !== false &&
          Number(task.extra_point) > 1 &&
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
            extra_point: Number(task.extra_point),
            quest_task_sort_order: Number(task.sort_order ?? 0),
            quest_task_wording: wordingEn,
            quest_task_wording_en: wordingEn,
            quest_task_wording_th: wordingTh,
          };
        })
        .filter((offer) => offer !== null);
    }

    return this.offerModel
      .find({ extra_point: { $gt: 1 }, ...ACTIVE_OFFER_FILTER } as any)
      .sort({ extra_point: -1, offer_name: 1 })
      .lean();
  }

  async saveMissingOrder(
    user_id: string,
    payload: SaveMissingOrderDto,
    files: Express.Multer.File[],
  ) {
    // console.log('payload', payload);
    // console.log('files', files);
    // console.log('user_id', user_id);
    // return true;
    const fileId = [];
    if (files.length > 0) {
      for (const file of files) {
        const upload = await this.storedMediaService.upload(
          file,
          MEDIA_FOLDER.MISSING_ORDERS,
        );
        fileId.push(upload);
      }
    }
    const missingOrder = new this.missionOrderModel({
      user_id: new Types.ObjectId(user_id),
      offer_id: new Types.ObjectId(payload.offer_id),
      attachments: fileId,
      orderId: payload.orderId,
      purchaseDate: payload.purchaseDate,
      note: payload.note,
      amount: payload.amount,
      status: 'pending',
    });
    return missingOrder.save();
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
      $or: [{ orderId: { $regex: safeSearch, $options: 'i' } }],
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

    return { page, limit, total, totalPages, data };
  }
}
