import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { QUEST_TASK_STATE_INSPECTOR } from 'src/point/quest-task.contract';
import { Point, PointSchema } from 'src/point/schemas/point.schema';
import { Quest, QuestSchema } from 'src/point/schemas/quest.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import {
  Membership,
  MembershipSchema,
} from 'src/admin/membership/schemas/membership.schema';
import {
  Conversion,
  ConversionSchema,
} from 'src/withdraw/schemas/conversion.schema';

import { AccountRegistrationService } from './account-registration.service';
import { QuestConversionLifecycleService } from './conversion-lifecycle.service';
import {
  DefaultQuestFxRateProvider,
  QUEST_FX_RATE_PROVIDER,
} from './quest-fx-rate.provider';
import { QuestEngineFailureInjectionHook } from './quest-engine-failure-injection.hook';
import { QuestOutboxConsumerService } from './quest-outbox-consumer.service';
import { QuestReconciliationService } from './quest-reconciliation.service';
import { QuestRevisionFenceService } from './quest-revision-fence.service';
import { QuestTaskProgressController } from './quest-task-progress.controller';
import { QuestTaskProgressService } from './quest-task-progress.service';
import { QuestTaskStateInspectorService } from './quest-task-state-inspector.service';
import { QuestTaskTransactionService } from './quest-task-transaction.service';
import {
  QuestAccountTransition,
  QuestAccountTransitionSchema,
} from './schemas/quest-account-transition.schema';
import {
  QuestContribution,
  QuestContributionSchema,
} from './schemas/quest-contribution.schema';
import {
  QuestConversionQuarantine,
  QuestConversionQuarantineSchema,
} from './schemas/quest-conversion-quarantine.schema';
import {
  QuestConversionState,
  QuestConversionStateSchema,
} from './schemas/quest-conversion-state.schema';
import {
  QuestConversionTransition,
  QuestConversionTransitionSchema,
} from './schemas/quest-conversion-transition.schema';
import {
  QuestEventIngestion,
  QuestEventIngestionSchema,
} from './schemas/quest-event-ingestion.schema';
import { QuestOutbox, QuestOutboxSchema } from './schemas/quest-outbox.schema';
import {
  QuestTaskProgress,
  QuestTaskProgressSchema,
} from './schemas/quest-task-progress.schema';
import {
  QuestSourceConfigFence,
  QuestSourceConfigFenceSchema,
} from './schemas/quest-source-config-fence.schema';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Point.name, schema: PointSchema },
      { name: Quest.name, schema: QuestSchema },
      { name: Conversion.name, schema: ConversionSchema },
      {
        name: QuestAccountTransition.name,
        schema: QuestAccountTransitionSchema,
      },
      {
        name: QuestConversionTransition.name,
        schema: QuestConversionTransitionSchema,
      },
      {
        name: QuestConversionQuarantine.name,
        schema: QuestConversionQuarantineSchema,
      },
      { name: QuestOutbox.name, schema: QuestOutboxSchema },
      { name: QuestEventIngestion.name, schema: QuestEventIngestionSchema },
      { name: QuestTaskProgress.name, schema: QuestTaskProgressSchema },
      { name: QuestContribution.name, schema: QuestContributionSchema },
      { name: QuestConversionState.name, schema: QuestConversionStateSchema },
      {
        name: QuestSourceConfigFence.name,
        schema: QuestSourceConfigFenceSchema,
      },
    ]),
  ],
  controllers: [QuestTaskProgressController],
  providers: [
    QuestTaskTransactionService,
    FirebaseAuthGuard,
    QuestRevisionFenceService,
    AccountRegistrationService,
    QuestConversionLifecycleService,
    QuestEngineFailureInjectionHook,
    DefaultQuestFxRateProvider,
    {
      provide: QUEST_FX_RATE_PROVIDER,
      useExisting: DefaultQuestFxRateProvider,
    },
    QuestTaskProgressService,
    QuestOutboxConsumerService,
    QuestReconciliationService,
    QuestTaskStateInspectorService,
    {
      provide: QUEST_TASK_STATE_INSPECTOR,
      useExisting: QuestTaskStateInspectorService,
    },
  ],
  exports: [
    QuestTaskTransactionService,
    QuestRevisionFenceService,
    AccountRegistrationService,
    QuestConversionLifecycleService,
    QuestTaskProgressService,
    QuestOutboxConsumerService,
    QuestReconciliationService,
    QuestTaskStateInspectorService,
    QUEST_TASK_STATE_INSPECTOR,
  ],
})
export class QuestTaskEngineModule {}
