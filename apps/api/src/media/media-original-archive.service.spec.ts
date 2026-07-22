import { MediaOriginalArchiveService } from './media-original-archive.service';
import { MEDIA_FOLDER } from './media-folders.config';

function file(over: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'logo_desktop',
    originalname: 'logo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 4,
    buffer: Buffer.from('orig'),
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
    ...over,
  };
}

describe('MediaOriginalArchiveService', () => {
  let drive: { uploadFile: jest.Mock };
  let model: { updateOne: jest.Mock };
  let service: MediaOriginalArchiveService;

  beforeEach(() => {
    drive = { uploadFile: jest.fn() };
    model = { updateOne: jest.fn().mockResolvedValue({ acknowledged: true }) };
    service = new MediaOriginalArchiveService(
      drive as never,
      model as never,
    );
  });

  it('archives a public image original to Drive and records the mapping', async () => {
    drive.uploadFile.mockResolvedValue({
      id: 'drive-abc',
      publicUrl: 'https://drive.google.com/uc?export=view&id=drive-abc',
    });

    await service.archiveOriginal({
      original: file(),
      folder: MEDIA_FOLDER.BRANDS,
      objectKey: 'brands/xyz.webp',
      servedUrl: 'https://media.gogocash.co/brands/xyz.webp',
    });

    expect(drive.uploadFile).toHaveBeenCalledTimes(1);
    const [filter, update] = model.updateOne.mock.calls[0];
    expect(filter).toEqual({ object_key: 'brands/xyz.webp' });
    expect(update.$set).toMatchObject({
      object_key: 'brands/xyz.webp',
      served_url: 'https://media.gogocash.co/brands/xyz.webp',
      folder: MEDIA_FOLDER.BRANDS,
      drive_file_id: 'drive-abc',
      content_type: 'image/png',
    });
    // sha256 of "orig"
    expect(update.$set.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.updateOne.mock.calls[0][2]).toEqual({ upsert: true });
  });

  it('NEVER archives a private evidence folder to Drive', async () => {
    await service.archiveOriginal({
      original: file(),
      folder: MEDIA_FOLDER.WITHDRAW_SLIPS,
      objectKey: 'withdraw-slips/x',
      servedUrl: 'https://media.gogocash.co/withdraw-slips/x',
    });

    expect(drive.uploadFile).not.toHaveBeenCalled();
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('skips a non-image upload', async () => {
    await service.archiveOriginal({
      original: file({ mimetype: 'application/pdf' }),
      folder: MEDIA_FOLDER.BRANDS,
      objectKey: 'brands/x',
      servedUrl: 'https://media.gogocash.co/brands/x',
    });

    expect(drive.uploadFile).not.toHaveBeenCalled();
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('is best-effort: a Drive failure never throws and records nothing', async () => {
    drive.uploadFile.mockRejectedValue(new Error('Drive rate limited'));

    await expect(
      service.archiveOriginal({
        original: file(),
        folder: MEDIA_FOLDER.BRAND_BANNERS,
        objectKey: 'brand-banners/x',
        servedUrl: 'https://media.gogocash.co/brand-banners/x',
      }),
    ).resolves.toBeUndefined();

    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('is best-effort: a DB write failure never throws', async () => {
    drive.uploadFile.mockResolvedValue({ id: 'drive-abc' });
    model.updateOne.mockRejectedValue(new Error('mongo down'));

    await expect(
      service.archiveOriginal({
        original: file(),
        folder: MEDIA_FOLDER.CATEGORIES,
        objectKey: 'categories/x',
        servedUrl: 'https://media.gogocash.co/categories/x',
      }),
    ).resolves.toBeUndefined();
  });
});
