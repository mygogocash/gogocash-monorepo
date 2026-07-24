import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  InvolveCampaign,
  InvolveCampaignSchema,
} from './schemas/involve-campaign.schema';
import { InvolveShop, InvolveShopSchema } from './schemas/involve-shop.schema';

// #586 / #504 — Involve Commission Xtra (shops + vouchers) subsystem. v1 ships
// the data model dark; the sync service, /explore serving, and app surfacing
// land in follow-up PRs. Models are re-exported so those modules can inject them.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InvolveShop.name, schema: InvolveShopSchema },
      { name: InvolveCampaign.name, schema: InvolveCampaignSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class InvolveXtraModule {}
