import type { QuestMutationCapabilities } from './quest-economic-mutation-policy.service';
import type { QuestRevisionWorkflowReadiness } from './quest-revision-readiness';

export const QUEST_TASK_CATALOG_CONTRACT_VERSION = 1 as const;

export type QuestTaskCatalogSource =
  'canonical' | 'legacy_compatibility' | 'none';

export type QuestTaskCatalogTaskKind =
  | 'brand_purchase'
  | 'friend_referral'
  | 'spend_target'
  | 'points_threshold_bonus';

export type QuestTaskCatalogTaskSource =
  'quest_task' | 'legacy_offer_fallback' | 'legacy_system_rule';

export type QuestTaskCatalogOffer = {
  id: string;
  name: string;
  logo_uri?: string;
  href?: string;
};

export type QuestTaskCatalogTarget =
  | { kind: 'purchase'; required_purchases: 1 }
  | {
      kind: 'referral';
      completion_rule: 'account_created' | 'first_earning_conversion';
    }
  | {
      kind: 'spend_thb_minor';
      spend_scope: 'any_shop_via_ggc';
      target_thb_minor: number;
    }
  | { kind: 'quest_points_threshold'; threshold_points: number };

export type QuestTaskCatalogTask = {
  task_key: string;
  task_kind: QuestTaskCatalogTaskKind;
  points: number;
  sort_order: number;
  wording_en: string;
  wording_th: string;
  target?: QuestTaskCatalogTarget;
  offer?: QuestTaskCatalogOffer;
};

export type PublicQuestTaskCatalog = {
  contract_version: typeof QUEST_TASK_CATALOG_CONTRACT_VERSION;
  quest_id: string | null;
  config_revision: number | null;
  catalog_source: QuestTaskCatalogSource;
  tasks: QuestTaskCatalogTask[];
};

export type AdminQuestTaskCatalogTask = QuestTaskCatalogTask & {
  source: QuestTaskCatalogTaskSource;
  editable_fields: string[];
};

export type AdminQuestTaskCatalog = Omit<PublicQuestTaskCatalog, 'tasks'> & {
  stored_task_count: number;
  effective_task_count: number;
  capabilities: QuestMutationCapabilities;
  revision_workflow: QuestRevisionWorkflowReadiness;
  tasks: AdminQuestTaskCatalogTask[];
};
