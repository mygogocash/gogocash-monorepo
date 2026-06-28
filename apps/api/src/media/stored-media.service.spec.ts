import { Test, TestingModule } from '@nestjs/testing';

import { GoogleDriveService } from 'src/google-drive/google-drive.service';

import { GcsObjectStorageService } from './gcs-object-storage.service';
import { R2ObjectStorageService } from './r2-object-storage.service';
import { MEDIA_FOLDER } from './media-folders.config';
import { StoredMediaService } from './stored-media.service';

describe('StoredMediaService', () => {
  let service: StoredMediaService;
  let gcsObjectStorage: {
    uploadFile: jest.Mock;
    deletePublicUrl: jest.Mock;
    getFileStream: jest.Mock;
  };
  let r2ObjectStorage: {
    ownsUrl: jest.Mock;
    uploadFile: jest.Mock;
    deletePublicUrl: jest.Mock;
    getFileStream: jest.Mock;
  };
  let googleDriveService: {
    deleteFile: jest.Mock;
    getFileStream: jest.Mock;
  };
  const originalDriver = process.env.MEDIA_STORAGE_DRIVER;

  beforeEach(async () => {
    delete process.env.MEDIA_STORAGE_DRIVER;
    gcsObjectStorage = {
      uploadFile: jest.fn().mockResolvedValue({
        publicUrl:
          'https://storage.googleapis.com/gogocash-catalog-staging/brands/logo.png',
        objectKey: 'brands/logo.png',
        bucket: 'gogocash-catalog-staging',
        access: 'public',
      }),
      deletePublicUrl: jest.fn().mockResolvedValue(undefined),
      getFileStream: jest.fn(),
    };
    r2ObjectStorage = {
      // Default: R2 owns nothing (not configured) so legacy GCS routing wins.
      ownsUrl: jest.fn().mockReturnValue(false),
      uploadFile: jest.fn().mockResolvedValue({
        publicUrl: 'https://media-staging.gogocash.co/brands/logo.png',
        objectKey: 'brands/logo.png',
        bucket: 'gogocash-catalog-staging',
        access: 'public',
      }),
      deletePublicUrl: jest.fn().mockResolvedValue(undefined),
      getFileStream: jest.fn(),
    };
    googleDriveService = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFileStream: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StoredMediaService,
        { provide: GcsObjectStorageService, useValue: gcsObjectStorage },
        { provide: R2ObjectStorageService, useValue: r2ObjectStorage },
        { provide: GoogleDriveService, useValue: googleDriveService },
      ],
    }).compile();

    service = moduleRef.get(StoredMediaService);
  });

  afterEach(() => {
    if (originalDriver === undefined) {
      delete process.env.MEDIA_STORAGE_DRIVER;
    } else {
      process.env.MEDIA_STORAGE_DRIVER = originalDriver;
    }
  });

  it('upload > default driver > then uploads via GCS with public access', async () => {
    const stored = await service.upload(
      {
        originalname: 'logo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      MEDIA_FOLDER.BRANDS,
    );

    expect(stored).toContain('/brands/');
    expect(gcsObjectStorage.uploadFile).toHaveBeenCalledWith(
      expect.any(Object),
      'brands',
      'public',
    );
    expect(r2ObjectStorage.uploadFile).not.toHaveBeenCalled();
  });

  it('upload > MEDIA_STORAGE_DRIVER=r2 > then uploads via R2', async () => {
    process.env.MEDIA_STORAGE_DRIVER = 'r2';

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
    expect(gcsObjectStorage.uploadFile).not.toHaveBeenCalled();
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

    expect(gcsObjectStorage.uploadFile).toHaveBeenCalledWith(
      expect.any(Object),
      'withdraw-slips',
      'private',
    );
  });

  it('deleteStored > given an R2-owned url > then deletes via R2', async () => {
    r2ObjectStorage.ownsUrl.mockReturnValue(true);

    await service.deleteStored(
      'https://media-staging.gogocash.co/brands/x.png',
    );

    expect(r2ObjectStorage.deletePublicUrl).toHaveBeenCalledWith(
      'https://media-staging.gogocash.co/brands/x.png',
    );
    expect(gcsObjectStorage.deletePublicUrl).not.toHaveBeenCalled();
  });

  it('deleteStored > given a legacy GCS url > then deletes via GCS', async () => {
    await service.deleteStored(
      'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
    );

    expect(gcsObjectStorage.deletePublicUrl).toHaveBeenCalledWith(
      'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
    );
    expect(r2ObjectStorage.deletePublicUrl).not.toHaveBeenCalled();
  });

  it('deleteStored > given legacy drive id > then deletes via Drive API', async () => {
    await service.deleteStored('legacy-drive-file-id-12345');

    expect(googleDriveService.deleteFile).toHaveBeenCalledWith(
      'legacy-drive-file-id-12345',
    );
  });

  it('replace > given existing gcs url > then deletes old object after upload', async () => {
    await service.replace(
      {
        originalname: 'hero.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      MEDIA_FOLDER.BANNER_HOME,
      'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
    );

    expect(gcsObjectStorage.deletePublicUrl).toHaveBeenCalledWith(
      'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
    );
  });
});
