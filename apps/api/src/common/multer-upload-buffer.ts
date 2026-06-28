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

/** Join only vetted path segments under a resolved upload root (no raw user resolve). */
function joinUnderRoot(rootReal: string, userRelative: string): string | null {
  const segments = userRelative.split(/[/\\]/).filter(Boolean);
  if (segments.some((segment) => segment === '..')) {
    return null;
  }

  let current = rootReal;
  for (const segment of segments) {
    if (segment === '.') {
      continue;
    }
    current = resolve(current, segment);
    if (!isPathWithinRoot(current, rootReal)) {
      return null;
    }
  }

  return current;
}

export async function resolveSafeMulterDiskPath(
  filePath: string,
): Promise<string> {
  const trimmed = filePath.trim();
  if (!trimmed || trimmed.includes('\0')) {
    throw new Error('Invalid upload file path');
  }

  const allowedRoots = await getAllowedUploadRoots();
  for (const root of allowedRoots) {
    const rootBase = resolve(root);
    let rootReal: string;
    try {
      rootReal = await realpath(rootBase);
    } catch {
      continue;
    }

    const relativePath = isAbsolute(trimmed)
      ? relative(rootBase, trimmed)
      : trimmed;

    if (!isRelativePathWithinRoot(relativePath)) {
      continue;
    }

    const candidate = joinUnderRoot(rootBase, relativePath);
    if (!candidate) {
      continue;
    }

    let resolvedPath: string;
    try {
      resolvedPath = await realpath(candidate);
    } catch {
      continue;
    }

    if (isPathWithinRoot(resolvedPath, rootReal)) {
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
