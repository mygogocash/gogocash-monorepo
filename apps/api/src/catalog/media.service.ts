import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

import { normalizeSlugSegment } from 'src/common/mongo-query';
import { buildR2PublicUrl } from 'src/media/stored-media.util';

import { CreateMediaUploadDto } from './dto/catalog.dto';

@Injectable()
export class CatalogMediaService {
  private readonly logger = new Logger(CatalogMediaService.name);

  createSignedUpload(dto: CreateMediaUploadDto) {
    const safeName = normalizeSlugSegment(dto.filename, 120);
    if (!safeName) {
      throw new BadRequestException('Invalid media filename');
    }

    const bucket = process.env.R2_BUCKET?.trim();
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
    if (!bucket || !publicBaseUrl) {
      const missing = [
        ['R2_BUCKET', bucket],
        ['R2_PUBLIC_BASE_URL', publicBaseUrl],
      ]
        .filter(([, value]) => !value)
        .map(([name]) => name);
      this.logger.error(
        `Catalog media uploads are not configured (missing: ${missing.join(', ')}).`,
      );
      throw new BadRequestException(
        'Media uploads are temporarily unavailable. Please try again later or contact an administrator.',
      );
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const key = `catalog/${dto.folder}/${Date.now()}-${safeName}`;
    const signature = this.signUpload(
      key,
      dto.content_type,
      dto.size_bytes,
      expiresAt,
    );

    return {
      bucket,
      key,
      method: 'PUT',
      upload_url: `${buildR2PublicUrl(publicBaseUrl, key)}?signature=${signature}`,
      public_url: buildR2PublicUrl(publicBaseUrl, key),
      headers: {
        'content-type': dto.content_type,
      },
      expires_at: expiresAt.toISOString(),
    };
  }

  private signUpload(
    key: string,
    contentType: string,
    sizeBytes: number,
    expiresAt: Date,
  ): string {
    const secret =
      process.env.MEDIA_UPLOAD_SIGNING_SECRET?.trim() ||
      process.env.GCS_CATALOG_UPLOAD_SIGNING_SECRET?.trim() ||
      process.env.JWT_SECRET ||
      'local-catalog-media';
    return createHmac('sha256', secret)
      .update(`${key}:${contentType}:${sizeBytes}:${expiresAt.toISOString()}`)
      .digest('hex');
  }
}
