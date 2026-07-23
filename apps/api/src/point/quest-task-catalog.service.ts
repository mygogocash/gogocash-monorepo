import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { resolvePublicOfferLogo } from 'src/offer/offer-logo.util';
import { Offer } from 'src/offer/schemas/offer.schema';

import {
  QuestEconomicMutationPolicy,
  QuestMutationCapabilities,
} from './quest-economic-mutation-policy.service';
import {
  CanonicalQuestTask,
  canonicalizeStoredQuestTask,
  effectiveQuestRewardModel,
} from './quest-task.contract';
import {
  AdminQuestTaskCatalog,
  AdminQuestTaskCatalogTask,
  PublicQuestTaskCatalog,
  QUEST_TASK_CATALOG_CONTRACT_VERSION,
  QuestTaskCatalogOffer,
  QuestTaskCatalogTask,
  QuestTaskCatalogTaskSource,
} from './quest-task-catalog.contract';
import { Quest } from './schemas/quest.schema';
import { activeQuestFilter, isActiveQuestRecord } from './quest-active-filter';
import { QuestRevisionPreflightService } from './quest-revision-preflight.service';
import { questRevisionWorkflowReadiness } from './quest-revision-readiness';

const ACTIVE_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
};

const CATALOG_OFFER_SELECT =
  '_id offer_name offer_name_display logo logo_circle logo_mobile logo_desktop disabled status extra_point';
const LEGACY_CATALOG_TASK_LIMIT = 100;

type QuestRecord = Record<string, any>;
type OfferRecord = Record<string, any>;

type ResolvedTask = QuestTaskCatalogTask & {
  source: QuestTaskCatalogTaskSource;
};

type ResolvedCatalog = {
  quest: QuestRecord | null;
  catalog_source: PublicQuestTaskCatalog['catalog_source'];
  stored_task_count: number;
  tasks: ResolvedTask[];
};

function offerObjectId(task: Record<string, any>): string | null {
  const raw = task.offer?._id ?? task.offer;
  const value =
    raw instanceof Types.ObjectId ? raw.toHexString() : String(raw ?? '');
  return Types.ObjectId.isValid(value) ? value : null;
}

function offerName(offer: OfferRecord): string {
  return (
    String(offer.offer_name_display ?? '').trim() ||
    String(offer.offer_name ?? '').trim() ||
    'GoGoCash partner'
  );
}

function publicOffer(offer: OfferRecord): QuestTaskCatalogOffer {
  const id = String(offer._id);
  const logo = resolvePublicOfferLogo(offer);
  return {
    id,
    name: offerName(offer),
    ...(logo ? { logo_uri: logo } : {}),
    ...(Types.ObjectId.isValid(id) ? { href: `/shop/${id}` } : {}),
  };
}

function taskWording(
  task: Record<string, any>,
  defaults: { en: string; th: string },
) {
  return {
    wording_en:
      String(task.wording_en ?? '').trim() ||
      String(task.wording ?? '').trim() ||
      defaults.en,
    wording_th: String(task.wording_th ?? '').trim() || defaults.th,
  };
}

function invalidCatalogTask(): never {
  throw new InternalServerErrorException({
    code: 'QUEST_TASK_CATALOG_INVALID',
    message:
      'The active Quest contains an invalid task definition. Ask an administrator to repair the Quest configuration.',
  });
}

function legacyPointsThresholdTask(sortOrder: number): ResolvedTask {
  return {
    task_key: 'legacy:points-threshold:300',
    task_kind: 'points_threshold_bonus',
    points: 50,
    sort_order: sortOrder,
    wording_en: 'Reach 300 quest points',
    wording_th: 'สะสมคะแนนเควสต์ให้ครบ 300 คะแนน',
    target: {
      kind: 'quest_points_threshold',
      threshold_points: 300,
    },
    source: 'legacy_system_rule',
  };
}

