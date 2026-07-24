import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

// #586 / #504 — Involve voucher/deal campaigns synced from `POST /campaigns/all`
// (coupons only). Separate from `catalog_products` (REQ-DM-8).
export const INVOLVE_CAMPAIGN_COLLECTION = 'involve_campaigns';
export const INVOLVE_CAMPAIGN_SOURCE = 'involve_campaigns' as const;

export type InvolveCampaignDocument = HydratedDocument<InvolveCampaign>;

@Schema({ collection: INVOLVE_CAMPAIGN_COLLECTION, timestamps: true })
export class InvolveCampaign {
  @Prop({ required: true, trim: true, default: INVOLVE_CAMPAIGN_SOURCE })
  source!: string;

  // Involve `campaign_banner_id` — the dedupe key (REQ-DM-7).
  @Prop({ required: true })
  campaignBannerId!: number;

  @Prop()
  offerIdNumeric?: number;

  @Prop()
  merchantId?: number;

  @Prop({ trim: true })
  offerName?: string;

  @Prop({ trim: true })
  campaignName?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  voucherCode?: string;

  @Prop({ type: Date })
  dateStart?: Date;

  // Serving cut-off: served only when active AND now <= dateEnd.
  @Prop({ type: Date })
  dateEnd?: Date;

  @Prop({ trim: true })
  bannerImageUrl?: string;

  // Pre-minted affiliate URL (REQ-ATTR-1).
  @Prop({ required: true, trim: true })
  trackingLink!: string;

  @Prop({ type: String, default: null })
  categoryKey?: string | null;

  @Prop({ default: false })
  withBanner!: boolean;

  // Resolved ObjectId of the parent Offer, or null when none matches.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Offer', default: null })
  offerId?: Types.ObjectId | null;

  @Prop({ trim: true })
  sourceHash?: string;

  @Prop({ type: Date })
  syncedAt?: Date;

  @Prop({ default: true })
  active!: boolean;
}

export const InvolveCampaignSchema =
  SchemaFactory.createForClass(InvolveCampaign);

// Dedupe uniqueness + index-backed serving.
InvolveCampaignSchema.index(
  { source: 1, campaignBannerId: 1 },
  { unique: true },
);
InvolveCampaignSchema.index({ active: 1, dateEnd: 1 });
InvolveCampaignSchema.index({ categoryKey: 1, active: 1 });
