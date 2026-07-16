import { STORED_MEDIA_TARGET_SPECS } from '../../scripts/stored-media-targets';
import { MEDIA_FOLDER } from './media-folders.config';

describe('stored media banner targets', () => {
  it('inventories both legacy and keyed specific-page banner collections', () => {
    expect(STORED_MEDIA_TARGET_SPECS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'all_brand_banners',
          folder: MEDIA_FOLDER.BANNER_ALL_BRAND,
          fields: ['image_1', 'image_2', 'image_3'],
        }),
        expect.objectContaining({
          collection: 'specific_page_banners',
          folder: MEDIA_FOLDER.BANNER_SPECIFIC_PAGE,
          fields: ['image_1', 'image_2', 'image_3'],
        }),
      ]),
    );
  });
});