function nextSortOrder(tasks: ResolvedTask[]): number {
  return (
    tasks.reduce(
      (highest, task) => Math.max(highest, Number(task.sort_order)),
      -1,
    ) + 1
  );
}

function decodeCanonicalCatalogTask(
  questId: string,
  task: Record<string, any>,
  rewardModel: unknown,
): CanonicalQuestTask {
  const normalized = canonicalizeStoredQuestTask(questId, task, rewardModel);
  const taskKey = String(normalized.task_key ?? '').trim();
  const points = Number(normalized.points);
  const sortOrder = Number(normalized.sort_order ?? 0);
  if (
    !taskKey ||
    taskKey.length > 128 ||
    !Number.isSafeInteger(points) ||
    points < 2 ||
    points > 10_000 ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0
  ) {
    return invalidCatalogTask();
  }

  const base = {
    task_key: taskKey,
    points,
    sort_order: sortOrder,
    enabled: normalized.enabled !== false,
    wording: String(normalized.wording ?? '').trim(),
    wording_en: String(
      normalized.wording_en ?? normalized.wording ?? '',
    ).trim(),
    wording_th: String(normalized.wording_th ?? '').trim(),
    notes: String(normalized.notes ?? '').trim(),
  };

  if (normalized.task_type === 'brand_purchase') {
    const offer = normalized.offer;
    const id = offerObjectId({ offer });
    const offerId = Number(normalized.offer_id);
    const merchantId = Number(normalized.merchant_id);
    const extraPoint = Number(normalized.extra_point ?? points);
    if (
      !id ||
      !Number.isSafeInteger(offerId) ||
      offerId < 1 ||
      !Number.isSafeInteger(merchantId) ||
      merchantId < 1 ||
      !Number.isSafeInteger(extraPoint) ||
      extraPoint !== points
    ) {
      return invalidCatalogTask();
    }
    return {
      ...base,
      task_type: 'brand_purchase',
      offer,
      offer_id: offerId,
      merchant_id: merchantId,
      extra_point: extraPoint,
    };
  }

  if (normalized.task_type === 'friend_referral') {
    if (
      normalized.completion_rule !== 'account_created' &&
      normalized.completion_rule !== 'first_earning_conversion'
    ) {
      return invalidCatalogTask();
    }
    return {
      ...base,
      task_type: 'friend_referral',
      completion_rule: normalized.completion_rule,
    };
  }

  const target = Number(normalized.target_thb_minor);
  if (
    normalized.spend_scope !== 'any_shop_via_ggc' ||
    !Number.isSafeInteger(target) ||
    target < 1
  ) {
    return invalidCatalogTask();
  }
  return {
    ...base,
    task_type: 'spend_target',
    spend_scope: normalized.spend_scope,
    target_thb_minor: target,
  };
}

@Injectable()
export class QuestTaskCatalogService {
  constructor(
    @InjectModel(Quest.name) private readonly questModel: Model<Quest>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    private readonly mutationPolicy: QuestEconomicMutationPolicy,
    private readonly revisionPreflight: QuestRevisionPreflightService,
  ) {}

  async getPublicCatalog(): Promise<PublicQuestTaskCatalog> {
    const resolved = await this.resolveActiveCatalog();
    return this.publicResponse(resolved);
  }

