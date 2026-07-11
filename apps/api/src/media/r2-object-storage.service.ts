import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';
import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';

import { resolveMaxUploadBytes } from './media-folders.config';
import {
  buildMediaObjectKey,
  buildR2PublicUrl,
  parseR2PublicUrl,
} from './stored-media.util';

export type R2UploadAccess = 'public' | 'private';

export type R2UploadedObject = {
  publicUrl: string;
  objectKey: string;
  bucket: string;
  access: R2UploadAccess;
};

/**
 * Cloudflare R2 object storage (S3-compatible). Public reads are served from a
 * public bucket domain (`R2_PUBLIC_BASE_URL`, e.g. an r2.dev or custom domain),
 * so uploads do NOT set per-object ACLs (R2 ignores them — public access is
 * bucket-scoped). Mirrors GcsObjectStorageService so StoredMediaService can use
 * either backend interchangeably.
 */
@Injectable()
export class R2ObjectStorageService {
  private readonly logger = new Logger(R2ObjectStorageService.name);
  private client: S3Client | null = null;

  getBucketName(): string {
    return process.env.R2_BUCKET?.trim() || '';
  }

  getEndpoint(): string {
    return process.env.R2_ENDPOINT?.trim() || '';
  }

  getPublicBaseUrl(): string {
    return process.env.R2_PUBLIC_BASE_URL?.trim() || '';
  }

  /** True when this URL is served by the configured R2 public domain. */
  ownsUrl(value: string): boolean {
    return parseR2PublicUrl(value, this.getPublicBaseUrl()) !== null;
  }

  private isConfigured(): boolean {
    return Boolean(
      this.getBucketName() &&
      this.getEndpoint() &&
      this.getPublicBaseUrl() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim(),
    );
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: process.env.R2_REGION?.trim() || 'auto',
        endpoint: this.getEndpoint(),
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() || '',
        },
      });
    }
    return this.client;
  }

  assertUploadConfigured(): void {
    if (
      process.env.MEDIA_UPLOAD_DISABLED?.trim() === 'true' ||
      process.env.GCS_MEDIA_UPLOAD_DISABLED?.trim() === 'true'
    ) {
      throw new HttpException(
        'Media uploads are disabled (MEDIA_UPLOAD_DISABLED=true).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!this.isConfigured()) {
      throw new HttpException(
        'R2 media storage is not configured (set R2_BUCKET, R2_ENDPOINT, ' +
          'R2_PUBLIC_BASE_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  buildObjectKey(folder: string, originalName: string): string {
    return buildMediaObjectKey(folder, originalName);
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

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    access: R2UploadAccess = 'public',
  ): Promise<R2UploadedObject> {
    this.assertUploadConfigured();

    const bucket = this.getBucketName();
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
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: file.mimetype || 'application/octet-stream',
          CacheControl:
            access === 'public'
              ? 'public, max-age=31536000'
              : 'private, max-age=0',
        }),
      );

      const publicUrl = buildR2PublicUrl(this.getPublicBaseUrl(), objectKey);
      this.logger.log(
        `R2 upload ok folder=${folder} access=${access} bytes=${buffer.length} ms=${Date.now() - startedAt}`,
      );
      return { publicUrl, objectKey, bucket, access };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown R2 upload error';
      this.logger.error(
        `R2 upload failed folder=${folder} ms=${Date.now() - startedAt}: ${message}`,
      );
      throw new HttpException(
        `Media upload failed (${message}). Check the R2_* configuration.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Upload a generated buffer (e.g. PDPA zip) at an explicit object key.
   * Always stored private — callers must use getSignedDownloadUrl for access.
   */
  async uploadBuffer(
    objectKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<R2UploadedObject> {
    this.assertUploadConfigured();
    const bucket = this.getBucketName();
    const startedAt = Date.now();
    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: contentType || 'application/octet-stream',
          CacheControl: 'private, max-age=0',
        }),
      );
      const publicUrl = buildR2PublicUrl(this.getPublicBaseUrl(), objectKey);
      this.logger.log(
        `R2 uploadBuffer ok key=${objectKey} bytes=${buffer.length} ms=${Date.now() - startedAt}`,
      );
      return { publicUrl, objectKey, bucket, access: 'private' };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown R2 upload error';
      this.logger.error(
        `R2 uploadBuffer failed key=${objectKey} ms=${Date.now() - startedAt}: ${message}`,
      );
      throw new HttpException(
        `Media upload failed (${message}). Check the R2_* configuration.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** Presigned GET URL for a private object (default ~24h). */
  async getSignedDownloadUrl(
    objectKey: string,
    ttlSeconds: number,
  ): Promise<string> {
    this.assertUploadConfigured();
    return getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: objectKey,
      }),
      { expiresIn: ttlSeconds },
    );
  }

  async deletePublicUrl(publicUrl: string): Promise<void> {
    const location = parseR2PublicUrl(publicUrl, this.getPublicBaseUrl());
    if (!location) {
      return;
    }
    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: this.getBucketName(),
          Key: location.objectKey,
        }),
      );
    } catch (error) {
      this.logger.error('Error deleting R2 object:', error);
    }
  }

  async getFileStream(
    storedUrl: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    const location = parseR2PublicUrl(storedUrl, this.getPublicBaseUrl());
    if (!location) {
      throw new HttpException(
        'Invalid R2 media reference',
        HttpStatus.BAD_REQUEST,
      );
    }
    const response = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: location.objectKey,
      }),
    );
    return {
      stream: response.Body as Readable,
      contentType:
        typeof response.ContentType === 'string'
          ? response.ContentType
          : 'application/octet-stream',
    };
  }
}
