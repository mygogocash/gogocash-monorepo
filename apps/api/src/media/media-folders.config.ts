export const MEDIA_FOLDER = {
  BANNER_ALL_BRAND: 'banner-all-brand',
  BANNER_HOME: 'banner-home',
  BANNER_SPECIFIC_PAGE: 'banner-specific-page',
  BRANDS: 'brands',
  CATEGORIES: 'categories',
  QUESTS: 'quests',
  MISSING_ORDERS: 'missing-orders',
  WITHDRAW_SLIPS: 'withdraw-slips',
  PROFILE_AVATARS: 'profile-avatars',
} as const;

export type MediaFolder = (typeof MEDIA_FOLDER)[keyof typeof MEDIA_FOLDER];

const DEFAULT_FOLDER_BY_ENV: Record<string, MediaFolder> = {
  GCS_MEDIA_PREFIX_BANNER_ALL_BRAND: MEDIA_FOLDER.BANNER_ALL_BRAND,
  GCS_MEDIA_PREFIX_BANNER_HOME: MEDIA_FOLDER.BANNER_HOME,
  GCS_MEDIA_PREFIX_BANNER_SPECIFIC_PAGE: MEDIA_FOLDER.BANNER_SPECIFIC_PAGE,
  GCS_MEDIA_PREFIX_BRANDS: MEDIA_FOLDER.BRANDS,
  GCS_MEDIA_PREFIX_CATEGORIES: MEDIA_FOLDER.CATEGORIES,
  GCS_MEDIA_PREFIX_QUESTS: MEDIA_FOLDER.QUESTS,
  GCS_MEDIA_PREFIX_MISSING_ORDERS: MEDIA_FOLDER.MISSING_ORDERS,
  GCS_MEDIA_PREFIX_WITHDRAW_SLIPS: MEDIA_FOLDER.WITHDRAW_SLIPS,
  GCS_MEDIA_PREFIX_PROFILE_AVATARS: MEDIA_FOLDER.PROFILE_AVATARS,
};

/** Folders whose objects are not world-readable; admin streams via /admin/stored-media/stream. */
const PRIVATE_MEDIA_FOLDERS = new Set<MediaFolder>([
  MEDIA_FOLDER.MISSING_ORDERS,
  MEDIA_FOLDER.WITHDRAW_SLIPS,
]);

export function resolveMediaFolder(
  folder: MediaFolder,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envKey = Object.entries(DEFAULT_FOLDER_BY_ENV).find(
    ([, value]) => value === folder,
  )?.[0];
  if (envKey && env[envKey]?.trim()) {
    return env[envKey]!.trim();
  }
  return folder;
}

export function isPrivateMediaFolder(folder: MediaFolder): boolean {
  return PRIVATE_MEDIA_FOLDERS.has(folder);
}

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function resolveMaxUploadBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw =
    env.MEDIA_MAX_UPLOAD_BYTES?.trim() || env.GCS_MAX_UPLOAD_BYTES?.trim();
  if (!raw) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_UPLOAD_BYTES;
}
