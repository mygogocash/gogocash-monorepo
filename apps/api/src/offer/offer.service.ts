import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
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
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
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
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /**
   * One-shot index migration: the former `{ offer_id: 1 }` unique index becomes
   * a compound `{ source, offer_id }` after the Optimise integration. Drop the
   * legacy index on startup if it still exists so Mongoose can create the new
   * compound index cleanly. Idempotent — a no-op once the migration has run.
   */
  async onApplicationBootstrap(): Promise<void> {
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
      filter['offer_name'] = { $regex: search, $options: 'i' };
    }
    if (categories) {
      // const categoriesArray = categories.split(',').map((cat) => cat.trim());
      filter['categories'] = { $regex: categories, $options: 'i' };
    }
    if (country) {
      // const countryArray = country.split(',').map((c) => c.trim());
      filter['countries'] = { $regex: country, $options: 'i' };
    }
    if (!admin) {
      filter.disabled = { $ne: true };
      // Hide pending/rejected offers from the customer app. Legacy Involve docs
      // default to `status: 'approved'` via the Offer schema, so they remain visible.
      filter.status = { $nin: ['pending_review', 'rejected'] };
      // filter.countries = { $regex: 'Thailand', $options: 'i' };
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
    const total = await this.offerModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    return { page, limit, total, totalPages, data };
  }

  async findAllExtra() {
    const filter: any = {};
    filter.disabled = { $ne: true };
    filter.status = { $nin: ['pending_review', 'rejected'] };
    filter.extra_store = true;
    // filter.countries = { $regex: 'Thailand', $options: 'i' };

    const dataExtra = await this.offerModel
      .find(filter)
      .sort({ extra_store_sort: 1 })
      .lean();

    return dataExtra;
  }

  async findOne(id: string) {
    return this.offerModel.findById(id);
  }

  async getCategoryList(search: string) {
    const filter = {};
    if (search) {
      filter['name'] = { $regex: search, $options: 'i' };
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
      .find({ _id: { $in: entries.map((entry) => entry.offerId) } })
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
    // console.log('body', body);
    body.offer_id = new Types.ObjectId(body.offer_id);
    body.discount = body.discount ? Number(body.discount) : 0;
    body.quantity = body.quantity ? Number(body.quantity) : 0;
    body.disabled = body.disabled == 'true' ? true : false;
    if (body?.id) {
      // const { id, ...updateData } = body;
      return this.couponModel.findByIdAndUpdate(
        new Types.ObjectId(body.id),
        body,
        {
          new: true,
        },
      );
    } else {
      delete body.id;
      // mongoose 9 types create() strictly; `disabled` is string|boolean on the
      // DTO but boolean on the schema. Assert (do NOT coerce — Boolean("false")
      // is true); mongoose casts the raw "false"/"true" value correctly at save.
      return this.couponModel.create({
        ...body,
        disabled: body.disabled as boolean,
      });
    }
  }

  async getCoupon(page: number, limit: number, search: string) {
    const filter = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ],
    };
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

  async getOfferExtraPoint() {
    return this.offerModel.find({ extra_point: { $gt: 1 } }).lean();
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
    const folderId = '17kyG-ASOfywnANw4IHegvUcRAi8ZYO8k';
    const fileId = [];
    if (files.length > 0) {
      for (const file of files) {
        // console.log('file', file);
        const upload = await this.googleDriveService.uploadFile(file, folderId);
        fileId.push(upload.id);
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
    const safeSearch = (search ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
