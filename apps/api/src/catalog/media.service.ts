import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

import { CreateMediaUploadDto } from './dto/catalog.dto';

@Injectable()
export class CatalogMediaService {
  createSignedUpload(dto: CreateMediaUploadDto) {
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!safeName) {
      throw new BadRequestException('Invalid media filename');
    }

    const bucket = process.env.GCS_CATALOG_BUCKET || 'gogocash-catalog-staging';
    const publicBaseUrl = process.env.GCS_CATALOG_PUBLIC_BASE_URL || `https://storage.googleapis.com/${bucket}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const key = `catalog/${dto.folder}/${Date.now()}-${safeName}`;
    const signature = this.signUpload(key, dto.content_type, dto.size_bytes, expiresAt);

    return {
      bucket,
      key,
      method: 'PUT',
      upload_url: `${publicBaseUrl}/${key}?signature=${signature}`,
      public_url: `${publicBaseUrl}/${key}`,
      headers: {
        'content-type': dto.content_type,
        'x-goog-content-length-range': `1,${dto.size_bytes}`,
      },
      expires_at: expiresAt.toISOString(),
    };
  }

  private signUpload(key: string, contentType: string, sizeBytes: number, expiresAt: Date): string {
    const secret = process.env.GCS_CATALOG_UPLOAD_SIGNING_SECRET || process.env.JWT_SECRET || 'local-catalog-media';
    return createHmac('sha256', secret).update(`${key}:${contentType}:${sizeBytes}:${expiresAt.toISOString()}`).digest('hex');
  }
}
