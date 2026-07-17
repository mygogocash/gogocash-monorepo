import { Injectable } from '@nestjs/common';

export type QuestEngineFailureStage =
  | 'after_base_referral_reconciliation'
  | 'after_ingestion_claim'
  | 'after_high_water'
  | 'after_contribution'
  | 'after_progress'
  | 'after_award'
  | 'after_outcome_update';

@Injectable()
export class QuestEngineFailureInjectionHook {
  async afterStage(_stage: QuestEngineFailureStage): Promise<void> {
    // Production no-op. Tests replace this provider with a one-shot crash hook.
  }
}
