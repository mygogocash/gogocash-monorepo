import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offer } from 'src/involve/schemas/offer.schema';

@Injectable()
export class OfferService {
  constructor(@InjectModel(Offer.name) private offerModel: Model<Offer>) {}
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

  findOne(id: string) {
    return this.offerModel.findById(id);
  }
}
