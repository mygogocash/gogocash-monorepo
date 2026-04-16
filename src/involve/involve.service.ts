/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import {
  CreateAffiliateAiDto,
  CreateAffiliateDto,
  RequestGetConversion,
} from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import axios from 'axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Offer } from '../offer/schemas/offer.schema';
import { Model, Types } from 'mongoose';
import { Deeplink } from './schemas/deeplink.schema';
import { User } from 'src/user/schemas/user.schema';
import { ResponseGenerateDeeplink } from './dto/deeplink.dto';
import { convertToTHB, convertToUSD } from 'src/utils/helper';
import { Category } from 'src/offer/schemas/category.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { FeeRate } from 'src/withdraw/schemas/feeRate.schema';

@Injectable()
export class InvolveService {
  private endpoint: string;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Conversion.name) private conversionModel: Model<Conversion>,
    @InjectModel(FeeRate.name) private feeRateModel: Model<FeeRate>,
  ) {
    this.endpoint = `https://api.involve.asia/api`;
  }
  async signIn() {
    const res = await axios.post(`${this.endpoint}/authenticate`, {
      secret: process.env.INVOLVE_SECRET,
      key: 'general',
    });

    await this.cacheManager.set('access_token_involve', res.data.data.token);

    return res.data;
  }

  async signInOld() {
    const res = await axios.post(`${this.endpoint}/authenticate`, {
      secret: process.env.INVOLVE_SECRET_OLD,
      key: 'general',
    });

    await this.cacheManager.set(
      'access_token_involve_old',
      res.data.data.token,
    );

    return res.data;
  }
  createDeeplinkMongo(
    createInvolveDto: CreateAffiliateDto & { user_id: string },
  ) {
    const createLink = this.deeplinkModel.create({
      ...createInvolveDto,
      user_id: new Types.ObjectId(createInvolveDto.user_id),
      click_date: [new Date()],
    });
    return createLink;
  }
  async createAffiliate(createInvolveDto: CreateAffiliateDto, id: string) {
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new Error('User not found');
    }

    const deeplink = await this.deeplinkModel.findOne({
      offer_id: Number(createInvolveDto.offer_id),
      merchant_id: Number(createInvolveDto.merchant_id),
      user_id: new Types.ObjectId(user._id), // user._id,
    });

    if (deeplink && deeplink?.deeplink) {
      return this.deeplinkModel.findOneAndUpdate(
        {
          offer_id: Number(createInvolveDto.offer_id),
          merchant_id: Number(createInvolveDto.merchant_id),
          user_id: new Types.ObjectId(user._id), // user._id,
        },
        {
          $push: { click_date: new Date() },
        },
        { upsert: true },
      );
      // return deeplink;
    } else {
      // create deeplink on Involve Asia
      const deep = await this.createDeeplinkInvolve({
        ...createInvolveDto,
        user_id: user._id.toString(),
      });
      const deeplink = await this.createDeeplinkMongo({
        ...createInvolveDto,
        user_id: user._id.toString(),
        deeplink: deep.data.tracking_link as string,
      });
      return deeplink;
    }
  }

  async createAffiliateAi(
    createInvolveDto: CreateAffiliateAiDto,
    email: string,
  ) {
    const user = await this.userModel.findOne({ email: email });
    if (!user) {
      throw new Error('User not found');
    }

    const deeplink = await this.deeplinkModel.findOne({
      offer_id: Number(createInvolveDto.offer_id),
      merchant_id: Number(createInvolveDto.merchant_id),
      user_id: new Types.ObjectId(user._id), // user._id,
    });
    if (deeplink && deeplink?.deeplink) {
      return deeplink;
    } else {
      // create deeplink on Involve Asia
      const deep = await this.createDeeplinkInvolve({
        user_id: user._id.toString(),
        offer_id: createInvolveDto.offer_id,
        merchant_id: createInvolveDto.merchant_id,
        deeplink: '',
      });
      const deeplink = await this.createDeeplinkMongo({
        ...createInvolveDto,
        user_id: user._id.toString(),
        deeplink: deep.data.tracking_link as string,
      });
      return deeplink;
    }
  }

  async createDeeplinkInvolve(
    createInvolveDto: CreateAffiliateDto & { user_id: string },
  ): Promise<ResponseGenerateDeeplink> {
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const res = await axios.post(
        `${this.endpoint}/deeplink/generate`,
        {
          offer_id: createInvolveDto.offer_id,
          merchant_id: createInvolveDto.merchant_id,
          aff_sub: `user_id:${createInvolveDto.user_id}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error creating deeplink:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.createDeeplinkInvolve(createInvolveDto);
      }
      throw new Error(error.message || 'Failed to create deeplink');
    }
  }

  async getOfferAll(pageFilter?: { page?: number; limit?: number }) {
    try {
      let token = await this.cacheManager.get('access_token_involve');
      if (!token) {
        await this.signIn();
        token = await this.cacheManager.get('access_token_involve');
      }
      const filter = {
        page: pageFilter?.page || 1,
        limit: pageFilter?.limit || 100,
      };
      filter['application_status'] = 'Approved'; //Approved|Blocked|Pending|Rejected
      filter['offer_status'] = 'Active'; //Active|Paused

      const res = await axios.post(
        `${this.endpoint}/offers/all`,
        { page: filter.page, limit: filter.limit, filter },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return res.data;
    } catch (error: any) {
      console.error('Error get offers:', error.response?.data || error.message);
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getOfferAll();
      }
      throw new Error(error.message || 'Failed to get offers');
    }
  }
  async findAll() {
    const res = await this.getOfferAll();
    let allOffers = res.data.data;
    let currentPage = 1;

    while (res.data.nextPage) {
      currentPage++;
      const nextOffers = await this.getOfferAll({ page: currentPage });
      allOffers = allOffers.concat(nextOffers.data.data);
      res.data.nextPage = nextOffers.data.nextPage;
    }
    // Save or update many offers in MongoDB
    const offers = Array.isArray(allOffers) ? allOffers : [];
    const ids = [];
    for (const offer of offers) {
      ids.push(offer.offer_id);
      await this.offerModel.updateOne(
        { offer_id: offer.offer_id }, // Assuming offer_id is unique
        { $set: { ...offer, type: 'new', disabled: false } },
        { upsert: true },
      );
    }
    for (const offerId of ids) {
      await this.offerModel.updateOne(
        { offer_id: { $ne: offerId } },
        { $set: { type: 'old', disabled: true } },
      );
    }

    await this.getCategoryList();
    return offers;
  }

  async getCategoryList() {
    const categoriesAll = await this.offerModel
      .find({})
      .select('categories')
      .exec();
    const uniqueCategories = new Set();
    categoriesAll.forEach((offer) => {
      if (offer.categories) {
        const categoriesArray = offer.categories;
        uniqueCategories.add(categoriesArray);
      }
    });
    for (const cate of uniqueCategories) {
      await this.categoryModel.updateOne(
        { name: cate }, // Assuming offer_id is unique
        { $set: { name: cate } },
        { upsert: true },
      );
    }

    return Array.from(uniqueCategories);
  }

  async checkOfferDuplicate() {
    const duplicateOffers = await this.offerModel.aggregate([
      { $group: { _id: '$offer_id', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return duplicateOffers;
  }

  update(id: number, updateInvolveDto: UpdateInvolveDto) {
    console.log(updateInvolveDto);

    return `This action updates a #${id} involve`;
  }

  remove(id: number) {
    return `This action removes a #${id} involve`;
  }
  async getConversion(
    offer_id: string,
    payload: RequestGetConversion,
    id: string,
  ) {
    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new Error('User not found');
    }
    const id_user = user._id.toString();
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const res = await axios.post(
        `${this.endpoint}/conversions/all`,
        {
          page: payload.page || 1,
          limit: payload.limit || 100,
          filters: {
            offer_id: Number(offer_id),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const dt = res.data?.data?.data?.filter((item) =>
        item.aff_sub1?.includes(`user_id:${id_user}`),
      );
      const obj = {
        ...res.data,
        data: {
          ...res.data.data,
          count: dt.length,
          data: dt,
        },
      };
      return obj;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getConversion(offer_id, payload, id);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
    // return this.deeplinkModel.countDocuments({ offer_id: Number(offer_id) });
  }

  async getConversionAll(payload: RequestGetConversion, filter: any = null) {
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const filters = {
        page: payload.page || 1,
        limit: payload.limit || 100,
      };
      if (filter) {
        filters['filters'] = filter;
      }
      const res = await axios.post(
        `${this.endpoint}/conversions/all`,
        {
          ...filters,
          // filters: {
          //   offer_id: Number(offer_id),
          // },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getConversionAll(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversionRange(
    payload: RequestGetConversion,
    range: { start_date: string; end_date: string },
    filters: any = null,
  ) {
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    try {
      const page = {
        page: payload.page?.toString() || '1',
        limit: payload.limit?.toString() || '100',
      };
      // if (filter) {
      //   // filters = { ...filters };
      // }
      // console.log('filter', filters);

      const res = await axios.post(
        `${this.endpoint}/conversions/range`,
        {
          ...page,
          ...range,
          filters: { ...filters },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signIn();
        return this.getConversionAll(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversionRangeOld(
    payload: RequestGetConversion,
    filter: any = null,
  ) {
    let token = await this.cacheManager.get('access_token_involve_old');
    if (!token) {
      await this.signInOld();
      token = await this.cacheManager.get('access_token_involve_old');
    }
    try {
      let filters = {
        page: payload.page?.toString() || '1',
        limit: payload.limit?.toString() || '100',
      };
      if (filter) {
        filters = { ...filters, ...filter };
      }
      console.log('filter', filters);

      const res = await axios.post(
        `${this.endpoint}/conversions/range`,
        {
          ...filters,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signInOld();
        return this.getConversionAllOld(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversionAllOld(payload: RequestGetConversion, filter: any = null) {
    let token = await this.cacheManager.get('access_token_involve_old');
    if (!token) {
      await this.signInOld();
      token = await this.cacheManager.get('access_token_involve_old');
    }
    try {
      const filters = {
        page: payload.page || 1,
        limit: payload.limit || 100,
      };
      if (filter) {
        filters['filters'] = filter;
      }
      const res = await axios.post(
        `${this.endpoint}/conversions/all`,
        {
          ...filters,
          // filters: {
          //   offer_id: Number(offer_id),
          // },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return res.data;
    } catch (error: any) {
      console.error(
        'Error get conversion:',
        error.response?.data || error.message,
      );
      if (error.response?.data?.status_code === 401) {
        await this.signInOld();
        return this.getConversionAllOld(payload);
      }
      throw new Error(error.message || 'Failed to get conversion');
    }
  }

  async getConversationAllPage(payload: RequestGetConversion, id: string) {
    // const conversions = await this.getConversionAll({
    //   page: payload.page || '1',
    //   limit: payload.limit || '10',
    // });

    // let allConversions = conversions.data.data;
    // let currentPage = 1;

    // while (conversions.data.nextPage) {
    //   currentPage++;
    //   const nextConversions = await this.getConversionAll({
    //     page: currentPage.toString(),
    //     limit: payload.limit || '10',
    //   });
    //   allConversions = allConversions.concat(nextConversions.data.data);
    //   conversions.data.nextPage = nextConversions.data.nextPage;
    // }

    const user = await this.userModel.findOne({ _id: new Types.ObjectId(id) });
    if (!user) {
      throw new Error('User not found');
    }
    const allConversions = await this.conversionModel
      .find({
        aff_sub1: { $regex: `user_id:${id}` },
      })
      .sort({ datetime_conversion: -1 })
      .lean();
    const fee = await this.feeRateModel.findOne().exec();

    const conversationByUser = [];
    for (const conversion of allConversions) {
      const payout =
        conversion.offer_name === 'reward_conversion_quest'
          ? conversion.payout
          : conversion.payout >= fee.max_cap
            ? fee.max_cap
            : conversion.payout;
      // @TODO ลบ feePercent ออก 30%
      conversationByUser.push({ ...conversion, payout: payout });
    }
    const totalUSDApproved = await conversationByUser
      ?.filter((ele) => ele.conversion_status === 'approved')
      ?.reduce(async (accPromise, item) => {
        const acc = await accPromise;
        const payout =
          Number(item.payout || 0) >= fee.max_cap
            ? Number(fee.max_cap)
            : Number(item.payout || 0);
        if (item.currency === 'USD') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { usdAmount } = await convertToUSD(item.currency, payout);
          if (usdAmount) {
            return acc + usdAmount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    const totalUSDPending = await conversationByUser
      ?.filter((ele) => ele.conversion_status === 'pending')
      .reduce(async (accPromise, item) => {
        const acc = await accPromise;
        const payout =
          Number(item.payout || 0) >= fee.max_cap
            ? Number(fee.max_cap)
            : Number(item.payout || 0);
        if (item.currency === 'USD') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { usdAmount } = await convertToUSD(item.currency, payout);
          if (usdAmount) {
            return acc + usdAmount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    const totalTHBPending = await conversationByUser
      ?.filter((ele) => ele.conversion_status === 'pending')
      .reduce(async (accPromise, item) => {
        const acc = await accPromise;
        const payout =
          Number(item.payout || 0) >= fee.max_cap
            ? Number(fee.max_cap)
            : Number(item.payout || 0);
        if (item.currency === 'THB') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { amount } = await convertToTHB(item.currency, payout);
          if (amount) {
            return acc + amount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    const totalTHBApproved = await conversationByUser
      ?.filter((ele) => ele.conversion_status === 'approved')
      .reduce(async (accPromise, item) => {
        const acc = await accPromise;
        const payout =
          Number(item.payout || 0) >= fee.max_cap
            ? Number(fee.max_cap)
            : Number(item.payout || 0);
        if (item.currency === 'THB') {
          return acc + payout;
        } else {
          // For non-USD currencies, you'll need to handle conversion separately
          // This assumes you have the USD equivalent stored or calculated elsewhere
          const { amount } = await convertToTHB(item.currency, payout);
          if (amount) {
            return acc + amount;
          } else {
            return acc;
          }
          // return acc + Number(item.payout_amount);
        }
      }, 0);

    return {
      data: conversationByUser,
      totalUSD: { pending: totalUSDPending, approved: totalUSDApproved },
      totalTHB: { pending: totalTHBPending, approved: totalTHBApproved },
      pagination: {
        total: conversationByUser.length,
        limit: payload.limit || 10,
        page: payload.page || 1,
        totalPages: Math.ceil(
          conversationByUser.length / Number(payload.limit || 10),
        ),
      },
    };
  }
}
