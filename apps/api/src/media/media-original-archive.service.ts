import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';

import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';

import { isPrivateMediaFolder, MediaFolder } from './media-folders.config';
import {
  MediaOriginalArchive,
  MediaOriginalArchiveDocument,
} from './schemas/media-original-archive.schema';

/** A public, image upload is eligible to be archived to Drive. */
export function isArchivableUpload(
  file: Pick<Express.Multer.File, 'mimetype'> | undefined,
  folder: MediaFolder,
): boolean {
  // Private evidence (withdraw slips, missing-order docs) must NEVER be copied
  // to Google Drive — they are user financial records, not brand assets.
  if (isPrivateMediaFolder(folder)) return false;
  return Boolean(file?.mimetype?.startsWith('image/'));
}

@Injectable()
export class MediaOriginalArchiveService {
  private readonly logger = new Logger(MediaOriginalArchiveService.name);

  constructor(
    private readonly googleDrive: GoogleDriveService,
    @InjectModel(MediaOriginalArchive.name)
    private readonly archiveModel: Model<MediaOriginalArchiveDocument>,
  ) {}

  /**
   * Best-effort: archive the ORIGINAL upload to Google Drive and record the
   * mapping keyed by the served R2 object key. NEVER throws — a Drive outage,
   * missing config, or non-image must not break the R2 upload that already
   * succeeded (R2 is the critical path). Skips private evidence folders.
   */
  async archiveOriginal(input: {
    original: Express.Multer.File;
    folder: MediaFolder;
    objectKey: string;
    servedUrl: string;
  }): Promise<void> {
    const { original, folder, objectKey, servedUrl } = input;
    if (!isArchivableUpload(original, folder)) return;

    try {
      const buffer = await readMulterUploadBuffer(original);
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      const uploaded = await this.googleDrive.uploadFile(original);
      if (!uploaded?.id) {
        this.logger.warn(
          `Original archive: Drive returned no file id for ${objectKey}`,
        );
        return;
      }
      await this.archiveModel.updateOne(
        { object_key: objectKey },
        {
          $set: {
            object_key: objectKey,
            served_url: servedUrl,
            folder,
            drive_file_id: uploaded.id,
            drive_url:
              uploaded.publicUrl ??
              `https://drive.google.com/file/d/${uploaded.id}/view`,
            content_type: original.mimetype,
            sha256,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Best-effort by design: log and move on. The served image is fine; only
      // the recoverable-original guarantee is missing for this asset.
      this.logger.warn(
        `Original archive skipped for ${objectKey}: ${message}`,
      );
    }
  }
}
