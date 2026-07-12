import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { GoogleDriveService } from 'src/google-drive/google-drive.service';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import {
  isPrivateMediaFolder,
  MediaFolder,
  resolveMediaFolder,
} from './media-folders.config';
import {
  isLegacyGoogleDriveFileId,
  isLocalMediaRef,
} from './stored-media.util';
import {
  deleteLocalMediaRef,
  getLocalMediaReadStream,
} from './local-object-storage';

@Injectable()
export class StoredMediaService {
  constructor(
    private readonly r2ObjectStorage: R2ObjectStorageService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly imageOptimizer: ImageOptimizerService,
  ) {}

  async upload(
    file: Express.Multer.File,
    folder: MediaFolder,
  ): Promise<string> {
    const prefix = resolveMediaFolder(folder);
    const access = isPrivateMediaFolder(folder) ? 'private' : 'public';
    // Resize + re-encode display images before storage (no-op for private
    // evidence folders, non-images, and anything the optimizer can't decode).
    const optimized = await this.imageOptimizer.optimizeUpload(file, folder);
    const uploaded = await this.r2ObjectStorage.uploadFile(
      optimized,
      prefix,
      access,
    );
    return uploaded.publicUrl;
  }

  async replace(
    file: Express.Multer.File,
    folder: MediaFolder,
    existing: unknown,
  ): Promise<string> {
    const stored = await this.upload(file, folder);
    if (existing) {
      await this.deleteStored(String(existing));
    }
    return stored;
  }

  async deleteStored(stored: string): Promise<void> {
    const trimmed = stored.trim();
    if (!trimmed) {
      return;
    }

    if (this.r2ObjectStorage.ownsUrl(trimmed)) {
      await this.r2ObjectStorage.deletePublicUrl(trimmed);
      return;
    }

    if (isLocalMediaRef(trimmed)) {
      await deleteLocalMediaRef(trimmed);
      return;
    }

    if (isLegacyGoogleDriveFileId(trimmed)) {
      await this.googleDriveService.deleteFile(trimmed);
    }
  }

  async getReadableStream(stored: string) {
    const trimmed = stored.trim();
    if (!trimmed) {
      throw new HttpException(
        'Missing media reference',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (this.r2ObjectStorage.ownsUrl(trimmed)) {
      return this.r2ObjectStorage.getFileStream(trimmed);
    }

    if (isLocalMediaRef(trimmed)) {
      try {
        return getLocalMediaReadStream(trimmed);
      } catch {
        throw new HttpException(
          'Local media file not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (isLegacyGoogleDriveFileId(trimmed)) {
      const driveRes = await this.googleDriveService.getFileStream(trimmed);
      return {
        stream: driveRes.data,
        contentType: 'application/octet-stream',
      };
    }

    throw new HttpException(
      'Unsupported media reference',
      HttpStatus.BAD_REQUEST,
    );
  }
}
