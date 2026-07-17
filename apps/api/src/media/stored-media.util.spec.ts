import {
  buildGcsPublicUrl,
  buildCommandOwnedMediaObjectKey,
  buildLocalMediaRef,
  classifyStoredMediaValue,
  isLegacyGoogleDriveFileId,
  parseGcsPublicUrl,
  parseLocalMediaRef,
  rewriteGcsPublicUrlToR2,
} from './stored-media.util';

describe('stored-media.util', () => {
  describe('buildCommandOwnedMediaObjectKey', () => {
    it('is deterministic for a command, payload hash, and original extension', () => {
      const first = buildCommandOwnedMediaObjectKey(
        'categories',
        'policy-save:ABC-123',
        'attempt-A',
        'a'.repeat(64),
        'Default Banner.PNG',
      );
      const second = buildCommandOwnedMediaObjectKey(
        'categories',
        'policy-save:ABC-123',
        'attempt-A',
        'a'.repeat(64),
        'renamed.PNG',
      );

      expect(first).toBe(second);
      expect(first).toMatch(
        new RegExp(
          `^categories/policy-save-abc-123-[a-f0-9]{16}/attempt-a-[a-f0-9]{16}/${'a'.repeat(64)}\\.png$`,
        ),
      );
    });

    it('keeps slug-colliding owner keys cryptographically distinct', () => {
      const spaced = buildCommandOwnedMediaObjectKey(
        'categories',
        'owner key',
        'attempt-a',
        'a'.repeat(64),
        'x.png',
      );
      const dashed = buildCommandOwnedMediaObjectKey(
        'categories',
        'owner-key',
        'attempt-a',
        'a'.repeat(64),
        'x.png',
      );
      expect(spaced).not.toBe(dashed);
    });

    it('rejects an unsafe or malformed digest instead of generating a broad key', () => {
      expect(() =>
        buildCommandOwnedMediaObjectKey(
          'categories',
          '../',
          'attempt-a',
          'not-a-hash',
          'x',
        ),
      ).toThrow('Invalid command-owned media identity');
    });

    it('keeps retry attempts cryptographically distinct for the same request and bytes', () => {
      const attemptA = buildCommandOwnedMediaObjectKey(
        'categories',
        'policy-save-1',
        'attempt-a',
        'a'.repeat(64),
        'default.png',
      );
      const attemptB = buildCommandOwnedMediaObjectKey(
        'categories',
        'policy-save-1',
        'attempt-b',
        'a'.repeat(64),
        'default.png',
      );
      expect(attemptB).not.toBe(attemptA);
    });
  });

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
