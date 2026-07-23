import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';
import { resolveMaxUploadBytes } from 'src/media/media-folders.config';

export const QUEST_BANNER_FIELDS = [
  { key: 'banner_en', label: 'Banner EN' },
  { key: 'banner_th', label: 'Banner TH' },
  { key: 'sub_banner_en', label: 'Sub banner EN' },
  { key: 'sub_banner_th', label: 'Sub banner TH' },
] as const;

export type QuestBannerKey = (typeof QUEST_BANNER_FIELDS)[number]['key'];
export type QuestBannerFiles = Partial<
  Record<QuestBannerKey, Express.Multer.File[]>
>;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function missingBannerMessage(keys: QuestBannerKey[]): string {
  const labels = QUEST_BANNER_FIELDS.filter(({ key }) =>
    keys.includes(key),
  ).map(({ label }) => label);
  return `All four quest banners are required when creating a quest: ${labels.join(', ')}.`;
}

async function assertGenuineImage(
  key: QuestBannerKey,
  file: Express.Multer.File,
): Promise<void> {
  const label = QUEST_BANNER_FIELDS.find((field) => field.key === key)!.label;
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      `${label} must be a genuine PNG, JPEG, or WebP image. Please choose the image again.`,
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readMulterUploadBuffer(file);
  } catch {
    throw new BadRequestException(
      `${label} could not be read. Please choose the image again.`,
    );
  }
  if (!buffer.length) {
    throw new BadRequestException(
      `${label} is empty. Please choose the image again.`,
    );
  }
  const maxBytes = resolveMaxUploadBytes();
  if (buffer.length > maxBytes) {
    throw new BadRequestException(
      `${label} is too large. Please upload an image under ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    );
  }

  try {
    const metadata = await sharp(buffer, { failOn: 'error' }).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      !['png', 'jpeg', 'webp'].includes(metadata.format ?? '')
    ) {
      throw new Error('unsupported image');
    }
  } catch {
    throw new BadRequestException(
      `${label} must be a genuine PNG, JPEG, or WebP image. Please choose the image again.`,
    );
  }
}

/**
 * Validate the entire selected set before callers prepare media, journal an
 * intent, write an object, or mutate a quest. Body strings are intentionally
 * absent from this contract and can never prove a new upload.
 */
export async function validateQuestBannerFiles(
  files: QuestBannerFiles = {},
  requireCompleteSet: boolean,
): Promise<Map<QuestBannerKey, Express.Multer.File>> {
  const selected = new Map<QuestBannerKey, Express.Multer.File>();
  const missing: QuestBannerKey[] = [];

  for (const { key, label } of QUEST_BANNER_FIELDS) {
    const candidates = files[key] ?? [];
    if (candidates.length > 1) {
      throw new BadRequestException(
        `${label} accepts one image only. Please choose a single image.`,
      );
    }
    const file = candidates[0];
    if (!file) {
      if (requireCompleteSet) missing.push(key);
      continue;
    }
    selected.set(key, file);
  }

  if (missing.length > 0) {
    throw new BadRequestException(missingBannerMessage(missing));
  }

  // Decode the complete set before returning any file to a media preparer.
  for (const [key, file] of selected) {
    await assertGenuineImage(key, file);
  }
  return selected;
}
