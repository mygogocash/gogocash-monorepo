import { HttpException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

import { R2ObjectStorageService } from './r2-object-storage.service';

const file = (
  originalname: string,
  mimetype = 'image/png',
): Express.Multer.File =>
  ({
    originalname,
    mimetype,
    buffer: Buffer.from('bytes'),
  }) as Express.Multer.File;

describe('R2ObjectStorageService', () => {
  let service: R2ObjectStorageService;
  let send: jest.SpyInstance;
  const ENV = {
    R2_BUCKET: 'gogocash-catalog-staging-abc',
    R2_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
    R2_PUBLIC_BASE_URL: 'https://media-staging.gogocash.co',
    R2_ACCESS_KEY_ID: 'key-id',
    R2_SECRET_ACCESS_KEY: 'secret',
  };
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    saved.MEDIA_STORAGE_DRIVER = process.env.MEDIA_STORAGE_DRIVER;
    send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    service = new R2ObjectStorageService();
  });

  afterEach(() => {
    send.mockRestore();
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k] as string;
    }
  });

  describe('ownsUrl', () => {
    it('is true only for urls under the configured public base', () => {
      expect(
        service.ownsUrl('https://media-staging.gogocash.co/brands/x.png'),
      ).toBe(true);
      expect(
        service.ownsUrl(
          'https://storage.googleapis.com/gogocash-catalog-staging/brands/x.png',
        ),
      ).toBe(false);
      expect(service.ownsUrl('https://evil.example.com/brands/x.png')).toBe(
        false,
      );
    });

    it('owns nothing when no public base is configured', () => {
      delete process.env.R2_PUBLIC_BASE_URL;
      expect(
        service.ownsUrl('https://media-staging.gogocash.co/brands/x.png'),
      ).toBe(false);
    });
  });

  describe('uploadFile', () => {
    it('throws 503 when R2 is not configured', async () => {
      delete process.env.R2_ACCESS_KEY_ID;
      await expect(
        service.uploadFile(file('logo.png'), 'brands'),
      ).rejects.toBeInstanceOf(HttpException);
      expect(send).not.toHaveBeenCalled();
    });

    it('PUTs the object and returns a public URL under the R2 base', async () => {
      const result = await service.uploadFile(file('Logo File.PNG'), 'brands');

      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe(ENV.R2_BUCKET);
      expect(command.input.Key).toMatch(/^brands\/\d+-logo-file\.png$/);
      expect(command.input.ContentType).toBe('image/png');
      expect(result.publicUrl).toBe(
        `${ENV.R2_PUBLIC_BASE_URL}/${result.objectKey}`,
      );
      expect(result.bucket).toBe(ENV.R2_BUCKET);
      expect(result.access).toBe('public');
    });
  });

  describe('deletePublicUrl', () => {
    it('DELETEs the parsed object key for an R2 url', async () => {
      await service.deletePublicUrl(
        'https://media-staging.gogocash.co/brands/123-logo.png',
      );
      const command = send.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input.Key).toBe('brands/123-logo.png');
    });

    it('is a no-op for a non-R2 url', async () => {
      await service.deletePublicUrl(
        'https://storage.googleapis.com/bucket/brands/x.png',
      );
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('getFileStream', () => {
    it('GETs the object and returns the stream + content type', async () => {
      const fakeStream = { pipe: jest.fn() };
      send.mockResolvedValueOnce({
        Body: fakeStream,
        ContentType: 'image/webp',
      } as never);

      const out = await service.getFileStream(
        'https://media-staging.gogocash.co/brands/123-logo.png',
      );
      const command = send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Key).toBe('brands/123-logo.png');
      expect(out.stream).toBe(fakeStream);
      expect(out.contentType).toBe('image/webp');
    });

    it('throws 400 for a non-R2 reference', async () => {
      await expect(
        service.getFileStream('https://storage.googleapis.com/b/k.png'),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });
});
