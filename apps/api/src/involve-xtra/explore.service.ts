import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// mongoose 9 does not root-export FilterQuery; the codebase types query filters
// as plain objects. Keep that idiom + cast at the model call sites.
type QueryFilter = Record<string, unknown>;

import {
  INVOLVE_CAMPAIGN_SOURCE,
  InvolveCampaign,
} from './schemas/involve-campaign.schema';
import {
  INVOLVE_SHOP_MARKETPLACE,
  INVOLVE_SHOP_SOURCE,
  InvolveShop,
} from './schemas/involve-shop.schema';
import type {
  ExploreDealsQueryDto,
  ExploreShopsQueryDto,
} from './dto/explore.dto';

const DEFAULT_COUNTRY = 'Thailand';
const DEFAULT_LIMIT = 20;

// REQ-API-3 — display-safe projection only (no source/hash/raw-rate/internal ids
// beyond what the app renders). trackingLink is a public affiliate URL, not a secret.
const PUBLIC_SHOP_FIELDS =
  'shopId shopName shopType shopLink shopImage shopBanner cashbackRate ' +
  'trackingLink categoryKey country periodEnd offerId parentOfferName';
const PUBLIC_CAMPAIGN_FIELDS =
  'campaignBannerId offerName campaignName description voucherCode ' +
  'bannerImageUrl trackingLink categoryKey withBanner dateEnd offerId';

export interface Envelope<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: T[];
}

// Escape user input before using it in a RegExp (no injection).
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// REQ-DM-6 — a row is servable only when active AND now ≤ periodEnd/dateEnd.
// A missing/absent end date is open-ended.
function activeWindowClause(endField: string, now: Date): QueryFilter {
  return {
    active: true,
    $or: [
      { [endField]: null },
      { [endField]: { $exists: false } },
      { [endField]: { $gte: now } },
    ],
  };
}

@Injectable()
export class ExploreService {
  constructor(
    @InjectModel(InvolveShop.name)
    private readonly shopModel: Model<InvolveShop>,
    @InjectModel(InvolveCampaign.name)
    private readonly campaignModel: Model<InvolveCampaign>,
  ) {}

  async listShops(
    query: ExploreShopsQueryDto,
    now: Date = new Date(),
  ): Promise<Envelope<Record<string, unknown>>> {
    const country = query.country?.trim() || DEFAULT_COUNTRY;
    const filter: QueryFilter = {
      source: INVOLVE_SHOP_SOURCE,
      marketplace: INVOLVE_SHOP_MARKETPLACE,
      country: new RegExp(`^${escapeRegex(country)}$`, 'i'),
      ...activeWindowClause('periodEnd', now),
    };
    if (query.shopType) filter.shopType = query.shopType;
    if (query.cashbackMin != null) {
      filter.cashbackRate = { $gte: query.cashbackMin };
    }
    if (query.search?.trim()) {
      filter.shopName = new RegExp(escapeRegex(query.search.trim()), 'i');
    }

    const sort =
      query.sort === 'latest'
        ? ({ syncedAt: -1 } as const)
        : ({ cashbackRate: -1 } as const);

    return this.paginate(
      this.shopModel,
      filter,
      sort,
      PUBLIC_SHOP_FIELDS,
      query.page,
      query.limit,
    );
  }

  async listDeals(
    query: ExploreDealsQueryDto,
    now: Date = new Date(),
  ): Promise<Envelope<Record<string, unknown>>> {
    const filter: QueryFilter = {
      source: INVOLVE_CAMPAIGN_SOURCE,
      ...activeWindowClause('dateEnd', now),
    };
    if (query.category?.trim()) filter.categoryKey = query.category.trim();

    return this.paginate(
      this.campaignModel,
      filter,
      { dateEnd: -1 } as const,
      PUBLIC_CAMPAIGN_FIELDS,
      query.page,
      query.limit,
    );
  }

  private async paginate<T>(
    model: Model<T>,
    filter: QueryFilter,
    sort: Record<string, 1 | -1>,
    projection: string,
    pageInput?: number,
    limitInput?: number,
  ): Promise<Envelope<Record<string, unknown>>> {
    const page = pageInput && pageInput > 0 ? pageInput : 1;
    const limit = limitInput && limitInput > 0 ? limitInput : DEFAULT_LIMIT;
    const [total, data] = await Promise.all([
      model.countDocuments(filter as never),
      model
        .find(filter as never)
        .select(projection)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
    ]);
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: data as Record<string, unknown>[],
    };
  }
}
