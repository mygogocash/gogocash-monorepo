import { readFile, realpath } from 'fs/promises';
import { tmpdir } from 'os';
import { isAbsolute, relative, resolve, sep } from 'path';

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
    const resolved = resolve(root);
    allowedUploadRoots.add(resolved);
    try {
      allowedUploadRoots.add(await realpath(resolved));
    } catch {
      // keep unresolved root only
    }
  }

  return [...allowedUploadRoots];
}

function isPathWithinRoot(resolvedPath: string, root: string): boolean {
  return resolvedPath === root || resolvedPath.startsWith(`${root}${sep}`);
}

function isRelativePathWithinRoot(relativePath: string): boolean {
  if (!relativePath || relativePath === '.') {
    return true;
  }

  if (isAbsolute(relativePath)) {
    return false;
  }

  return !relativePath.split(sep).includes('..');
}

export async function resolveSafeMulterDiskPath(
  filePath: string,
): Promise<string> {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new Error('Invalid upload file path');
  }

  const allowedRoots = await getAllowedUploadRoots();
  for (const root of allowedRoots) {
    const rel = relative(root, resolve(trimmed));
    if (!isRelativePathWithinRoot(rel)) {
      continue;
    }

    const candidate = resolve(root, rel);
    let resolvedPath: string;
    try {
      resolvedPath = await realpath(candidate);
    } catch {
      continue;
    }

    if (
      allowedRoots.some((allowedRoot) =>
        isPathWithinRoot(resolvedPath, allowedRoot),
      )
    ) {
      return resolvedPath;
    }
  }

  throw new Error('Invalid upload file path');
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
