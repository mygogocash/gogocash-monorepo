import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

import { buildLocalMediaRef, parseLocalMediaRef } from './stored-media.util';

export function getLocalMediaRootDir(): string {
  const configured =
    process.env.MEDIA_LOCAL_STORAGE_DIR?.trim() ||
    process.env.GCS_LOCAL_STORAGE_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), '.local-media');
}

export function shouldUseLocalMediaFallback(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function resolveLocalMediaAbsolutePath(objectKey: string): string {
  const normalized = objectKey.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Invalid local media object key');
  }
  const root = getLocalMediaRootDir();
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(path.resolve(root) + path.sep)) {
    throw new Error('Invalid local media object key');
  }
  return absolute;
}

export async function writeLocalMediaFile(
  objectKey: string,
  buffer: Buffer,
): Promise<string> {
  const absolutePath = resolveLocalMediaAbsolutePath(objectKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return buildLocalMediaRef(objectKey);
}

export async function deleteLocalMediaRef(stored: string): Promise<void> {
  const objectKey = parseLocalMediaRef(stored);
  if (!objectKey) {
    return;
  }
  try {
    await unlink(resolveLocalMediaAbsolutePath(objectKey));
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

export function getLocalMediaReadStream(stored: string) {
  const objectKey = parseLocalMediaRef(stored);
  if (!objectKey) {
    throw new Error('Invalid local media reference');
  }
  const absolutePath = resolveLocalMediaAbsolutePath(objectKey);
  const extension = path.extname(objectKey).slice(1).toLowerCase();
  const contentType =
    extension === 'png'
      ? 'image/png'
      : extension === 'jpg' || extension === 'jpeg'
        ? 'image/jpeg'
        : extension === 'webp'
          ? 'image/webp'
          : extension === 'gif'
            ? 'image/gif'
            : 'application/octet-stream';
  return {
    stream: createReadStream(absolutePath),
    contentType,
  };
}
