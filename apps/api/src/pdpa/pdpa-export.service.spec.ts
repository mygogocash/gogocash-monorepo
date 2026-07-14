import { Types } from 'mongoose';
import { BadRequestException, HttpException } from '@nestjs/common';
import { fromBuffer } from 'yauzl';
import type { Entry } from 'yauzl';
import { PdpaExportService } from './pdpa-export.service';
import type { PdpaDataBundle } from './pdpa-gather.service';

const USER_ID = '507f1f77bcf86cd799439011';

const minimalBundle = (): PdpaDataBundle => ({
  profile: {
    email: 'seeker@example.com',
    username: 'seeker',
    mobile: '+66812345678',
  },
  myCashbacks: [],
  withdrawMethods: [],
  withdrawals: [],
  favoriteOffers: [],
  missionOrders: [],
  points: [],
  socialRewards: [],
  deeplinks: [],
  gototrackSettings: null,
});

async function readZipEntries(zip: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    fromBuffer(zip, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error('ZIP archive could not be opened.'));
        return;
      }

      const entries = new Map<string, Buffer>();
      const fail = (error: Error) => {
        zipFile.close();
        reject(error);
      };

      zipFile.on('error', fail);
      zipFile.on('entry', (entry: Entry) => {
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            fail(
              streamError ?? new Error(`${entry.fileName} could not be read.`),
            );
            return;
          }

          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('error', fail);
          stream.on('end', () => {
            entries.set(entry.fileName, Buffer.concat(chunks));
            zipFile.readEntry();
          });
        });
      });
      zipFile.on('end', () => resolve(entries));
      zipFile.readEntry();
    });
  });
}

function makeExportService(
  opts: {
    recentRequest?: { _id: Types.ObjectId } | null;
    zipBytes?: number;
    bundleEmail?: string | null;
  } = {},
) {
  const zipBytes = opts.zipBytes ?? 1024;
  const create = jest.fn().mockImplementation(async (doc: unknown) => ({
    ...(doc as object),
    _id: new Types.ObjectId(),
  }));
  const findOne = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(opts.recentRequest ?? null),
    }),
  });
  const requestModel = { create, findOne };

  const gatherForUser = jest.fn().mockResolvedValue({
    ...minimalBundle(),
    profile: {
      ...minimalBundle().profile,
      email:
        opts.bundleEmail === undefined
          ? 'seeker@example.com'
          : opts.bundleEmail,
    },
  });

  const sendEmail = jest.fn().mockResolvedValue(undefined);
  const uploadBuffer = jest.fn().mockResolvedValue({
    objectKey: `pdpa-exports/${USER_ID}/export.zip`,
    bucket: 'bucket',
    publicUrl: 'https://media.example/x.zip',
    access: 'private',
  });
  const getSignedDownloadUrl = jest
    .fn()
    .mockResolvedValue('https://signed.example/export.zip?sig=1');

  // Override the real ZIP builder when a delivery test needs a controlled size.
  const service = new PdpaExportService(
    requestModel as never,
    { gatherForUser } as never,
    { sendEmail } as never,
    { uploadBuffer, getSignedDownloadUrl } as never,
  );

  if (zipBytes !== 1024) {
    jest
      .spyOn(
        service as never as { buildZipArchive: () => Promise<Buffer> },
        'buildZipArchive',
      )
      .mockResolvedValue(Buffer.alloc(zipBytes, 1));
  }

  return {
    service,
    create,
    findOne,
    gatherForUser,
    sendEmail,
    uploadBuffer,
    getSignedDownloadUrl,
  };
}

describe('PdpaExportService', () => {
  it('requestDataExport > given small zip > emails as attachment and audits sent', async () => {
    const { service, sendEmail, uploadBuffer, create, gatherForUser } =
      makeExportService({ zipBytes: 2048 });

    const result = await service.requestDataExport(USER_ID, 'en');

    expect(gatherForUser).toHaveBeenCalledWith(USER_ID);
    expect(uploadBuffer).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'seeker@example.com',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'gogocash-data-export.zip',
          }),
        ]),
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: new Types.ObjectId(USER_ID),
        delivery: 'attachment',
        status: 'sent',
      }),
    );
    expect(result.status).toBe('sent');
    expect(result.delivery).toBe('attachment');
    expect(result.requestId).toBeTruthy();
  });

  it('requestDataExport > given zip over 25MB > uploads to R2 and emails signed link', async () => {
    const overLimit = 25 * 1024 * 1024 + 1;
    const { service, sendEmail, uploadBuffer, getSignedDownloadUrl, create } =
      makeExportService({ zipBytes: overLimit });

    const result = await service.requestDataExport(USER_ID, 'th');

    expect(uploadBuffer).toHaveBeenCalled();
    expect(getSignedDownloadUrl).toHaveBeenCalledWith(
      expect.stringContaining('pdpa-exports/'),
      24 * 60 * 60,
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'seeker@example.com',
        html: expect.stringContaining('https://signed.example/export.zip'),
      }),
    );
    expect(sendEmail.mock.calls[0][0].attachments).toBeUndefined();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        delivery: 'link',
        status: 'sent',
        sizeBytes: overLimit,
      }),
    );
    expect(result.delivery).toBe('link');
    expect(result.status).toBe('sent');
  });

  it('requestDataExport > given a request within 24h > rejects with a clear rate-limit message', async () => {
    const { service, sendEmail } = makeExportService({
      recentRequest: { _id: new Types.ObjectId() },
    });

    await expect(service.requestDataExport(USER_ID, 'en')).rejects.toThrow(
      /24|rate|already requested|once per day/i,
    );
    await expect(
      service.requestDataExport(USER_ID, 'en'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('requestDataExport > given profile without email > fails clearly', async () => {
    const { service } = makeExportService({ bundleEmail: null });

    await expect(
      service.requestDataExport(USER_ID, 'en'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('buildZipArchive > creates the exact export files with readable content', async () => {
    const { service } = makeExportService();
    const bundle = minimalBundle();
    const zip = await (
      service as never as {
        buildZipArchive: (
          bundle: PdpaDataBundle,
          locale: 'en' | 'th',
        ) => Promise<Buffer>;
      }
    ).buildZipArchive(bundle, 'en');
    const entries = await readZipEntries(zip);

    expect([...entries.keys()]).toEqual(['data.json', 'summary.html']);
    expect(entries.get('data.json')?.toString('utf8')).toBe(
      JSON.stringify(bundle, null, 2),
    );
    expect(entries.get('summary.html')?.toString('utf8')).toBe(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>GoGoCash data export summary</title></head><body><h1>GoGoCash data export summary</h1><ul><li>myCashbacks: 0</li><li>withdrawMethods: 0</li><li>withdrawals: 0</li><li>favoriteOffers: 0</li><li>missionOrders: 0</li><li>points: 0</li><li>socialRewards: 0</li><li>deeplinks: 0</li></ul><p>Full records are in data.json.</p></body></html>',
    );
  });
});
