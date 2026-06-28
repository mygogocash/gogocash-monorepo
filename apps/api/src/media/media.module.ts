import { Module } from '@nestjs/common';

import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { GcsObjectStorageService } from './gcs-object-storage.service';
import { R2ObjectStorageService } from './r2-object-storage.service';
import { StoredMediaService } from './stored-media.service';

@Module({
  imports: [GoogleDriveModule],
  providers: [
    GcsObjectStorageService,
    R2ObjectStorageService,
    StoredMediaService,
  ],
  exports: [
    GcsObjectStorageService,
    R2ObjectStorageService,
    StoredMediaService,
  ],
})
export class MediaModule {}
