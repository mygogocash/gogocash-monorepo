import { Inject, Injectable } from '@nestjs/common';
import { OfferDto } from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import axios from 'axios';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import { Offer } from './schemas/offer.schema';
import { Model } from 'mongoose';

@Injectable()
export class InvolveService {
  private endpoint: string;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
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
  create(createInvolveDto: OfferDto) {
    console.log(createInvolveDto);
    return 'This action adds a new involve';
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
