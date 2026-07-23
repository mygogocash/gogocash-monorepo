import { Test, TestingModule } from '@nestjs/testing';

import { GoogleDriveService } from 'src/google-drive/google-drive.service';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import { CdnCachePurgeService } from './cdn-cache-purge.service';
import { MEDIA_FOLDER } from './media-folders.config';
import { StoredMediaService } from './stored-media.service';
import { MediaOriginalArchiveService } from './media-original-archive.service';
import { buildCommandOwnedMediaObjectKey } from './stored-media.util';

describe('StoredMediaService', () => {
  let service: StoredMediaService;
  let r2ObjectStorage: {
    ownsUrl: jest.Mock;
    uploadFile: jest.Mock;
    describeUploadAtKey: jest.Mock;
    describeObjectAtKey: jest.Mock;
    uploadFileAtKey: jest.Mock;
    deletePublicUrl: jest.Mock;
    deleteObjectStrict: jest.Mock;
    objectExistsStrict: jest.Mock;
    getFileStream: jest.Mock;
  };
  let googleDriveService: {
    deleteFile: jest.Mock;
    getFileStream: jest.Mock;
  };
  let imageOptimizer: { optimizeUpload: jest.Mock };
  let cdnCachePurge: { purgeUrls: jest.Mock };
  let originalArchive: { archiveOriginal: jest.Mock };

  beforeEach(async () => {
    r2ObjectStorage = {
      ownsUrl: jest.fn((url: string) =>
        url.startsWith('https://media-staging.gogocash.co/'),
      ),
      uploadFile: jest.fn().mockResolvedValue({
        publicUrl: 'https://media-staging.gogocash.co/brands/logo.png',
        objectKey: 'brands/logo.png',
        bucket: 'gogocash-catalog-staging',
        access: 'public',
      }),
      uploadFileAtKey: jest.fn(),
      describeUploadAtKey: jest.fn((objectKey: string) => ({
        publicUrl: `https://media-staging.gogocash.co/${objectKey}`,
        objectKey,
        bucket: 'gogocash-catalog-staging',
        access: 'public',
      })),
      describeObjectAtKey: jest.fn((objectKey: string) => ({
        publicUrl: `https://media-staging.gogocash.co/${objectKey}`,
        objectKey,
        bucket: 'gogocash-catalog-staging',
        access: 'public',
      })),
      deletePublicUrl: jest.fn().mockResolvedValue(undefined),
      deleteObjectStrict: jest.fn().mockResolvedValue(undefined),
      objectExistsStrict: jest.fn().mockResolvedValue(false),
      getFileStream: jest.fn(),
    };
    googleDriveService = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFileStream: jest.fn(),
    };
    imageOptimizer = {
      optimizeUpload: jest.fn((file: Express.Multer.File) =>
        Promise.resolve(file),
      ),
    };

    cdnCachePurge = {
      purgeUrls: jest.fn().mockResolvedValue({ purged: true }),
    };

    originalArchive = { archiveOriginal: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StoredMediaService,
        { provide: R2ObjectStorageService, useValue: r2ObjectStorage },
        { provide: GoogleDriveService, useValue: googleDriveService },
        { provide: ImageOptimizerService, useValue: imageOptimizer },
        { provide: CdnCachePurgeService, useValue: cdnCachePurge },
        { provide: MediaOriginalArchiveService, useValue: originalArchive },
      ],
    }).compile();

    service = moduleRef.get(StoredMediaService);
  });

  it('upload > then uploads via R2 with public access', async () => {
    const stored = await service.upload(
      {
        originalname: 'logo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      MEDIA_FOLDER.BRANDS,
    );

    expect(stored).toBe('https://media-staging.gogocash.co/brands/logo.png');
    expect(r2ObjectStorage.uploadFile).toHaveBeenCalledWith(
      expect.any(Object),
      'brands',
      'public',
    );
  });

  it('upload > runs the file through the image optimizer and uploads the optimized result', async () => {
    const original = {
      originalname: 'hero.png',
      mimetype: 'image/png',
      buffer: Buffer.from('original-bytes'),
    } as Express.Multer.File;
    const optimized = {
      originalname: 'hero.webp',
      mimetype: 'image/webp',
      buffer: Buffer.from('tiny'),
    } as Express.Multer.File;
    imageOptimizer.optimizeUpload.mockResolvedValueOnce(optimized);

    await service.upload(original, MEDIA_FOLDER.BANNER_HOME);

    expect(imageOptimizer.optimizeUpload).toHaveBeenCalledWith(
      original,
      MEDIA_FOLDER.BANNER_HOME,
    );
    expect(r2ObjectStorage.uploadFile).toHaveBeenCalledWith(
      optimized,
      'banner-home',
      'public',
    );
  });

  it('upload > archives the ORIGINAL (not the optimized) to Drive with the served object key', async () => {
    const original = {
      originalname: 'hero.png',
      mimetype: 'image/png',
      buffer: Buffer.from('original-bytes'),
    } as Express.Multer.File;
    imageOptimizer.optimizeUpload.mockResolvedValueOnce({
      originalname: 'hero.webp',
      mimetype: 'image/webp',
      buffer: Buffer.from('tiny'),
    } as Express.Multer.File);

    const url = await service.upload(original, MEDIA_FOLDER.BANNER_HOME);

    expect(originalArchive.archiveOriginal).toHaveBeenCalledWith({
      original, // the pre-optimization file, not the webp
      folder: MEDIA_FOLDER.BANNER_HOME,
      objectKey: 'brands/logo.png',
      servedUrl: url,
    });
  });

  it('upload > given a private folder > then uploads with private access', async () => {
    await service.upload(
      {
        originalname: 'slip.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      MEDIA_FOLDER.WITHDRAW_SLIPS,
    );

    expect(r2ObjectStorage.uploadFile).toHaveBeenCalledWith(
      expect.any(Object),
      'withdraw-slips',
      'private',
    );
  });

  it('prepareCommandOwned > returns deterministic metadata without performing Put', async () => {
    r2ObjectStorage.uploadFileAtKey = jest.fn(
      async (_file: unknown, objectKey: string) => ({
        publicUrl: `https://media-staging.gogocash.co/${objectKey}`,
        objectKey,
        bucket: 'gogocash-catalog-staging',
        access: 'public',
      }),
    );
    const prepared = await service.prepareCommandOwned(
      {
        originalname: 'default.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      MEDIA_FOLDER.CATEGORIES,
      'policy-save-1',
      'attempt-a',
    );

    expect(r2ObjectStorage.describeUploadAtKey).toHaveBeenCalledWith(
      expect.stringMatching(
        /^categories\/policy-save-1-[a-f0-9]{16}\/attempt-a-[a-f0-9]{16}\/[a-f0-9]{64}\.png$/,
      ),
      'public',
    );
    expect(r2ObjectStorage.uploadFileAtKey).not.toHaveBeenCalled();
    expect(prepared.asset).toMatchObject({
      provider: 'r2',
      ownership: 'command-owned',
      owner_key: 'policy-save-1',
      owner_attempt_token: 'attempt-a',
      object_key: expect.stringMatching(
        /^categories\/policy-save-1-[a-f0-9]{16}\/attempt-a-[a-f0-9]{16}\//,
      ),
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      original_name: 'default.png',
    });

    await service.putCommandOwned(prepared, 12_345);
    expect(r2ObjectStorage.uploadFileAtKey).toHaveBeenCalledWith(
      prepared.file,
      prepared.asset.object_key,
      'public',
      { timeoutMs: 12_345 },
    );
  });

  it('deleteCommandOwnedStrict > rejects unverified legacy refs without deleting', async () => {
    await expect(
      service.deleteCommandOwnedStrict(
        {
          provider: 'legacy-unverified',
          ownership: 'legacy-unverified',
          url: 'legacy/path.png',
        },
        MEDIA_FOLDER.CATEGORIES,
      ),
    ).rejects.toThrow('Refusing to delete unverified media');
    expect(r2ObjectStorage.deleteObjectStrict).not.toHaveBeenCalled();
  });

  it('deleteCommandOwnedStrict > delegates exact bucket/key and propagates failure', async () => {
    const sha256 = 'a'.repeat(64);
    const objectKey = buildCommandOwnedMediaObjectKey(
      'categories',
      'policy-save-1',
      'attempt-a',
      sha256,
      'default.png',
    );
    r2ObjectStorage.deleteObjectStrict.mockRejectedValueOnce(
      new Error('delete failed'),
    );
    await expect(
      service.deleteCommandOwnedStrict(
        {
          provider: 'r2',
          ownership: 'command-owned',
          owner_key: 'policy-save-1',
          owner_attempt_token: 'attempt-a',
          bucket: 'gogocash-catalog-staging',
          object_key: objectKey,
          url: `https://media-staging.gogocash.co/${objectKey}`,
          sha256,
          original_name: 'default.png',
        },
        MEDIA_FOLDER.CATEGORIES,
      ),
    ).rejects.toThrow('delete failed');
  });

  it('deleteCommandOwnedStrict > purges the public URL from the CDN after the origin delete (#340)', async () => {
    const sha256 = 'a'.repeat(64);
    const objectKey = buildCommandOwnedMediaObjectKey(
      'categories',
      'policy-save-1',
      'attempt-a',
      sha256,
      'default.png',
    );
    const url = `https://media-staging.gogocash.co/${objectKey}`;
    await service.deleteCommandOwnedStrict(
      {
        provider: 'r2',
        ownership: 'command-owned',
        owner_key: 'policy-save-1',
        owner_attempt_token: 'attempt-a',
        bucket: 'gogocash-catalog-staging',
        object_key: objectKey,
        url,
        sha256,
        original_name: 'default.png',
      },
      MEDIA_FOLDER.CATEGORIES,
    );
    expect(r2ObjectStorage.deleteObjectStrict).toHaveBeenCalledTimes(1);
    expect(cdnCachePurge.purgeUrls).toHaveBeenCalledWith([url]);
    // The origin delete must run before the cache purge.
    expect(
      r2ObjectStorage.deleteObjectStrict.mock.invocationCallOrder[0],
    ).toBeLessThan(cdnCachePurge.purgeUrls.mock.invocationCallOrder[0]);
  });

  it('deleteCommandOwnedStrict > a CDN purge failure does not fail the authoritative delete (#340)', async () => {
    cdnCachePurge.purgeUrls.mockRejectedValueOnce(new Error('cf down'));
    const sha256 = 'a'.repeat(64);
    const objectKey = buildCommandOwnedMediaObjectKey(
      'categories',
      'policy-save-1',
      'attempt-a',
      sha256,
      'default.png',
    );
    await expect(
      service.deleteCommandOwnedStrict(
        {
          provider: 'r2',
          ownership: 'command-owned',
          owner_key: 'policy-save-1',
          owner_attempt_token: 'attempt-a',
          bucket: 'gogocash-catalog-staging',
          object_key: objectKey,
          url: `https://media-staging.gogocash.co/${objectKey}`,
          sha256,
          original_name: 'default.png',
        },
        MEDIA_FOLDER.CATEGORIES,
      ),
    ).resolves.toBeUndefined();
    expect(r2ObjectStorage.deleteObjectStrict).toHaveBeenCalledTimes(1);
  });

  it('verifyCommandOwnedAbsentStrict > validates provenance and requires exact HeadObject absence', async () => {
    const sha256 = 'a'.repeat(64);
    const objectKey = buildCommandOwnedMediaObjectKey(
      'categories',
      'policy-save-1',
      'attempt-a',
      sha256,
      'default.png',
    );
    const stored = {
      provider: 'r2' as const,
      ownership: 'command-owned' as const,
      owner_key: 'policy-save-1',
      owner_attempt_token: 'attempt-a',
      bucket: 'gogocash-catalog-staging',
      object_key: objectKey,
      url: `https://media-staging.gogocash.co/${objectKey}`,
      sha256,
      original_name: 'default.png',
    };

    await expect(
      service.verifyCommandOwnedAbsentStrict(
        stored,
        MEDIA_FOLDER.CATEGORIES,
        12_345,
      ),
    ).resolves.toBeUndefined();
    expect(r2ObjectStorage.objectExistsStrict).toHaveBeenCalledWith(
      stored.bucket,
      stored.object_key,
      { timeoutMs: 12_345 },
    );

    r2ObjectStorage.objectExistsStrict.mockResolvedValueOnce(true);
    await expect(
      service.verifyCommandOwnedAbsentStrict(stored, MEDIA_FOLDER.CATEGORIES),
    ).rejects.toThrow('Command-owned media object is still present');
  });

  it('verifyCommandOwnedAbsentStrict > refuses forged ownership before HeadObject', async () => {
    await expect(
      service.verifyCommandOwnedAbsentStrict(
        {
          provider: 'r2',
          ownership: 'command-owned',
          owner_key: 'policy-save-1',
          owner_attempt_token: 'attempt-a',
          bucket: 'gogocash-catalog-staging',
          object_key: 'categories/someone-else/valuable.png',
          url: 'https://media-staging.gogocash.co/categories/someone-else/valuable.png',
          sha256: 'a'.repeat(64),
          original_name: 'default.png',
        },
        MEDIA_FOLDER.CATEGORIES,
      ),
    ).rejects.toThrow('Refusing to verify unverified media');
    expect(r2ObjectStorage.objectExistsStrict).not.toHaveBeenCalled();
  });

  it('deleteCommandOwnedStrict > refuses a forged command-owned row targeting an arbitrary key', async () => {
    await expect(
      service.deleteCommandOwnedStrict(
        {
          provider: 'r2',
          ownership: 'command-owned',
          owner_key: 'policy-save-1',
          owner_attempt_token: 'attempt-a',
          bucket: 'gogocash-catalog-staging',
          object_key: 'categories/someone-else/valuable.png',
          url: 'https://media-staging.gogocash.co/categories/someone-else/valuable.png',
          sha256: 'a'.repeat(64),
          original_name: 'default.png',
        },
        MEDIA_FOLDER.CATEGORIES,
      ),
    ).rejects.toThrow('Refusing to delete unverified media');
    expect(r2ObjectStorage.deleteObjectStrict).not.toHaveBeenCalled();
  });

  it('deleteCommandOwnedStrict > refuses an otherwise valid key from another media folder', async () => {
    const sha256 = 'a'.repeat(64);
    const objectKey = buildCommandOwnedMediaObjectKey(
      'categories',
      'policy-save-1',
      'attempt-a',
      sha256,
      'default.png',
    );
    await expect(
      service.deleteCommandOwnedStrict(
        {
          provider: 'r2',
          ownership: 'command-owned',
          owner_key: 'policy-save-1',
          owner_attempt_token: 'attempt-a',
          bucket: 'gogocash-catalog-staging',
          object_key: objectKey,
          url: `https://media-staging.gogocash.co/${objectKey}`,
          sha256,
          original_name: 'default.png',
        },
        MEDIA_FOLDER.BRANDS,
      ),
    ).rejects.toThrow('Refusing to delete unverified media');
    expect(r2ObjectStorage.deleteObjectStrict).not.toHaveBeenCalled();
  });

  it('deleteCommandOwnedStrict > refuses a valid-looking key bound to another bucket', async () => {
    const sha256 = 'a'.repeat(64);
    const objectKey = buildCommandOwnedMediaObjectKey(
      'categories',
      'policy-save-1',
      'attempt-a',
      sha256,
      'default.png',
    );
    await expect(
      service.deleteCommandOwnedStrict(
        {
          provider: 'r2',
          ownership: 'command-owned',
          owner_key: 'policy-save-1',
          owner_attempt_token: 'attempt-a',
          bucket: 'someone-elses-bucket',
          object_key: objectKey,
          url: `https://media-staging.gogocash.co/${objectKey}`,
          sha256,
          original_name: 'default.png',
        },
        MEDIA_FOLDER.CATEGORIES,
      ),
    ).rejects.toThrow('Refusing to delete unverified media');
    expect(r2ObjectStorage.deleteObjectStrict).not.toHaveBeenCalled();
  });

  it('deleteStored > given an R2 url > then deletes via R2', async () => {
    await service.deleteStored(
      'https://media-staging.gogocash.co/brands/x.png',
    );

    expect(r2ObjectStorage.deletePublicUrl).toHaveBeenCalledWith(
      'https://media-staging.gogocash.co/brands/x.png',
    );
  });

  it('deleteStored > given legacy drive id > then deletes via Drive API', async () => {
    await service.deleteStored('legacy-drive-file-id-12345');

    expect(googleDriveService.deleteFile).toHaveBeenCalledWith(
      'legacy-drive-file-id-12345',
    );
  });

  it('getReadableStream > given a missing local media file > then rejects with a controlled 404', async () => {
    await expect(
      service.getReadableStream('local-media:missing-e2e-banner.png'),
    ).rejects.toMatchObject({
      status: 404,
      response: 'Local media file not found',
    });
  });

  it('replace > given existing R2 url > then deletes old object after upload', async () => {
    await service.replace(
      {
        originalname: 'hero.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      MEDIA_FOLDER.BANNER_HOME,
      'https://media-staging.gogocash.co/banner-home/old.png',
    );

    expect(r2ObjectStorage.deletePublicUrl).toHaveBeenCalledWith(
      'https://media-staging.gogocash.co/banner-home/old.png',
    );
  });
});
