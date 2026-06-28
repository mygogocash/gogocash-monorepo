import { Test, TestingModule } from '@nestjs/testing';

import { GoogleDriveService } from 'src/google-drive/google-drive.service';

import { GcsObjectStorageService } from './gcs-object-storage.service';
import { MEDIA_FOLDER } from './media-folders.config';
import { StoredMediaService } from './stored-media.service';

describe('StoredMediaService', () => {
  let service: StoredMediaService;
  let gcsObjectStorage: {
    uploadFile: jest.Mock;
    deletePublicUrl: jest.Mock;
    getFileStream: jest.Mock;
  };
  let googleDriveService: {
    deleteFile: jest.Mock;
    getFileStream: jest.Mock;
  };

  beforeEach(async () => {
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
    googleDriveService = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFileStream: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StoredMediaService,
        { provide: GcsObjectStorageService, useValue: gcsObjectStorage },
        { provide: GoogleDriveService, useValue: googleDriveService },
      ],
    }).compile();

    service = moduleRef.get(StoredMediaService);
  });

  it('upload > given a public folder > then uploads with public access', async () => {
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
