import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { requireObjectId } from 'src/common/mongo-query';
import { FeaturedSearchTerm } from './schemas/featured-term.schema';
import { SearchBoostRule } from './schemas/boost-rule.schema';
import { SearchBlacklist } from './schemas/blacklist.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(FeaturedSearchTerm.name)
    private readonly featuredModel: Model<FeaturedSearchTerm>,
    @InjectModel(SearchBoostRule.name)
    private readonly boostModel: Model<SearchBoostRule>,
    @InjectModel(SearchBlacklist.name)
    private readonly blacklistModel: Model<SearchBlacklist>,
  ) {}

  // ── Featured Terms ──
  async getFeaturedTerms() {
    return {
      data: await this.featuredModel.find().sort({ sort_order: 1 }).lean(),
    };
  }

  async createFeaturedTerm(data: Partial<FeaturedSearchTerm>) {
    return this.featuredModel.create(data);
  }

  async updateFeaturedTerm(id: string, data: Partial<FeaturedSearchTerm>) {
    const patch: Partial<FeaturedSearchTerm> = {};
    if (data.term !== undefined) patch.term = data.term;
    if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    return this.featuredModel.findByIdAndUpdate(
      requireObjectId(id, 'featured term id'),
      { $set: patch },
      { new: true },
    );
  }

  async deleteFeaturedTerm(id: string) {
    await this.featuredModel.findByIdAndDelete(
      requireObjectId(id, 'featured term id'),
    );
    return { success: true };
  }

  async reorderFeaturedTerms(order: string[]) {
    const ops = order.map((id, i) => ({
      updateOne: {
        filter: { _id: requireObjectId(id, 'featured term id') },
        update: { $set: { sort_order: i } },
      },
    }));
    await this.featuredModel.bulkWrite(ops);
    return { success: true };
  }

  // ── Boost Rules ──
  async getBoostRules() {
    return {
      data: await this.boostModel.find().sort({ boost_weight: -1 }).lean(),
    };
  }

  async createBoostRule(data: Partial<SearchBoostRule>) {
    return this.boostModel.create(data);
  }

  async updateBoostRule(id: string, data: Partial<SearchBoostRule>) {
    const patch: Partial<SearchBoostRule> = {};
    if (data.offer_id !== undefined) patch.offer_id = data.offer_id;
    if (data.boost_weight !== undefined) patch.boost_weight = data.boost_weight;
    if (data.reason !== undefined) patch.reason = data.reason;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    return this.boostModel.findByIdAndUpdate(
      requireObjectId(id, 'boost rule id'),
      { $set: patch },
      { new: true },
    );
  }

  async deleteBoostRule(id: string) {
    await this.boostModel.findByIdAndDelete(
      requireObjectId(id, 'boost rule id'),
    );
    return { success: true };
  }

  // ── Blacklist ──
  async getBlacklist() {
    return {
      data: await this.blacklistModel.find().sort({ createdAt: -1 }).lean(),
    };
  }

  async createBlacklistEntry(data: { term: string; reason?: string }) {
    return this.blacklistModel.create(data);
  }

  async deleteBlacklistEntry(id: string) {
    await this.blacklistModel.findByIdAndDelete(
      requireObjectId(id, 'blacklist id'),
    );
    return { success: true };
  }

  async bulkImportBlacklist(keywords: string[]) {
    const ops = keywords.map((term) => ({
      updateOne: {
        filter: { term },
        update: { $setOnInsert: { term, reason: 'bulk import' } },
        upsert: true,
      },
    }));
    const result = await this.blacklistModel.bulkWrite(ops);
    return { imported: result.upsertedCount, existing: result.modifiedCount };
  }
}
