import { Module } from '@nestjs/common';

import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import { StoredMediaService } from './stored-media.service';
import { CdnCachePurgeService } from './cdn-cache-purge.service';

@Module({
  imports: [GoogleDriveModule],
  providers: [
    R2ObjectStorageService,
    ImageOptimizerService,
    StoredMediaService,
    CdnCachePurgeService,
  ],
  exports: [
    R2ObjectStorageService,
    ImageOptimizerService,
    StoredMediaService,
    CdnCachePurgeService,
  ],
})
export class MediaModule {}
