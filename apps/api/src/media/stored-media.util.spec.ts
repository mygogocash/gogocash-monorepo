import {
  buildGcsPublicUrl,
  classifyStoredMediaValue,
  isLegacyGoogleDriveFileId,
  parseGcsPublicUrl,
} from './stored-media.util';

describe('stored-media.util', () => {
  describe('parseGcsPublicUrl', () => {
    it('parseGcsPublicUrl > given storage.googleapis.com URL > then returns bucket and object key', () => {
      expect(
        parseGcsPublicUrl(
          'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/123-banner.png',
        ),
      ).toEqual({
        bucket: 'gogocash-catalog-staging',
        objectKey: 'banner-home/123-banner.png',
      });
    });

    it('parseGcsPublicUrl > given a Google Drive file id > then returns null', () => {
      expect(parseGcsPublicUrl('1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh')).toBeNull();
    });
  });

  describe('isLegacyGoogleDriveFileId', () => {
    it('isLegacyGoogleDriveFileId > given a bare drive id > then returns true', () => {
      expect(
        isLegacyGoogleDriveFileId('1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh'),
      ).toBe(true);
    });

    it('isLegacyGoogleDriveFileId > given a GCS public URL > then returns false', () => {
      expect(
        isLegacyGoogleDriveFileId(
          'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/x.png',
        ),
      ).toBe(false);
    });
  });

  describe('buildGcsPublicUrl', () => {
    it('buildGcsPublicUrl > given bucket base and object key > then joins path segments', () => {
      expect(
        buildGcsPublicUrl(
          'https://storage.googleapis.com/gogocash-catalog-staging',
          'banner-home/1.png',
        ),
      ).toBe(
        'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/1.png',
      );
    });
  });

  describe('classifyStoredMediaValue', () => {
    it('classifyStoredMediaValue > given values > then buckets empty/gcs/drive/other', () => {
      expect(classifyStoredMediaValue(null)).toBe('empty');
      expect(
        classifyStoredMediaValue(
          'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/x.png',
        ),
      ).toBe('gcs');
      expect(
        classifyStoredMediaValue('1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh'),
      ).toBe('drive_id');
      expect(classifyStoredMediaValue('uploads/mock.png')).toBe('other');
    });
  });
});
