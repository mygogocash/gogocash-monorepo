import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerIoController } from './customer-io.controller';
import { CustomerIoService } from './customer-io.service';
import {
  EmailSuppression,
  EmailSuppressionSchema,
} from './email-suppression/email-suppression.schema';
import { EmailSuppressionService } from './email-suppression/email-suppression.service';

/**
 * Marked @Global so any module can inject CustomerIoService without a
 * dedicated import. Mirrors the convention used for AnalyticsService.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailSuppression.name, schema: EmailSuppressionSchema },
    ]),
  ],
  controllers: [CustomerIoController],
  providers: [CustomerIoService, EmailSuppressionService],
  exports: [CustomerIoService, EmailSuppressionService],
})
export class CustomerIoModule {}
