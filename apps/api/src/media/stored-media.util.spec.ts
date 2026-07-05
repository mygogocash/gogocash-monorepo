import {
  buildGcsPublicUrl,
  buildLocalMediaRef,
  classifyStoredMediaValue,
  isLegacyGoogleDriveFileId,
  parseGcsPublicUrl,
  parseLocalMediaRef,
  rewriteGcsPublicUrlToR2,
} from './stored-media.util';

describe('stored-media.util', () => {
  describe('parseGcsPublicUrl', () => {
    it('rewriteGcsPublicUrlToR2 > given gcs url > then returns r2 url with same object key', () => {
      expect(
        rewriteGcsPublicUrlToR2(
          'https://storage.googleapis.com/gogocash-catalog-staging/brands/123-logo.png',
          'https://media-staging.gogocash.co',
        ),
      ).toBe('https://media-staging.gogocash.co/brands/123-logo.png');
    });

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

  describe('local media refs', () => {
    it('buildLocalMediaRef > given object key > then prefixes local-media', () => {
      expect(buildLocalMediaRef('banner-home/1.png')).toBe(
        'local-media:banner-home/1.png',
      );
    });

    it('parseLocalMediaRef > given local ref > then returns object key', () => {
      expect(parseLocalMediaRef('local-media:banner-home/1.png')).toBe(
        'banner-home/1.png',
      );
    });
  });

  describe('classifyStoredMediaValue', () => {
    it('classifyStoredMediaValue > given values > then buckets empty/gcs/local/drive/other', () => {
      expect(classifyStoredMediaValue(null)).toBe('empty');
      expect(
        classifyStoredMediaValue(
          'https://storage.googleapis.com/gogocash-catalog-staging/banner-home/x.png',
        ),
      ).toBe('gcs');
      expect(classifyStoredMediaValue('local-media:banner-home/x.png')).toBe(
        'local',
      );
      expect(
        classifyStoredMediaValue('1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh'),
      ).toBe('drive_id');
      expect(classifyStoredMediaValue('uploads/mock.png')).toBe('other');
    });
  });
});
