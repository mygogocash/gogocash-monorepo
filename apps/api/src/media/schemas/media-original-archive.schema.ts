import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MediaOriginalArchiveDocument =
  HydratedDocument<MediaOriginalArchive>;

/**
 * Maps a served (optimized) R2 object to the ORIGINAL upload archived on Google
 * Drive. R2 keeps only the downsized WebP, so this is what makes an original
 * recoverable — e.g. to re-derive a larger variant after a width-cap change
 * (the #493 class of bug) without asking the admin to re-upload.
 *
 * Populated best-effort by StoredMediaService after every archivable (public,
 * image) upload; a missing row simply means the archive step was skipped or
 * failed, never that the served image is broken.
 */
@Schema({ timestamps: true, collection: 'media_original_archive' })
export class MediaOriginalArchive {
  /** R2 object key of the SERVED (optimized) image — the lookup key. */
  @Prop({ required: true, unique: true, index: true })
  object_key: string;

  /** Public R2 URL of the served image (stored on the owning document). */
  @Prop({ required: true })
  served_url: string;

  /** MediaFolder the image belongs to (brands, brand-banners, categories, …). */
  @Prop({ required: true })
  folder: string;

  /** Google Drive file id of the archived original. */
  @Prop({ required: true })
  drive_file_id: string;

  /** Public Drive URL of the archived original. */
  @Prop({ required: true })
  drive_url: string;

  /** MIME type of the original bytes. */
  @Prop()
  content_type?: string;

  /** sha256 of the original bytes, for integrity checks on recovery. */
  @Prop()
  sha256?: string;
}

export const MediaOriginalArchiveSchema =
  SchemaFactory.createForClass(MediaOriginalArchive);
