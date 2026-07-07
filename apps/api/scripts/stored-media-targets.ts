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
    collection: 'offers',
    folder: MEDIA_FOLDER.BRANDS,
    fields: [
      'logo',
      'logo_desktop',
      'logo_mobile',
      'logo_circle',
      'banner',
      'banner_mobile',
    ],
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
