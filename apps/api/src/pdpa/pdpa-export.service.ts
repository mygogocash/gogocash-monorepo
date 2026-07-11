import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { EmailService } from 'src/email/email.service';
import { R2ObjectStorageService } from 'src/media/r2-object-storage.service';
import {
  DataExportRequest,
  type DataExportDelivery,
} from './schemas/data-export-request.schema';
import { PdpaGatherService, type PdpaDataBundle } from './pdpa-gather.service';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

export type PdpaDataExportResult = {
  requestId: string;
  status: 'sent' | 'failed';
  delivery: DataExportDelivery;
};

@Injectable()
export class PdpaExportService {
  constructor(
    @InjectModel(DataExportRequest.name)
    private readonly requestModel: Model<DataExportRequest>,
    private readonly gatherService: PdpaGatherService,
    private readonly emailService: EmailService,
    private readonly r2: R2ObjectStorageService,
  ) {}

  async requestDataExport(
    userId: string,
    locale: 'en' | 'th' = 'en',
  ): Promise<PdpaDataExportResult> {
    await this.assertRateLimit(userId);

    const bundle = await this.gatherService.gatherForUser(userId);
    const email =
      typeof bundle.profile.email === 'string'
        ? bundle.profile.email.trim()
        : '';
    if (!email) {
      throw new BadRequestException(
        'A profile email is required to deliver your data export. Add an email to your account and try again.',
      );
    }

    const zipBuffer = await this.buildZipArchive(bundle, locale);
    const sizeBytes = zipBuffer.length;

    let delivery: DataExportDelivery;
    try {
      if (sizeBytes <= MAX_ATTACHMENT_BYTES) {
        delivery = 'attachment';
        await this.emailService.sendEmail({
          to: email,
          subject: this.subjectFor(locale),
          html: this.attachmentHtml(locale),
          text: this.attachmentText(locale),
          attachments: [
            {
              filename: 'gogocash-data-export.zip',
              content: zipBuffer,
              contentType: 'application/zip',
            },
          ],
        });
      } else {
        delivery = 'link';
        const objectKey = `pdpa-exports/${userId}/${Date.now()}-gogocash-data-export.zip`;
        await this.r2.uploadBuffer(objectKey, zipBuffer, 'application/zip');
        const downloadUrl = await this.r2.getSignedDownloadUrl(
          objectKey,
          SIGNED_URL_TTL_SECONDS,
        );
        await this.emailService.sendEmail({
          to: email,
          subject: this.subjectFor(locale),
          html: this.linkHtml(locale, downloadUrl),
          text: this.linkText(locale, downloadUrl),
        });
      }
    } catch (error) {
      await this.requestModel.create({
        userId: new Types.ObjectId(userId),
        requestedAt: new Date(),
        status: 'failed',
        sizeBytes,
      });
      throw error;
    }

    const audit = await this.requestModel.create({
      userId: new Types.ObjectId(userId),
      requestedAt: new Date(),
      delivery,
      status: 'sent',
      sizeBytes,
    });

    return {
      requestId: String(audit._id),
      status: 'sent',
      delivery,
    };
  }

  private async assertRateLimit(userId: string): Promise<void> {
    const since = new Date(Date.now() - RATE_LIMIT_MS);
    const recent = await this.requestModel
      .findOne({
        userId: new Types.ObjectId(userId),
        requestedAt: { $gte: since },
        status: 'sent',
      })
      .sort({ requestedAt: -1 })
      .lean();
    if (recent) {
      throw new HttpException(
        'You already requested a data export in the last 24 hours. Please try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Public for unit tests that assert zip entry names. */
  async buildZipArchive(
    bundle: PdpaDataBundle,
    locale: 'en' | 'th',
  ): Promise<Buffer> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const pass = new PassThrough();
    const chunks: Buffer[] = [];
    pass.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      pass.on('end', () => resolve(Buffer.concat(chunks)));
      pass.on('error', reject);
      archive.on('error', reject);
    });

    archive.pipe(pass);
    archive.append(JSON.stringify(bundle, null, 2), { name: 'data.json' });
    archive.append(this.summaryHtml(bundle, locale), { name: 'summary.html' });
    await archive.finalize();
    return done;
  }

  private subjectFor(locale: 'en' | 'th'): string {
    return locale === 'th'
      ? 'การส่งออกข้อมูล GoGoCash ของคุณ'
      : 'Your GoGoCash data export';
  }

  private attachmentHtml(locale: 'en' | 'th'): string {
    return locale === 'th'
      ? '<p>ไฟล์ ZIP การส่งออกข้อมูลของคุณแนบมากับอีเมลนี้</p><p>GoGoCash</p>'
      : '<p>Your data export ZIP is attached to this email.</p><p>GoGoCash</p>';
  }

  private attachmentText(locale: 'en' | 'th'): string {
    return locale === 'th'
      ? 'ไฟล์ ZIP การส่งออกข้อมูลของคุณแนบมากับอีเมลนี้'
      : 'Your data export ZIP is attached to this email.';
  }

  private linkHtml(locale: 'en' | 'th', url: string): string {
    return locale === 'th'
      ? `<p>ไฟล์ส่งออกมีขนาดใหญ่เกินไปที่จะแนบ — ดาวน์โหลดได้ที่นี่ (ลิงก์หมดอายุใน 24 ชั่วโมง):</p><p><a href="${url}">${url}</a></p><p>GoGoCash</p>`
      : `<p>Your export is too large to attach. Download it here (link expires in 24 hours):</p><p><a href="${url}">${url}</a></p><p>GoGoCash</p>`;
  }

  private linkText(locale: 'en' | 'th', url: string): string {
    return locale === 'th'
      ? `ดาวน์โหลดการส่งออกข้อมูลของคุณ (หมดอายุใน 24 ชั่วโมง): ${url}`
      : `Download your data export (expires in 24 hours): ${url}`;
  }

  private summaryHtml(bundle: PdpaDataBundle, locale: 'en' | 'th'): string {
    const title =
      locale === 'th'
        ? 'สรุปการส่งออกข้อมูล GoGoCash'
        : 'GoGoCash data export summary';
    const counts = [
      ['myCashbacks', bundle.myCashbacks.length],
      ['withdrawMethods', bundle.withdrawMethods.length],
      ['withdrawals', bundle.withdrawals.length],
      ['favoriteOffers', bundle.favoriteOffers.length],
      ['missionOrders', bundle.missionOrders.length],
      ['points', bundle.points.length],
      ['socialRewards', bundle.socialRewards.length],
      ['deeplinks', bundle.deeplinks.length],
    ] as const;
    const rows = counts.map(([k, n]) => `<li>${k}: ${n}</li>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><ul>${rows}</ul><p>Full records are in data.json.</p></body></html>`;
  }
}
