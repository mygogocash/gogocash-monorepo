import sharp from 'sharp';

import { MEDIA_FOLDER } from './media-folders.config';
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
});
