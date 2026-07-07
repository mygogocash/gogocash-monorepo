import { Test, TestingModule } from '@nestjs/testing';

import { GoogleDriveService } from 'src/google-drive/google-drive.service';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { MEDIA_FOLDER } from './media-folders.config';
import { StoredMediaService } from './stored-media.service';

describe('StoredMediaService', () => {
  let service: StoredMediaService;
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
        { provide: R2ObjectStorageService, useValue: r2ObjectStorage },
        { provide: GoogleDriveService, useValue: googleDriveService },
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
