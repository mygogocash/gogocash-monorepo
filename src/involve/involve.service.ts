import { Inject, Injectable } from '@nestjs/common';
import { CreateAffiliateDto } from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import axios from 'axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Offer } from './schemas/offer.schema';
import { Model, Types } from 'mongoose';
import { Deeplink } from './schemas/deeplink.schema';
import { User } from 'src/user/schemas/user.schema';
import { ResponseGenerateDeeplink } from './dto/deeplink.dto';

@Injectable()
export class InvolveService {
  private endpoint: string;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    this.endpoint = `https://api.involve.asia/api`;
  }
  async signIn() {
    const res = await axios.post(`${this.endpoint}/authenticate`, {
      secret: process.env.INVOVLE_SECRET,
      key: 'general',
    });

    await this.cacheManager.set('access_token_involve', res.data.data.token);

    return res.data;
  }
  createDeeplinkMongo(
    createInvolveDto: CreateAffiliateDto & { user_id: string },
  ) {
    const createLink = this.deeplinkModel.create({
      ...createInvolveDto,
      user_id: new Types.ObjectId(createInvolveDto.user_id),
    });
    return createLink;
  }
  async createAffiliate(
    createInvolveDto: CreateAffiliateDto,
    id_crossmint: string,
  ) {
    const user = await this.userModel.findOne({ id_crossmint });
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
    } catch (error) {
      console.error(
        'Error creating deeplink:',
        error.response?.data || error.message,
      );
      throw new Error(error.message || 'Failed to create deeplink');
    }
  }
  async findAll() {
    let token = await this.cacheManager.get('access_token_involve');
    if (!token) {
      await this.signIn();
      token = await this.cacheManager.get('access_token_involve');
    }
    const filter = { page: 1, limit: 100 };
    filter['application_status'] = 'Approved'; //Approved|Blocked|Pending|Rejected
    filter['offer_status'] = 'Active'; //Active|Paused

    const res = await axios.post(
      `${this.endpoint}/offers/all`,
      { page: 1, limit: 100, filter },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    // Save or update many offers in MongoDB
    const offers = Array.isArray(res.data.data.data) ? res.data.data.data : [];
    for (const offer of offers) {
      await this.offerModel.updateOne(
        { offer_id: offer.offer_id }, // Assuming offer_id is unique
        { $set: offer },
        { upsert: true },
      );
    }

    return offers;
  }

  findOne(id: number) {
    return `This action returns a #${id} involve`;
  }

  update(id: number, updateInvolveDto: UpdateInvolveDto) {
    console.log(updateInvolveDto);

    return `This action updates a #${id} involve`;
  }

  remove(id: number) {
    return `This action removes a #${id} involve`;
  }
}
