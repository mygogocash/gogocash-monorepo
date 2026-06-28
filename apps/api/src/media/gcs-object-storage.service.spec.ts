import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { GcsObjectStorageService } from './gcs-object-storage.service';

const saveMock = jest.fn();
const makePublicMock = jest.fn();
const deleteMock = jest.fn();
const getMetadataMock = jest.fn();
const createReadStreamMock = jest.fn();

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: saveMock,
        makePublic: makePublicMock,
        delete: deleteMock,
        getMetadata: getMetadataMock,
        createReadStream: createReadStreamMock,
      }),
    }),
  })),
}));

describe('GcsObjectStorageService', () => {
  let service: GcsObjectStorageService;

  beforeEach(async () => {
    saveMock.mockReset().mockResolvedValue(undefined);
    makePublicMock.mockReset().mockResolvedValue(undefined);
    deleteMock.mockReset().mockResolvedValue(undefined);
    getMetadataMock.mockReset().mockResolvedValue([{ contentType: 'image/png' }]);
    createReadStreamMock.mockReset().mockReturnValue('stream');
    delete process.env.GCS_MEDIA_UPLOAD_DISABLED;
    delete process.env.GCS_BANNER_UPLOAD_DISABLED;

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [GcsObjectStorageService],
    }).compile();

    service = moduleRef.get(GcsObjectStorageService);
  });

  it('uploadFile > given a public folder > then saves and makes object public', async () => {
    const result = await service.uploadFile(
      {
        originalname: 'Hero Banner.png',
        mimetype: 'image/png',
        buffer: Buffer.from('png-bytes'),
      } as Express.Multer.File,
      'banner-home',
      'public',
    );

    expect(result.publicUrl).toMatch(
      /^https:\/\/storage\.googleapis\.com\/gogocash-catalog-staging\/banner-home\/\d+-hero-banner\.png$/,
    );
    expect(makePublicMock).toHaveBeenCalled();
  });

  it('uploadFile > given private access > then skips makePublic', async () => {
    await service.uploadFile(
      {
        originalname: 'slip.png',
        mimetype: 'image/png',
        buffer: Buffer.from('x'),
      } as Express.Multer.File,
      'withdraw-slips',
      'private',
    );

    expect(makePublicMock).not.toHaveBeenCalled();
  });

  it('uploadFile > given uploads disabled > then throws 503', async () => {
    process.env.GCS_MEDIA_UPLOAD_DISABLED = 'true';

    await expect(
      service.uploadFile(
        {
          originalname: 'x.png',
          mimetype: 'image/png',
          buffer: Buffer.from('x'),
        } as Express.Multer.File,
        'banner-home',
      ),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('uploadFile > given file exceeds max bytes > then throws 400', async () => {
    process.env.GCS_MAX_UPLOAD_BYTES = '4';

    await expect(
      service.uploadFile(
        {
          originalname: 'x.png',
          mimetype: 'image/png',
          buffer: Buffer.from('12345'),
        } as Express.Multer.File,
        'banner-home',
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('deletePublicUrl > given a GCS public URL > then deletes the object', async () => {
    await service.deletePublicUrl(
      'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/old.png',
    );

    expect(deleteMock).toHaveBeenCalledWith({ ignoreNotFound: true });
  });
});
