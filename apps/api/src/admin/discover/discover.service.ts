import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DiscoverSection } from './schemas/discover-section.schema';

@Injectable()
export class DiscoverService {
  constructor(
    @InjectModel(DiscoverSection.name)
    private readonly sectionModel: Model<DiscoverSection>,
  ) {}

  async getSections() {
    return this.sectionModel.find().sort({ sort_order: 1 }).lean();
  }

  async reorderItems(type: string, order: string[]) {
    const section = await this.sectionModel.findOne({ type });
    if (!section) return { success: false, message: 'Section not found' };
    const reordered = order.map((id, i) => {
      const item = section.items?.find(
        (it: any) => it._id?.toString() === id || it.offer_id === id,
      );
      return item ? { ...item, sort_order: i } : null;
    }).filter(Boolean);
    section.items = reordered as any;
    await section.save();
    return { success: true };
  }

  async addItem(type: string, item: { offer_id: string; custom_title?: string }) {
    const result = await this.sectionModel.findOneAndUpdate(
      { type },
      {
        $push: {
          items: { offer_id: item.offer_id, custom_title: item.custom_title || '', sort_order: 999 },
        },
        $setOnInsert: { type, title: type, sort_order: 0, is_active: true },
      },
      { upsert: true, new: true },
    );
    return result;
  }

  async updateItem(type: string, itemId: string, data: { custom_title?: string; sort_order?: number }) {
    const update: Record<string, any> = {};
    if (data.custom_title !== undefined) update['items.$.custom_title'] = data.custom_title;
    if (data.sort_order !== undefined) update['items.$.sort_order'] = data.sort_order;
    return this.sectionModel.findOneAndUpdate(
      { type, 'items._id': itemId },
      { $set: update },
      { new: true },
    );
  }

  async deleteItem(type: string, itemId: string) {
    return this.sectionModel.findOneAndUpdate(
      { type },
      { $pull: { items: { _id: itemId } } },
      { new: true },
    );
  }
}