  async getAdminCatalog(id: string): Promise<AdminQuestTaskCatalog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid quest id', 400);
    }
    const quest = (await this.questModel
      .findById(new Types.ObjectId(id))
      .lean()) as QuestRecord | null;
    if (!quest) {
      throw new HttpException('Quest not found', 404);
    }

    const resolved = await this.resolveQuestCatalog(
      quest,
      isActiveQuestRecord(quest, new Date()),
    );
    const policyCapabilities = this.mutationPolicy.capabilities(quest);
    const staticRevisionWorkflow = questRevisionWorkflowReadiness(quest, {
      canCreateRevision: policyCapabilities.can_create_revision,
    });
    const shouldRunPublishPreflight =
      quest.publication_status === 'draft' &&
      staticRevisionWorkflow.workflow_enabled &&
      staticRevisionWorkflow.task_v2_enabled &&
      staticRevisionWorkflow.publish_ready;
    const publishPreflight = shouldRunPublishPreflight
      ? await this.revisionPreflight.evaluate(quest)
      : undefined;
    const revisionWorkflow = publishPreflight
      ? questRevisionWorkflowReadiness(quest, {
          canCreateRevision: policyCapabilities.can_create_revision,
          publishPreflight,
        })
      : staticRevisionWorkflow;
    const capabilities = {
      ...policyCapabilities,
      can_create_revision: revisionWorkflow.can_create_revision,
    };
    return {
      ...this.publicResponse(resolved),
      stored_task_count: resolved.stored_task_count,
      effective_task_count: resolved.tasks.length,
      capabilities,
      revision_workflow: revisionWorkflow,
      tasks: resolved.tasks.map((task) => this.adminTask(task, capabilities)),
    };
  }

  private async resolveActiveCatalog(): Promise<ResolvedCatalog> {
    const now = new Date();
    const quest = (await this.questModel
      .findOne(activeQuestFilter(now))
      .sort({ start_date: -1, _id: -1 })
      .lean()) as QuestRecord | null;
    if (!quest) {
      return {
        quest: null,
        catalog_source: 'none',
        stored_task_count: 0,
        tasks: [],
      };
    }
    return this.resolveQuestCatalog(quest, true);
  }

  private async resolveQuestCatalog(
    quest: QuestRecord,
    allowLegacyCompatibility: boolean,
  ): Promise<ResolvedCatalog> {
    const storedTasks = Array.isArray(quest.tasks) ? quest.tasks : [];
    if (storedTasks.length > 0) {
      const canonicalTasks = await this.resolveCanonicalTasks(
        quest,
        storedTasks,
      );
      const tasks =
        effectiveQuestRewardModel(quest.reward_model) === 'legacy_v1' &&
        allowLegacyCompatibility
          ? [
              ...canonicalTasks,
              legacyPointsThresholdTask(nextSortOrder(canonicalTasks)),
            ]
          : canonicalTasks;
      return {
        quest,
        catalog_source: 'canonical',
        stored_task_count: storedTasks.length,
        tasks,
      };
    }

    if (
      effectiveQuestRewardModel(quest.reward_model) === 'task_v2' ||
      !allowLegacyCompatibility
    ) {
      return {
        quest,
        catalog_source: 'none',
        stored_task_count: 0,
        tasks: [],
      };
    }

    return {
      quest,
      catalog_source: 'legacy_compatibility',
      stored_task_count: 0,
      tasks: await this.resolveLegacyCompatibilityTasks(),
    };
  }

  private async resolveCanonicalTasks(
    quest: QuestRecord,
    storedTasks: Record<string, any>[],
  ): Promise<ResolvedTask[]> {
    const enabled = storedTasks
      .filter((task) => task.enabled !== false)
      .map((task) => {
        return decodeCanonicalCatalogTask(
          String(quest._id),
          task,
          quest.reward_model,
        );
      })
      .sort(
        (left, right) =>
          Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0) ||
          String(left.task_key).localeCompare(String(right.task_key)),
      );
    const offerIds = enabled
      .filter((task) => task.task_type === 'brand_purchase')
      .map((task) => offerObjectId(task as unknown as Record<string, any>))
      .filter((id): id is string => Boolean(id))
      .map((id) => new Types.ObjectId(id));
    const offers =
      offerIds.length === 0
        ? []
        : ((await this.offerModel
            .find({ _id: { $in: offerIds }, ...ACTIVE_OFFER_FILTER } as any)
            .select(CATALOG_OFFER_SELECT)
            .lean()) as OfferRecord[]);
    const offersById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );

    return enabled.flatMap((task) => {
      const resolved = this.canonicalTask(task, offersById);
      return resolved ? [resolved] : [];
    });
  }

  private canonicalTask(
    task: CanonicalQuestTask,
    offersById: Map<string, OfferRecord>,
  ): ResolvedTask | null {
    const base = {
      task_key: task.task_key,
      task_kind: task.task_type,
      points: Number(task.points),
      sort_order: Number(task.sort_order ?? 0),
      source: 'quest_task' as const,
    };

    if (task.task_type === 'brand_purchase') {
      const id = offerObjectId(task as unknown as Record<string, any>);
      const offer = id ? offersById.get(id) : undefined;
      if (!offer) return null;
      const name = offerName(offer);
      return {
        ...base,
        ...taskWording(task, {
          en: `Make an order on ${name}`,
          th: `สั่งซื้อที่ ${name}`,
        }),
        target: { kind: 'purchase', required_purchases: 1 },
        offer: publicOffer(offer),
      };
    }

    if (task.task_type === 'friend_referral') {
      return {
        ...base,
        ...taskWording(task, {
          en: 'Invite an eligible friend',
          th: 'ชวนเพื่อนที่มีสิทธิ์เข้าร่วม',
        }),
        target: {
          kind: 'referral',
          completion_rule: task.completion_rule,
        },
      };
    }

    return {
      ...base,
      ...taskWording(task, {
        en: 'Reach the eligible spend target',
        th: 'ใช้จ่ายให้ถึงยอดที่กำหนด',
      }),
      target: {
        kind: 'spend_thb_minor',
        spend_scope: task.spend_scope,
        target_thb_minor: Number(task.target_thb_minor),
      },
    };
  }

  private async resolveLegacyCompatibilityTasks(): Promise<ResolvedTask[]> {
    const offers = (await this.offerModel
      .find({ extra_point: { $gt: 1 }, ...ACTIVE_OFFER_FILTER } as any)
      .select(CATALOG_OFFER_SELECT)
      .sort({ extra_point: -1, offer_name: 1, _id: 1 })
      .limit(LEGACY_CATALOG_TASK_LIMIT)
      .lean()) as OfferRecord[];
    const brandTasks: ResolvedTask[] = offers.map((offer, index) => {
      const id = String(offer._id);
      const name = offerName(offer);
      return {
        task_key: `legacy:offer:${id}`,
        task_kind: 'brand_purchase',
        points: Number(offer.extra_point),
        sort_order: index,
        wording_en: `Make an order on ${name}`,
        wording_th: `สั่งซื้อที่ ${name}`,
        target: { kind: 'purchase', required_purchases: 1 },
        offer: publicOffer(offer),
        source: 'legacy_offer_fallback',
      };
    });

    return [
      ...brandTasks,
      legacyPointsThresholdTask(nextSortOrder(brandTasks)),
    ];
  }

  private publicResponse(resolved: ResolvedCatalog): PublicQuestTaskCatalog {
    return {
      contract_version: QUEST_TASK_CATALOG_CONTRACT_VERSION,
      quest_id: resolved.quest ? String(resolved.quest._id) : null,
      config_revision: resolved.quest
        ? Number(resolved.quest.config_revision ?? 0)
        : null,
      catalog_source: resolved.catalog_source,
      tasks: resolved.tasks.map(({ source: _source, ...task }) => task),
    };
  }

  private adminTask(
    task: ResolvedTask,
    capabilities: QuestMutationCapabilities,
  ): AdminQuestTaskCatalogTask {
    const editableFields =
      task.source !== 'quest_task'
        ? []
        : [
            ...(capabilities.can_edit_task_economics
              ? ['offer', 'points', 'sort_order', 'enabled', 'target']
              : []),
            ...(capabilities.can_edit_presentation
              ? ['wording_en', 'wording_th', 'notes']
              : []),
          ];
    return {
      ...task,
      editable_fields: editableFields,
    };
  }
}
