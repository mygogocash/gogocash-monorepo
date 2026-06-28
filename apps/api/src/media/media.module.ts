import { Module } from '@nestjs/common';

import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { GcsObjectStorageService } from './gcs-object-storage.service';
import { StoredMediaService } from './stored-media.service';

@Module({
  imports: [GoogleDriveModule],
  providers: [GcsObjectStorageService, StoredMediaService],
  exports: [GcsObjectStorageService, StoredMediaService],
})
export class MediaModule {}
