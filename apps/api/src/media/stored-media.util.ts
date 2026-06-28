const GCS_PUBLIC_HOST = 'storage.googleapis.com';

export type GcsObjectLocation = {
  bucket: string;
  objectKey: string;
};

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
