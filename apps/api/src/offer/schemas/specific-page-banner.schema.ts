import { Banner, BannerSchema } from './banner.schema';
import type { Schema as MongooseSchema } from 'mongoose';
import {
  SPECIFIC_PAGE_BANNER_TARGETS,
  type SpecificPageBannerTarget,
} from '../specific-page-banner.contract';

export { SPECIFIC_PAGE_BANNER_TARGETS } from '../specific-page-banner.contract';

export const SPECIFIC_PAGE_BANNER_MODEL = 'SpecificPageBanner';
export const SPECIFIC_PAGE_BANNER_COLLECTION = 'specific_page_banners';

/**
 * Dedicated keyed model for page-specific three-slide carousels.
 *
 * The schema is cloned so the deployed flat image_N/link_N wire format remains
 * compatible without adding a required target to the legacy home Banner model.
 */
export class SpecificPageBanner extends Banner {
  target: SpecificPageBannerTarget;
}

export const SpecificPageBannerSchema =
  BannerSchema.clone() as unknown as MongooseSchema<SpecificPageBanner>;
SpecificPageBannerSchema.add({
  target: {
    type: String,
    required: true,
    enum: SPECIFIC_PAGE_BANNER_TARGETS,
  },
});
SpecificPageBannerSchema.index({ target: 1 }, { unique: true });
