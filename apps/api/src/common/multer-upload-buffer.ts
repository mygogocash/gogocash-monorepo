import { readFile, realpath } from 'fs/promises';
import { tmpdir } from 'os';
import { resolve, sep } from 'path';

const allowedUploadRoots = new Set<string>();

async function getAllowedUploadRoots(): Promise<string[]> {
  if (allowedUploadRoots.size > 0) {
    return [...allowedUploadRoots];
  }

  const roots = [tmpdir()];
  const configuredRoot = process.env.MULTER_UPLOAD_DIR?.trim();
  if (configuredRoot) {
    roots.push(configuredRoot);
  }

  for (const root of roots) {
    try {
      allowedUploadRoots.add(await realpath(root));
    } catch {
      allowedUploadRoots.add(resolve(root));
    }
  }

  return [...allowedUploadRoots];
}

function isPathWithinRoot(resolvedPath: string, root: string): boolean {
  return resolvedPath === root || resolvedPath.startsWith(`${root}${sep}`);
}

export async function resolveSafeMulterDiskPath(
  filePath: string,
): Promise<string> {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new Error('Invalid upload file path');
  }

  let resolvedPath: string;
  try {
    resolvedPath = await realpath(trimmed);
  } catch {
    throw new Error('Invalid upload file path');
  }

  const allowedRoots = await getAllowedUploadRoots();
  if (!allowedRoots.some((root) => isPathWithinRoot(resolvedPath, root))) {
    throw new Error('Invalid upload file path');
  }

  return resolvedPath;
}

export async function readMulterUploadBuffer(
  file: Express.Multer.File,
): Promise<Buffer> {
  if (file.buffer?.length) {
    return file.buffer;
  }

  if (file.path) {
    const safePath = await resolveSafeMulterDiskPath(file.path);
    const fromDisk = await readFile(safePath);
    if (fromDisk.length > 0) {
      return fromDisk;
    }
  }

  throw new Error('Upload file is empty');
}
