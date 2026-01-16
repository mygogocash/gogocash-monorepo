import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { User } from 'src/user/schemas/user.schema';
import { GetMyOfferDto } from './dto/create-offer.dto';
import { join } from 'path';
import { promises as fs } from 'fs';
import { Category } from './schemas/category.schema';
import { FavoriteOffer } from './schemas/favorite-offer.schema';
import { Banner } from './schemas/banner.schema';
import { Coupon } from './schemas/coupon.schema';
import { UpdateCouponDto } from './dto/update-offer.dto';
@Injectable()
export class OfferService {
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
  ) {}
  async findAll(
    page: number,
    limit: number,
    search: string,
    categories: string,
    admin = false,
  ) {
    const filter: any = {};
    if (search) {
      filter['offer_name'] = { $regex: search, $options: 'i' };
    }
    if (categories) {
      // const categoriesArray = categories.split(',').map((cat) => cat.trim());
      filter['categories'] = { $regex: categories, $options: 'i' };
    }
    if (!admin) {
      filter.disabled = { $ne: true };
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
    filter.extra_store = true;
    const dataExtra = await this.offerModel.find(filter).lean();

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

  async updateCoupon(body: UpdateCouponDto) {
    // console.log('body', body);
    body.offer_id = new Types.ObjectId(body.offer_id);
    body.discount = body.discount ? Number(body.discount) : 0;
    body.quantity = body.quantity ? Number(body.quantity) : 0;
    body.disabled = body.disabled == 'true' ? true : false;
    if (body?.id) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // const { id, ...updateData } = body;
      return this.couponModel.findByIdAndUpdate(
        new Types.ObjectId(body.id),
        body,
        {
          new: true,
        },
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      delete body.id;
      return this.couponModel.create(body);
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
}
