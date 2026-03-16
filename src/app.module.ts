import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import envConfig from './config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { OfferModule } from './offer/offer.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { PointModule } from './point/point.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from './analytics/analytics.module';
import { InvolveModule } from './involve/involve.module';
import { TasksModule } from './tasks/tasks.module';
@Module({
  imports: [
    // ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      load: [envConfig],
    }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    AuthModule,
    UserModule,
    AdminModule,
    OfferModule,
    WithdrawModule,
    GoogleDriveModule,
    PointModule,
    TelegramBotModule,
    InvolveModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
