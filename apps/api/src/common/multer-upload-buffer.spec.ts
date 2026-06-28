import { mkdtemp, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import {
  readMulterUploadBuffer,
  resolveSafeMulterDiskPath,
} from './multer-upload-buffer';

describe('resolveSafeMulterDiskPath', () => {
  it('resolveSafeMulterDiskPath > given a path under the OS temp dir > then returns the real path', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'gogocash-upload-'));
    const filePath = join(tempDir, 'upload.bin');
    await writeFile(filePath, 'ok');

    const safePath = await resolveSafeMulterDiskPath(filePath);

    expect(safePath).toBe(await realpath(filePath));
    await rm(tempDir, { recursive: true, force: true });
  });

  it('resolveSafeMulterDiskPath > given a path outside allowed roots > then throws', async () => {
    await expect(resolveSafeMulterDiskPath('/etc/passwd')).rejects.toThrow(
      'Invalid upload file path',
    );
  });

  it('resolveSafeMulterDiskPath > given a traversal path outside temp > then throws', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'gogocash-upload-'));
    const escapePath = resolve(tempDir, '..', '..', 'etc', 'passwd');

    await expect(resolveSafeMulterDiskPath(escapePath)).rejects.toThrow(
      'Invalid upload file path',
    );
    await rm(tempDir, { recursive: true, force: true });
  });
});

describe('readMulterUploadBuffer', () => {
  it('readMulterUploadBuffer > given an in-memory buffer > then returns it', async () => {
    const buffer = Buffer.from('in-memory');

    await expect(
      readMulterUploadBuffer({
        buffer,
      } as Express.Multer.File),
    ).resolves.toEqual(buffer);
  });

  it('readMulterUploadBuffer > given a safe disk path > then reads the file', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'gogocash-upload-'));
    const filePath = join(tempDir, 'upload.bin');
    await writeFile(filePath, 'disk-bytes');

    await expect(
      readMulterUploadBuffer({
        path: filePath,
      } as Express.Multer.File),
    ).resolves.toEqual(Buffer.from('disk-bytes'));

    await rm(tempDir, { recursive: true, force: true });
  });

  it('readMulterUploadBuffer > given an unsafe disk path > then throws', async () => {
    await expect(
      readMulterUploadBuffer({
        path: '/etc/passwd',
      } as Express.Multer.File),
    ).rejects.toThrow('Invalid upload file path');
  });
});
