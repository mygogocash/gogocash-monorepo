import { normalizeSlugSegment } from 'src/common/mongo-query';

const GCS_PUBLIC_HOST = 'storage.googleapis.com';

export type GcsObjectLocation = {
  bucket: string;
  objectKey: string;
};

/**
 * Build a stable, slugified object key `<folder>/<timestamp>-<name>.<ext>`.
 * Shared by every object-storage backend (GCS, R2) so key shape is identical
 * regardless of where the bytes land.
 */
export function buildMediaObjectKey(
  folder: string,
  originalName: string,
): string {
  const trimmed = (originalName || 'upload.bin').trim();
  const dotIndex = trimmed.lastIndexOf('.');
  const baseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const extension =
    dotIndex > 0 ? trimmed.slice(dotIndex + 1).toLowerCase() : '';
  const safeBase = normalizeSlugSegment(baseName, 120) || 'upload';
  const safeExtension = extension.replace(/[^a-z0-9]+/gi, '').slice(0, 10);
  const safeName = safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
  const safeFolder = normalizeSlugSegment(folder, 80) || 'uploads';
  return `${safeFolder}/${Date.now()}-${safeName}`;
}

/**
 * Build a public URL for an R2-served object: `<publicBaseUrl>/<objectKey>`.
 * R2 public access is bucket-scoped to a domain (r2.dev or a custom domain),
 * so — unlike GCS — there is no bucket segment in the path.
 */
export function buildR2PublicUrl(
  publicBaseUrl: string,
  objectKey: string,
): string {
  return buildGcsPublicUrl(publicBaseUrl, objectKey);
}

/**
 * Extract the object key from an R2 public URL, given the configured public
 * base. Returns null when the value isn't under this R2 base (so callers can
 * fall through to GCS / legacy handling). Requires a non-empty base.
 */
export function parseR2PublicUrl(
  value: string,
  publicBaseUrl: string,
): { objectKey: string } | null {
  const base = (publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith(`${base}/`)) {
    return null;
  }
  const objectKey = trimmed.slice(base.length + 1).replace(/^\/+/, '');
  return objectKey ? { objectKey } : null;
}

export function parseGcsPublicUrl(value: string): GcsObjectLocation | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('https://')) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname !== GCS_PUBLIC_HOST) {
      return null;
    }

    const path = url.pathname.replace(/^\/+/, '');
    const slashIndex = path.indexOf('/');
    if (slashIndex <= 0) {
      return null;
    }

    const bucket = path.slice(0, slashIndex);
    const objectKey = path.slice(slashIndex + 1);
    if (!bucket || !objectKey) {
      return null;
    }

    return { bucket, objectKey };
  } catch {
    return null;
  }
}

export function isLegacyGoogleDriveFileId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('://') || trimmed.includes('/')) {
    return false;
  }
  return /^[A-Za-z0-9_-]{10,}$/.test(trimmed);
}

export function buildGcsPublicUrl(publicBaseUrl: string, objectKey: string) {
  const base = publicBaseUrl.replace(/\/+$/, '');
  const key = objectKey.replace(/^\/+/, '');
  return `${base}/${key}`;
}

export type StoredMediaKind = 'empty' | 'gcs' | 'drive_id' | 'other';

export function classifyStoredMediaValue(value: unknown): StoredMediaKind {
  if (value == null) {
    return 'empty';
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return 'empty';
  }
  if (parseGcsPublicUrl(trimmed)) {
    return 'gcs';
  }
  if (isLegacyGoogleDriveFileId(trimmed)) {
    return 'drive_id';
  }
  return 'other';
}
