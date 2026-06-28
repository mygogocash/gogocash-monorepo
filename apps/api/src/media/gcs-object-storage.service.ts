import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';

import { resolveMaxUploadBytes } from './media-folders.config';
import {
  buildGcsPublicUrl,
  buildMediaObjectKey,
  parseGcsPublicUrl,
} from './stored-media.util';

export type GcsUploadAccess = 'public' | 'private';

export type GcsUploadedObject = {
  publicUrl: string;
  objectKey: string;
  bucket: string;
  access: GcsUploadAccess;
};

@Injectable()
export class GcsObjectStorageService {
  private readonly logger = new Logger(GcsObjectStorageService.name);
  private storage: Storage | null = null;

  getBucketName(): string {
    return process.env.GCS_CATALOG_BUCKET?.trim() || 'gogocash-catalog-staging';
  }

  getPublicBaseUrl(): string {
    const bucket = this.getBucketName();
    return (
      process.env.GCS_CATALOG_PUBLIC_BASE_URL?.trim() ||
      `https://storage.googleapis.com/${bucket}`
    );
  }

  private getStorageClient(): Storage {
    if (!this.storage) {
      this.storage = new Storage();
    }
    return this.storage;
  }

  assertUploadConfigured(): void {
    if (process.env.GCS_MEDIA_UPLOAD_DISABLED?.trim() === 'true') {
      throw new HttpException(
        'Media uploads are disabled (GCS_MEDIA_UPLOAD_DISABLED=true).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    // Back-compat with the banner-only flag.
    if (process.env.GCS_BANNER_UPLOAD_DISABLED?.trim() === 'true') {
      throw new HttpException(
        'Media uploads are disabled (GCS_BANNER_UPLOAD_DISABLED=true).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async readUploadBuffer(file: Express.Multer.File): Promise<Buffer> {
    try {
      return await readMulterUploadBuffer(file);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Invalid upload file path'
      ) {
        throw new HttpException(
          'Invalid upload file path',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException('Upload file is empty', HttpStatus.BAD_REQUEST);
    }
  }

  buildObjectKey(folder: string, originalName: string): string {
    return buildMediaObjectKey(folder, originalName);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    access: GcsUploadAccess = 'public',
  ): Promise<GcsUploadedObject> {
    this.assertUploadConfigured();

    const bucketName = this.getBucketName();
    const objectKey = this.buildObjectKey(
      folder,
      file.originalname || 'upload',
    );
    const buffer = await this.readUploadBuffer(file);
    const maxBytes = resolveMaxUploadBytes();
    if (buffer.length > maxBytes) {
      throw new HttpException(
        `Upload exceeds maximum size of ${maxBytes} bytes`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const startedAt = Date.now();
    try {
      const bucket = this.getStorageClient().bucket(bucketName);
      const object = bucket.file(objectKey);
      await object.save(buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        resumable: false,
        metadata: {
          cacheControl:
            access === 'public'
              ? 'public, max-age=31536000'
              : 'private, max-age=0',
        },
      });
      if (access === 'public') {
        await object.makePublic();
      }

      const publicUrl = buildGcsPublicUrl(this.getPublicBaseUrl(), objectKey);
      this.logger.log(
        `GCS upload ok folder=${folder} access=${access} bytes=${buffer.length} ms=${Date.now() - startedAt}`,
      );
      return { publicUrl, objectKey, bucket: bucketName, access };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown GCS upload error';
      this.logger.error(
        `GCS upload failed folder=${folder} ms=${Date.now() - startedAt}: ${message}`,
      );
      throw new HttpException(
        `Media upload failed (${message}). Configure GCS_CATALOG_BUCKET and GOOGLE_APPLICATION_CREDENTIALS (or Cloud Run service account).`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** @deprecated use uploadFile */
  async uploadPublicFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<GcsUploadedObject> {
    return this.uploadFile(file, folder, 'public');
  }

  async deletePublicUrl(publicUrl: string): Promise<void> {
    const location = parseGcsPublicUrl(publicUrl);
    if (!location) {
      return;
    }

    try {
      await this.getStorageClient()
        .bucket(location.bucket)
        .file(location.objectKey)
        .delete({ ignoreNotFound: true });
    } catch (error) {
      this.logger.error('Error deleting GCS object:', error);
    }
  }

  async getFileStream(storedUrl: string) {
    const location = parseGcsPublicUrl(storedUrl);
    if (!location) {
      throw new HttpException(
        'Invalid GCS media reference',
        HttpStatus.BAD_REQUEST,
      );
    }
    const [metadata] = await this.getStorageClient()
      .bucket(location.bucket)
      .file(location.objectKey)
      .getMetadata();
    const stream = this.getStorageClient()
      .bucket(location.bucket)
      .file(location.objectKey)
      .createReadStream();
    return {
      stream,
      contentType:
        typeof metadata.contentType === 'string'
          ? metadata.contentType
          : 'application/octet-stream',
    };
  }
}
