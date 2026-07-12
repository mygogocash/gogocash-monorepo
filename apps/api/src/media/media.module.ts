import { Module } from '@nestjs/common';

import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import { StoredMediaService } from './stored-media.service';

@Module({
  imports: [GoogleDriveModule],
  providers: [
    R2ObjectStorageService,
    ImageOptimizerService,
    StoredMediaService,
  ],
  exports: [R2ObjectStorageService, ImageOptimizerService, StoredMediaService],
})
export class MediaModule {}
