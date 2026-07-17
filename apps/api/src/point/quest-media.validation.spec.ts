import { BadRequestException } from '@nestjs/common';

import {
  QUEST_BANNER_FIELDS,
  validateQuestBannerFiles,
} from './quest-media.validation';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
  'base64',
);

function image(name: string, buffer = ONE_PIXEL_PNG): Express.Multer.File {
  return {
    fieldname: name,
    originalname: `${name}.png`,
    encoding: '7bit',
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
  } as Express.Multer.File;
}

describe('validateQuestBannerFiles', () => {
  it('rejects a new quest missing any multipart banner before downstream work can begin', async () => {
    const files = Object.fromEntries(
      QUEST_BANNER_FIELDS.slice(0, 3).map(({ key }) => [key, [image(key)]]),
    );

    await expect(validateQuestBannerFiles(files, true)).rejects.toEqual(
      expect.objectContaining<Partial<BadRequestException>>({
        message:
          'All four quest banners are required when creating a quest: Sub banner TH.',
      }),
    );
  });

  it('rejects a spoofed image with a field-specific error', async () => {
    const files = Object.fromEntries(
      QUEST_BANNER_FIELDS.map(({ key }) => [key, [image(key)]]),
    );
    files.banner_th = [image('banner_th', Buffer.from('not an image'))];

    await expect(validateQuestBannerFiles(files, true)).rejects.toMatchObject({
      message:
        'Banner TH must be a genuine PNG, JPEG, or WebP image. Please choose the image again.',
    });
  });

  it('returns exactly one genuine file per selected multipart field', async () => {
    const files = Object.fromEntries(
      QUEST_BANNER_FIELDS.map(({ key }) => [key, [image(key)]]),
    );

    const selected = await validateQuestBannerFiles(files, true);

    expect([...selected.keys()]).toEqual([
      'banner_en',
      'banner_th',
      'sub_banner_en',
      'sub_banner_th',
    ]);
    expect(selected.get('banner_en')).toBe(files.banner_en[0]);
  });
});
