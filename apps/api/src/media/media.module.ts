import { Module } from '@nestjs/common';

import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { StoredMediaService } from './stored-media.service';

@Module({
  imports: [GoogleDriveModule],
  providers: [R2ObjectStorageService, StoredMediaService],
  exports: [R2ObjectStorageService, StoredMediaService],
})
export class MediaModule {}
