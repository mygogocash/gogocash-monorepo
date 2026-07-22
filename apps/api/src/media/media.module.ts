import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GoogleDriveModule } from 'src/google-drive/google-drive.module';

import { R2ObjectStorageService } from './r2-object-storage.service';
import { ImageOptimizerService } from './image-optimizer.service';
import { StoredMediaService } from './stored-media.service';
import { CdnCachePurgeService } from './cdn-cache-purge.service';
import { MediaOriginalArchiveService } from './media-original-archive.service';
import {
  MediaOriginalArchive,
  MediaOriginalArchiveSchema,
} from './schemas/media-original-archive.schema';

@Module({
  imports: [
    GoogleDriveModule,
    MongooseModule.forFeature([
      { name: MediaOriginalArchive.name, schema: MediaOriginalArchiveSchema },
    ]),
  ],
  providers: [
    R2ObjectStorageService,
    ImageOptimizerService,
    StoredMediaService,
    CdnCachePurgeService,
    MediaOriginalArchiveService,
  ],
  exports: [
    R2ObjectStorageService,
    ImageOptimizerService,
    StoredMediaService,
    CdnCachePurgeService,
    MediaOriginalArchiveService,
  ],
})
export class MediaModule {}
