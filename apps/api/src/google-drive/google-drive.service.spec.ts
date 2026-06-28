import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { GoogleDriveService } from './google-drive.service';

const filesCreate = jest.fn();
const permissionsCreate = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    drive: jest.fn().mockReturnValue({
      files: {
        create: (...args: unknown[]) => filesCreate(...args),
      },
      permissions: {
        create: (...args: unknown[]) => permissionsCreate(...args),
      },
    }),
  },
}));

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;

  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';

    filesCreate.mockReset();
    permissionsCreate.mockReset();
    filesCreate.mockResolvedValue({
      data: { id: 'drive-file-id', name: 'banner.png' },
    });
    permissionsCreate.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleDriveService],
    }).compile();

    service = module.get<GoogleDriveService>(GoogleDriveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uploadFile > given in-memory buffer > then uploads bytes to Drive', async () => {
    const file = {
      originalname: 'banner.png',
      mimetype: 'image/png',
      buffer: Buffer.from('banner-bytes'),
    } as Express.Multer.File;

    const result = await service.uploadFile(file);

    expect(filesCreate).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('drive-file-id');
    expect(result.publicUrl).toBe(
      'https://drive.google.com/uc?export=view&id=drive-file-id',
    );
  });

  it('uploadFile > given disk path without buffer > then reads file from path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gogocash-drive-'));
    const filePath = join(dir, 'banner.png');
    await writeFile(filePath, 'disk-banner-bytes');

    try {
      const file = {
        originalname: 'banner.png',
        mimetype: 'image/png',
        path: filePath,
      } as Express.Multer.File;

      const result = await service.uploadFile(file);

      expect(filesCreate).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('drive-file-id');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('uploadFile > given missing Google credentials > then throws HttpException before calling Drive', async () => {
    const prev = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;

    const file = {
      originalname: 'banner.png',
      mimetype: 'image/png',
      buffer: Buffer.from('banner-bytes'),
    } as Express.Multer.File;

    try {
      await service.uploadFile(file);
      throw new Error('expected uploadFile to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect((err as HttpException).message).toContain(
        'Google Drive is not configured',
      );
      expect(filesCreate).not.toHaveBeenCalled();
    } finally {
      process.env.GOOGLE_CLIENT_ID = prev.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = prev.GOOGLE_CLIENT_SECRET;
      process.env.GOOGLE_REFRESH_TOKEN = prev.GOOGLE_REFRESH_TOKEN;
    }
  });

  it('uploadFile > given empty upload > then throws', async () => {
    const file = {
      originalname: 'empty.png',
      mimetype: 'image/png',
      buffer: Buffer.alloc(0),
    } as Express.Multer.File;

    await expect(service.uploadFile(file)).rejects.toThrow(
      'Upload file is empty',
    );
    expect(filesCreate).not.toHaveBeenCalled();
  });
});
