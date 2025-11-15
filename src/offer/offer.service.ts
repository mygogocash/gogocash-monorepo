import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { User } from 'src/user/schemas/user.schema';
import { GetMyOfferDto } from './dto/create-offer.dto';
import { join } from 'path';
import { promises as fs } from 'fs';
@Injectable()
export class OfferService {
  private filePath = join(process.cwd(), 'uploads', 'data', 'offers.json');

  constructor(
    @InjectModel(Offer.name) private offerModel: Model<Offer>,
    @InjectModel(Deeplink.name) private readonly deeplinkModel: Model<Deeplink>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}
  async findAll(
    page: number,
    limit: number,
    search: string,
    categories: string,
  ) {
    const filter: any = {};
    if (search) {
      filter['offer_name'] = { $regex: search, $options: 'i' };
    }
    if (categories) {
      // const categoriesArray = categories.split(',').map((cat) => cat.trim());
      filter['categories'] = { $regex: categories, $options: 'i' };
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

  async findOne(id: string) {
    return this.offerModel.findById(id);
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
    return Array.from(uniqueCategories);
  }

  async findMyOffer(user_id: string, payload: GetMyOfferDto) {
    const user = await this.userModel.findOne({ id_crossmint: user_id });
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
    await fs.writeFile(this.filePath, json, 'utf8');
    return payload;
  }
}
