import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

import {
  isPrivateMediaFolder,
  MEDIA_FOLDER,
  MediaFolder,
} from './media-folders.config';

/**
 * Automatic upload-time image optimization.
 *
 * Admin uploads used to land in R2 verbatim — 9 MB banner PNGs shipped
 * straight to customers. Every public display upload is now resized to a
 * per-folder max width and re-encoded as WebP (keeps alpha, universally
 * decodable by browsers and expo-image) before storage.
 *
 * Deliberately skipped:
 * - private evidence folders (withdraw slips, missing-order receipts) — those
 *   are proof documents and must stay byte-identical to what the user sent;
 * - SVG/GIF/unknown types — pass through untouched;
 * - anything that fails to decode — the ORIGINAL is stored instead; an
 *   optimizer bug must never block an admin upload.
 */

const WEBP_QUALITY = 82;

const OPTIMIZABLE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const DEFAULT_MAX_IMAGE_WIDTH = 1920;

const MAX_IMAGE_WIDTH_BY_FOLDER: Partial<Record<MediaFolder, number>> = {
  [MEDIA_FOLDER.BANNER_HOME]: 1920,
  [MEDIA_FOLDER.BANNER_SPECIFIC_PAGE]: 1920,
  // Wide hero art, same cap as the other banner folders. BRANDS stays 1024 because
  // logos render at <=320px and raising it would inflate every card image (#493).
  [MEDIA_FOLDER.BRAND_BANNERS]: 1920,
  [MEDIA_FOLDER.BRANDS]: 1024,
  [MEDIA_FOLDER.CATEGORIES]: 512,
  [MEDIA_FOLDER.QUESTS]: 1920,
  [MEDIA_FOLDER.PROFILE_AVATARS]: 512,
};

export function resolveMaxImageWidth(folder: MediaFolder): number {
  return MAX_IMAGE_WIDTH_BY_FOLDER[folder] ?? DEFAULT_MAX_IMAGE_WIDTH;
}

function webpFilename(originalname: string): string {
  const trimmed = originalname?.trim() || 'upload';
  const dotIndex = trimmed.lastIndexOf('.');
  const base = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  return `${base}.webp`;
}

@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  async optimizeUpload(
    file: Express.Multer.File,
    folder: MediaFolder,
  ): Promise<Express.Multer.File> {
    if (isPrivateMediaFolder(folder)) {
      return file;
    }

    if (!file?.buffer || !OPTIMIZABLE_MIME_TYPES.has(file.mimetype)) {
      return file;
    }

    try {
      const optimizedBuffer = await sharp(file.buffer)
        .rotate() // bake EXIF orientation in before it is stripped by re-encode
        .resize({
          width: resolveMaxImageWidth(folder),
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      if (optimizedBuffer.length >= file.buffer.length) {
        return file;
      }

      this.logger.log(
        `Optimized upload folder=${folder} ${file.buffer.length} -> ${optimizedBuffer.length} bytes (${file.originalname})`,
      );

      return {
        ...file,
        buffer: optimizedBuffer,
        mimetype: 'image/webp',
        originalname: webpFilename(file.originalname),
        size: optimizedBuffer.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Image optimization failed folder=${folder} name=${file.originalname}: ${message} — storing original`,
      );
      return file;
    }
  }
}
