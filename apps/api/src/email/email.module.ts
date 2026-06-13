import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { resendClientProvider } from './resend.provider';

@Module({
  imports: [ConfigModule],
  providers: [resendClientProvider, EmailService],
  exports: [EmailService], // Export so other modules can use it
})
export class EmailModule {}
