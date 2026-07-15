import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { requireObjectId } from 'src/common/mongo-query';
import { FeaturedSearchTerm } from './schemas/featured-term.schema';
import { SearchBoostRule } from './schemas/boost-rule.schema';
import { SearchBlacklist } from './schemas/blacklist.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import {
  normalizeSearchRuleKeywords,
  type SearchRuleTreatment,
} from './search-rule.contract';
import { CreateSearchRuleDto, UpdateSearchRuleDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(FeaturedSearchTerm.name)
    private readonly featuredModel: Model<FeaturedSearchTerm>,
    @InjectModel(SearchBoostRule.name)
    private readonly boostModel: Model<SearchBoostRule>,
    @InjectModel(SearchBlacklist.name)
    private readonly blacklistModel: Model<SearchBlacklist>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<Offer>,
  ) {}

  // ── Persistent, offer-targeted rules ──
  async getRules() {
    const rows = await this.boostModel
      .find()
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    const offerIds = [
      ...new Set(rows.map((row) => String(row.offer_id)).filter(Boolean)),
    ];
    const objectIdOfferIds = offerIds.filter((id) => isValidObjectId(id));
    const offers = objectIdOfferIds.length
      ? await this.offerModel
          .find({ _id: { $in: objectIdOfferIds } })
          .select('offer_name offer_name_display')
          .lean()
      : [];
    const offerNames = new Map(
      offers.map((offer) => [
        String(offer._id),
        offer.offer_name_display?.trim() || offer.offer_name,
      ]),
    );

    return {
      data: rows.map((row) => {
        const legacyWeight = Number(row.boost_weight ?? 1);
        const treatment = (row.treatment ?? 'boost') as SearchRuleTreatment;
        return {
          id: String(row._id),
          offer_id: String(row.offer_id),
          offer_name: offerNames.get(String(row.offer_id)),
          treatment,
          keywords: normalizeSearchRuleKeywords(row.keywords),
          weight:
            treatment === 'boost'
              ? row.weight !== undefined
                ? Number(row.weight)
                : legacyWeight
              : undefined,
          is_active: row.is_active !== false,
          createdAt: (row as { createdAt?: Date }).createdAt,
          updatedAt: (row as { updatedAt?: Date }).updatedAt,
        };
      }),
    };
  }

  async createRule(data: CreateSearchRuleDto) {
    return this.boostModel.create({
      offer_id: data.offer_id,
      treatment: data.treatment,
      keywords: normalizeSearchRuleKeywords(data.keywords),
      ...(data.weight !== undefined ? { weight: data.weight } : {}),
      ...(data.treatment === 'boost' ? { boost_weight: data.weight ?? 1 } : {}),
      is_active: data.is_active ?? true,
    });
  }

  async updateRule(id: string, data: UpdateSearchRuleDto) {
    const patch: Partial<SearchBoostRule> = {};
    if (data.offer_id !== undefined) patch.offer_id = data.offer_id;
    if (data.treatment !== undefined) patch.treatment = data.treatment;
    if (data.keywords !== undefined) {
      patch.keywords = normalizeSearchRuleKeywords(data.keywords);
    }
    if (data.weight !== undefined) {
      patch.weight = data.weight;
      patch.boost_weight = data.weight;
    }
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    return this.boostModel.findByIdAndUpdate(
      requireObjectId(id, 'search rule id'),
      { $set: patch },
      { new: true },
    );
  }

  async deleteRule(id: string) {
    await this.boostModel.findByIdAndDelete(
      requireObjectId(id, 'search rule id'),
    );
    return { success: true };
  }

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
      data: await this.boostModel
        .find({
          $or: [{ treatment: 'boost' }, { treatment: { $exists: false } }],
        })
        .sort({ boost_weight: -1 })
        .lean(),
    };
  }

  async createBoostRule(data: Partial<SearchBoostRule>) {
    return this.boostModel.create({
      ...data,
      treatment: 'boost',
      weight: data.boost_weight,
    });
  }

  async updateBoostRule(id: string, data: Partial<SearchBoostRule>) {
    const patch: Partial<SearchBoostRule> = {};
    if (data.offer_id !== undefined) patch.offer_id = data.offer_id;
    if (data.boost_weight !== undefined) patch.boost_weight = data.boost_weight;
    if (data.boost_weight !== undefined) patch.weight = data.boost_weight;
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
