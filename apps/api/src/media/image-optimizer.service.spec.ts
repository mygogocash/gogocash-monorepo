import sharp from 'sharp';

import { MEDIA_FOLDER, resolveMediaFolder } from './media-folders.config';
import {
  ImageOptimizerService,
  resolveMaxImageWidth,
} from './image-optimizer.service';

/**
 * Synthesize a real PNG of the given size. Seeded LCG noise: deterministic,
 * but PNG-hostile (incompressible losslessly) the way photos are — so lossy
 * WebP re-encoding genuinely shrinks it, like real banner uploads.
 */
async function makePng(
  width: number,
  height: number,
  withAlpha = false,
): Promise<Buffer> {
  const channels = withAlpha ? 4 : 3;
  const raw = Buffer.alloc(width * height * channels);
  let seed = 42;
  for (let i = 0; i < raw.length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    raw[i] = seed >>> 24;
  }
  return sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
}

function asUpload(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Express.Multer.File {
  return {
    buffer,
    mimetype,
    originalname,
    size: buffer.length,
  } as Express.Multer.File;
}

describe('ImageOptimizerService', () => {
  const service = new ImageOptimizerService();

  it('optimizeUpload > given an oversized banner png > then resizes to the folder max width and re-encodes as webp', async () => {
    const original = await makePng(2400, 1350);
    const file = asUpload(original, 'hero.png', 'image/png');

    const optimized = await service.optimizeUpload(
      file,
      MEDIA_FOLDER.BANNER_HOME,
    );

    expect(optimized.mimetype).toBe('image/webp');
    expect(optimized.originalname).toBe('hero.webp');
    expect(optimized.buffer.length).toBeLessThan(original.length);
    const meta = await sharp(optimized.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(resolveMaxImageWidth(MEDIA_FOLDER.BANNER_HOME));
  });

  it('optimizeUpload > given a small logo with alpha > then keeps dimensions (no upscale) and preserves transparency', async () => {
    const original = await makePng(300, 300, true);
    const file = asUpload(original, 'logo.png', 'image/png');

    const optimized = await service.optimizeUpload(file, MEDIA_FOLDER.BRANDS);

    const meta = await sharp(optimized.buffer).metadata();
    expect(meta.width).toBe(300);
    expect(meta.hasAlpha).toBe(true);
    expect(optimized.mimetype).toBe('image/webp');
  });

  it('optimizeUpload > given a jpeg photo > then converts to webp under the folder cap', async () => {
    const originalPng = await makePng(2000, 1000);
    const originalJpeg = await sharp(originalPng)
      .jpeg({ quality: 95 })
      .toBuffer();
    const file = asUpload(originalJpeg, 'photo.JPG', 'image/jpeg');

    const optimized = await service.optimizeUpload(file, MEDIA_FOLDER.BRANDS);

    expect(optimized.mimetype).toBe('image/webp');
    expect(optimized.originalname).toBe('photo.webp');
    const meta = await sharp(optimized.buffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(
      resolveMaxImageWidth(MEDIA_FOLDER.BRANDS),
    );
  });

  it('optimizeUpload > given non-optimizable content types > then passes them through untouched', async () => {
    const svg = asUpload(Buffer.from('<svg/>'), 'icon.svg', 'image/svg+xml');
    const gif = asUpload(Buffer.from('GIF89a'), 'anim.gif', 'image/gif');
    const pdf = asUpload(Buffer.from('%PDF-1.4'), 'doc.pdf', 'application/pdf');

    for (const file of [svg, gif, pdf]) {
      const result = await service.optimizeUpload(file, MEDIA_FOLDER.BRANDS);
      expect(result).toBe(file);
    }
  });

  it('optimizeUpload > given a private evidence folder > then never rewrites the original (proof documents)', async () => {
    const original = await makePng(2400, 1350);
    const file = asUpload(original, 'slip.png', 'image/png');

    const result = await service.optimizeUpload(
      file,
      MEDIA_FOLDER.WITHDRAW_SLIPS,
    );

    expect(result).toBe(file);
  });

  it('optimizeUpload > given a corrupt buffer claiming to be an image > then falls back to the original instead of failing the upload', async () => {
    const file = asUpload(
      Buffer.from('definitely-not-a-png'),
      'broken.png',
      'image/png',
    );

    const result = await service.optimizeUpload(file, MEDIA_FOLDER.BANNER_HOME);

    expect(result).toBe(file);
  });

  it('resolveMaxImageWidth > pins the per-folder caps', () => {
    expect(resolveMaxImageWidth(MEDIA_FOLDER.BANNER_HOME)).toBe(1920);
    expect(resolveMaxImageWidth(MEDIA_FOLDER.BRANDS)).toBe(1024);
    expect(resolveMaxImageWidth(MEDIA_FOLDER.CATEGORIES)).toBe(512);
    expect(resolveMaxImageWidth(MEDIA_FOLDER.PROFILE_AVATARS)).toBe(512);
    expect(resolveMaxImageWidth(MEDIA_FOLDER.QUESTS)).toBe(1920);
  });

  /**
   * #493 — brand banners were downsampled to the 1024px `brands` cap because the wide
   * hero and the square logo shared one folder. A 2400-3840px banner lost 2.3-3.75x of
   * its linear resolution on upload and the original was never retained, so the loss is
   * permanent. Wide hero art gets its own folder at the same 1920px the other banner
   * folders already use; the logo cap stays 1024 because logos render at <=320px and
   * raising it would inflate every card image.
   */
  it('brand banners > given the wide hero folder > then it is capped like other banners, not like logos', () => {
    expect(MEDIA_FOLDER.BRAND_BANNERS).toBe('brand-banners');
    expect(resolveMaxImageWidth(MEDIA_FOLDER.BRAND_BANNERS)).toBe(1920);
    expect(resolveMaxImageWidth(MEDIA_FOLDER.BRAND_BANNERS)).toBe(
      resolveMaxImageWidth(MEDIA_FOLDER.BANNER_HOME),
    );
    // The split only helps if logos did NOT come along for the ride.
    expect(resolveMaxImageWidth(MEDIA_FOLDER.BRANDS)).toBe(1024);
  });

  it('brand banners > given the env prefix map > then the new folder is overridable like every other', () => {
    // resolveMediaFolder reverse-looks-up by value, so a folder with no GCS_MEDIA_PREFIX_*
    // entry silently loses env overrides. Nothing else enforces the pairing.
    expect(resolveMediaFolder(MEDIA_FOLDER.BRAND_BANNERS)).toBe(
      'brand-banners',
    );
    process.env.GCS_MEDIA_PREFIX_BRAND_BANNERS = 'custom-brand-banners';
    try {
      expect(resolveMediaFolder(MEDIA_FOLDER.BRAND_BANNERS)).toBe(
        'custom-brand-banners',
      );
    } finally {
      delete process.env.GCS_MEDIA_PREFIX_BRAND_BANNERS;
    }
  });
});
