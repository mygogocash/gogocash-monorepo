import { MEDIA_FOLDER } from '../src/media/media-folders.config';

export type StoredMediaTargetSpec = {
  collection: string;
  folder?: (typeof MEDIA_FOLDER)[keyof typeof MEDIA_FOLDER];
  fields: string[];
  arrayFields?: string[];
};

/** Mongo collections/fields that may hold stored media URLs or legacy Drive ids. */
export const STORED_MEDIA_TARGET_SPECS: StoredMediaTargetSpec[] = [
  {
    collection: 'banners',
    folder: MEDIA_FOLDER.BANNER_HOME,
    fields: ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'],
  },
  {
    collection: 'all_brand_banners',
    folder: MEDIA_FOLDER.BANNER_ALL_BRAND,
    fields: ['image_1', 'image_2', 'image_3'],
  },
  {
    collection: 'specific_page_banners',
    folder: MEDIA_FOLDER.BANNER_SPECIFIC_PAGE,
    fields: ['image_1', 'image_2', 'image_3'],
  },
  {
    collection: 'offers',
    folder: MEDIA_FOLDER.BRANDS,
    fields: ['logo', 'logo_desktop', 'logo_mobile'],
  },
  {
    // #493 — banner roles live in their own 1920px folder. `logo_circle` is named like a
    // logo but is written by the BANNER path (bannerFile = banner ?? banner_mobile ??
    // logo_circle), so it belongs here or inventory/migration would look under the wrong
    // prefix for it.
    collection: 'offers',
    folder: MEDIA_FOLDER.BRAND_BANNERS,
    fields: ['banner', 'banner_mobile', 'logo_circle'],
  },
  {
    collection: 'categories',
    folder: MEDIA_FOLDER.CATEGORIES,
    fields: ['image', 'banner'],
  },
  {
    collection: 'quests',
    folder: MEDIA_FOLDER.QUESTS,
    fields: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'],
  },
  {
    collection: 'withdraws',
    folder: MEDIA_FOLDER.WITHDRAW_SLIPS,
    fields: ['slip_file'],
  },
  {
    collection: 'missionorders',
    folder: MEDIA_FOLDER.MISSING_ORDERS,
    fields: [],
    arrayFields: ['attachments'],
  },
  {
    collection: 'users',
    folder: MEDIA_FOLDER.PROFILE_AVATARS,
    fields: ['avatar_url'],
  },
];
