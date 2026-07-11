import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import envConfig from './config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { OfferModule } from './offer/offer.module';
import { BrandModule } from './brand/brand.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { PointModule } from './point/point.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from './analytics/analytics.module';
import { PolicyModule } from './policy/policy.module';
import { GototrackModule } from './gototrack/gototrack.module';
import { CustomerBillingModule } from './customer-billing/customer-billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { InvolveModule } from './involve/involve.module';
import { TasksModule } from './tasks/tasks.module';
import { PdpaModule } from './pdpa/pdpa.module';
@Module({
  imports: [
    // ScheduleModule stays the in-process scheduler (staging); feature/bug-old's
    // TasksController exposes the same jobs over HTTP as admin break-glass only
    // (hardened behind AuthAdminGuard — see tasks.controller).
    ScheduleModule.forRoot(),
    AnalyticsModule,
    PolicyModule,
    GototrackModule,
    CustomerBillingModule,
    CatalogModule,
    PdpaModule,
    ConfigModule.forRoot({
      load: [envConfig],
    }),
    MongooseModule.forRoot(process.env.MONGO_URI!, {
      // Cloud Run must bind PORT before the startup probe times out; do not block
      // bootstrap on the first Mongo handshake (connect continues in background).
      lazyConnection: true,
    }),
    AuthModule,
    AdminModule,
    UserModule,
    OfferModule,
    BrandModule,
    WithdrawModule,
    GoogleDriveModule,
    PointModule,
    ...(process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_BOT_TOKEN !== 'PLACEHOLDER'
      ? [TelegramBotModule]
      : []),
    InvolveModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
