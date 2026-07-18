import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import { CdnCachePurgeService } from './cdn-cache-purge.service';
import {
  isPrivateMediaFolder,
  MediaFolder,
  resolveMediaFolder,
} from './media-folders.config';
import {
  buildCommandOwnedMediaObjectKey,
  canonicalMediaContentType,
  canonicalMediaOriginalName,
  isLegacyGoogleDriveFileId,
  isLocalMediaRef,
} from './stored-media.util';

export type StoredMediaAsset =
  | {
      provider: 'r2';
      ownership: 'command-owned';
      owner_key: string;
      owner_attempt_token: string;
      url: string;
      bucket: string;
      object_key: string;
      sha256?: string;
      original_name?: string;
      content_type?: string;
      uploaded_at?: Date;
    }
  | {
      provider: 'legacy-unverified';
      ownership: 'legacy-unverified';
      url: string;
    };

export type CommandOwnedStoredMediaAsset = Extract<
  StoredMediaAsset,
  { provider: 'r2' }
>;

export type PreparedCommandOwnedUpload = {
  asset: CommandOwnedStoredMediaAsset;
  file: Express.Multer.File;
  access: 'public' | 'private';
};

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
    private readonly cdnCachePurge: CdnCachePurgeService,
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

  /**
   * Prepare deterministic metadata and bytes without network I/O. The caller
   * must journal `asset` under an attempt fence before calling
   * `putCommandOwned`.
   */
  async prepareCommandOwned(
    file: Express.Multer.File,
    folder: MediaFolder,
    ownerKey: string,
    ownerAttemptToken: string,
  ): Promise<PreparedCommandOwnedUpload> {
    const prefix = resolveMediaFolder(folder);
    const access = isPrivateMediaFolder(folder) ? 'private' : 'public';
    const canonicalInput = {
      ...file,
      originalname: canonicalMediaOriginalName(file.originalname),
      mimetype: canonicalMediaContentType(file.mimetype),
    };
    const optimized = await this.imageOptimizer.optimizeUpload(
      canonicalInput,
      folder,
    );
    const buffer = await readMulterUploadBuffer(optimized);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const originalName = canonicalMediaOriginalName(
      optimized.originalname || canonicalInput.originalname,
    );
    const contentType = canonicalMediaContentType(
      optimized.mimetype || canonicalInput.mimetype,
    );
    const objectKey = buildCommandOwnedMediaObjectKey(
      prefix,
      ownerKey,
      ownerAttemptToken,
      sha256,
      originalName,
    );
    const planned = this.r2ObjectStorage.describeUploadAtKey(objectKey, access);
    const asset: CommandOwnedStoredMediaAsset = {
      provider: 'r2',
      ownership: 'command-owned',
      owner_key: ownerKey,
      owner_attempt_token: ownerAttemptToken,
      url: planned.publicUrl,
      bucket: planned.bucket,
      object_key: planned.objectKey,
      sha256,
      // Keep the exact name used to derive the deterministic extension. This
      // lets strict deletion recompute and verify the object key later.
      original_name: originalName,
      content_type: contentType,
    };
    return { asset, file: optimized, access };
  }

  /** Execute the exact Put planned above. Safe retries overwrite identical bytes. */
  async putCommandOwned(
    prepared: PreparedCommandOwnedUpload,
    timeoutMs: number,
  ): Promise<CommandOwnedStoredMediaAsset> {
    const uploaded = await this.r2ObjectStorage.uploadFileAtKey(
      prepared.file,
      prepared.asset.object_key,
      prepared.access,
      { timeoutMs },
    );
    if (
      uploaded.bucket !== prepared.asset.bucket ||
      uploaded.objectKey !== prepared.asset.object_key ||
      uploaded.publicUrl !== prepared.asset.url
    ) {
      throw new Error('R2 upload response did not match the journaled plan');
    }
    return prepared.asset;
  }

  async deleteCommandOwnedStrict(
    asset: StoredMediaAsset,
    expectedFolder: MediaFolder,
    timeoutMs = 15_000,
  ): Promise<void> {
    if (
      asset.provider !== 'r2' ||
      asset.ownership !== 'command-owned' ||
      !asset.bucket ||
      !asset.object_key ||
      !asset.owner_key ||
      !asset.owner_attempt_token ||
      !asset.sha256 ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !asset.original_name
    ) {
      throw new Error('Refusing to delete unverified media');
    }
    let expectedKey: string;
    try {
      expectedKey = buildCommandOwnedMediaObjectKey(
        resolveMediaFolder(expectedFolder),
        asset.owner_key,
        asset.owner_attempt_token,
        asset.sha256,
        asset.original_name,
      );
    } catch {
      throw new Error('Refusing to delete unverified media');
    }
    if (expectedKey !== asset.object_key) {
      throw new Error('Refusing to delete unverified media');
    }
    const access = isPrivateMediaFolder(expectedFolder) ? 'private' : 'public';
    const planned = this.r2ObjectStorage.describeObjectAtKey(
      expectedKey,
      access,
    );
    if (planned.bucket !== asset.bucket || planned.publicUrl !== asset.url) {
      throw new Error('Refusing to delete unverified media');
    }
    await this.r2ObjectStorage.deleteObjectStrict(
      asset.bucket,
      asset.object_key,
      {
        timeoutMs,
      },
    );
    // The R2 origin object is now gone, but the public URL is cached at the
    // Cloudflare edge with a 1-year max-age (correct for live content-addressed
    // media). Purge the exact file URL so a deleted object stops being served.
    // Best-effort and non-throwing: the authoritative delete already succeeded.
    await this.cdnCachePurge.purgeUrls([asset.url]).catch(() => undefined);
  }

  async verifyCommandOwnedAbsentStrict(
    asset: StoredMediaAsset,
    expectedFolder: MediaFolder,
    timeoutMs = 15_000,
  ): Promise<void> {
    if (
      asset.provider !== 'r2' ||
      asset.ownership !== 'command-owned' ||
      !asset.bucket ||
      !asset.object_key ||
      !asset.owner_key ||
      !asset.owner_attempt_token ||
      !asset.sha256 ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !asset.original_name
    ) {
      throw new Error('Refusing to verify unverified media');
    }
    let expectedKey: string;
    try {
      expectedKey = buildCommandOwnedMediaObjectKey(
        resolveMediaFolder(expectedFolder),
        asset.owner_key,
        asset.owner_attempt_token,
        asset.sha256,
        asset.original_name,
      );
    } catch {
      throw new Error('Refusing to verify unverified media');
    }
    if (expectedKey !== asset.object_key) {
      throw new Error('Refusing to verify unverified media');
    }
    const access = isPrivateMediaFolder(expectedFolder) ? 'private' : 'public';
    const planned = this.r2ObjectStorage.describeObjectAtKey(
      expectedKey,
      access,
    );
    if (planned.bucket !== asset.bucket || planned.publicUrl !== asset.url) {
      throw new Error('Refusing to verify unverified media');
    }
    if (
      await this.r2ObjectStorage.objectExistsStrict(
        asset.bucket,
        asset.object_key,
        { timeoutMs },
      )
    ) {
      throw new Error('Command-owned media object is still present');
    }
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
        return await getLocalMediaReadStream(trimmed);
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
