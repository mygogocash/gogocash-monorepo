import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model, Types } from 'mongoose';

import { mongoEq } from 'src/common/mongo-query';
import { Offer } from 'src/offer/schemas/offer.schema';

import {
  CreateQuestRevisionDto,
  PublishQuestRevisionDto,
} from './dto/create-quest.dto';
import {
  canonicalizeStoredQuestTask,
  effectiveQuestRewardModel,
  newQuestTaskKey,
  QUEST_CONFIG_REVISION_CONFLICT,
} from './quest-task.contract';
import { QuestTaskCatalogService } from './quest-task-catalog.service';
import { sanitizeAdminQuestRecord } from './quest-admin-record';
import {
  QUEST_REVISION_DECISION_REQUIRED,
  QUEST_REVISION_MEDIA_REQUIRED,
  QUEST_REVISION_OFFERS_UNAVAILABLE,
  QUEST_REVISION_PUBLISH_NOT_READY,
  QUEST_REVISION_REWARDS_INVALID,
  QUEST_REVISION_REWARDS_REQUIRED,
  QUEST_REVISION_SOURCE_STALE,
  QUEST_REVISION_TASKS_INVALID,
  QUEST_REVISION_TASKS_REQUIRED,
  QUEST_REVISION_WINDOW_INVALID,
  QUEST_REVISION_WINDOW_OVERLAP,
  QUEST_REVISION_WORKFLOW_DISABLED,
  QUEST_TASK_V2_UNAVAILABLE,
  isQuestRevisionWorkflowEnabled,
  questRevisionContentBlockers,
  questRevisionWorkflowReadiness,
} from './quest-revision-readiness';
import { QuestRevisionPreflightService } from './quest-revision-preflight.service';
import { Quest } from './schemas/quest.schema';

const LEGACY_POINTS_THRESHOLD_DECISION = 'legacy_points_threshold_semantics';
export const SOURCE_OFFER_REMEDIATION_WARNING =
  'SOURCE_OFFER_REMEDIATION_REQUIRED';

const ACTIVE_APPROVED_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
} as const;

type QuestRecord = Record<string, any>;

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function deterministicRevisionId(sourceId: string, requestKey: string) {
  return new Types.ObjectId(
    createHash('sha256')
      .update(`quest-revision:${sourceId}:${requestKey}`)
      .digest('hex')
      .slice(0, 24),
  );
}

function workflowEnabled() {
  return isQuestRevisionWorkflowEnabled();
}

function taskV2Enabled() {
  return process.env.QUEST_TASK_V2_ENABLED?.trim().toLowerCase() === 'true';
}

function taskOfferId(task: Record<string, any>): Types.ObjectId | null {
  const value =
    task.offer && typeof task.offer === 'object' && '_id' in task.offer
      ? task.offer._id
      : task.offer;
  const normalized =
    value instanceof Types.ObjectId ? value.toHexString() : String(value ?? '');
  return Types.ObjectId.isValid(normalized)
    ? new Types.ObjectId(normalized)
    : null;
}

function positiveProviderId(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

@Injectable()
export class QuestRevisionService {
  constructor(
    @InjectModel(Quest.name) private readonly questModel: Model<Quest>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    private readonly catalog: QuestTaskCatalogService,
    private readonly revisionPreflight: QuestRevisionPreflightService,
  ) {}

  async createRevision(
    sourceId: string,
    input: CreateQuestRevisionDto,
    actorId: string,
  ) {
    this.assertEnabled();
    this.assertActor(actorId);
    if (!Types.ObjectId.isValid(sourceId)) {
      throw new BadRequestException('Invalid quest id');
    }
    const normalizedSourceId = new Types.ObjectId(sourceId).toHexString();
    const requestKey = input.request_key.trim();
    const payloadHash = sha256({
      source_id: normalizedSourceId,
      request_key: requestKey,
      expected_campaign_revision: input.expected_campaign_revision,
      expected_config_revision: input.expected_config_revision,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date.toISOString(),
      reason: input.reason.trim(),
    });
    const draftId = deterministicRevisionId(normalizedSourceId, requestKey);
    const replay = (await this.questModel
      .findById(draftId)
      .lean()) as QuestRecord | null;
    if (replay) {
      if (replay.revision_payload_hash !== payloadHash) {
        throw new ConflictException(
          'request_key was already used for a different quest revision',
        );
      }
      return this.revisionResponse(replay);
    }

    const source = (await this.questModel
      .findById(new Types.ObjectId(normalizedSourceId))
      .lean()) as QuestRecord | null;
    if (!source) throw new HttpException('Quest not found', 404);
    if (source.publication_status === 'draft') {
      throw new BadRequestException(
        'Create a revision from a published or legacy quest, not a draft.',
      );
    }
    this.assertExpectedRevisions(source, input);
    this.assertFutureWindow(input.start_date, input.end_date);
    await this.assertNoPublishedOverlap(
      input.start_date,
      input.end_date,
      draftId,
    );

    const tasks = await this.cloneTasks(normalizedSourceId, source);
    const blockedDecisions =
      effectiveQuestRewardModel(source.reward_model) === 'legacy_v1'
        ? [LEGACY_POINTS_THRESHOLD_DECISION]
        : [];
    const sourceStillMatches = await this.questModel.exists(
      this.sourceRevisionFilter(
        new Types.ObjectId(normalizedSourceId),
        input.expected_campaign_revision,
        input.expected_config_revision,
      ),
    );
    if (!sourceStillMatches) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message: 'Source quest changed while the revision was being prepared.',
      });
    }
    const draftBase = {
      _id: draftId,
      revision_of: new Types.ObjectId(normalizedSourceId),
      revision_source_campaign_revision: input.expected_campaign_revision,
      revision_source_config_revision: input.expected_config_revision,
      revision_reason: input.reason.trim(),
      revision_created_by: actorId,
      revision_request_key: requestKey,
      revision_payload_hash: payloadHash,
      publication_status: 'draft',
      blocked_decisions: blockedDecisions,
      campaign_revision: 0,
      config_revision: 0,
      reward_model: 'task_v2',
      timezone: source.timezone ?? 'Asia/Bangkok',
      audience: source.audience ?? { kind: 'all' },
      reward_caps: source.reward_caps ?? {
        max_awards_per_user: null,
        max_referrals_per_user: null,
      },
      start_date: input.start_date,
      end_date: input.end_date,
      status: 'scheduled',
      reward_status: false,
      reward_distribution_mode:
        source.reward_distribution_mode ?? 'campaign_end',
      reward_distribution_delay_days:
        source.reward_distribution_delay_days ?? 0,
      reward_distribution_scheduled_at: this.nextScheduledPayout(
        source,
        input.end_date,
      ),
      facebook_post: source.facebook_post ?? '',
      facebook_page: source.facebook_page ?? '',
      line: source.line ?? '',
      banner_en: source.banner_en,
      banner_th: source.banner_th,
      sub_banner_en: source.sub_banner_en,
      sub_banner_th: source.sub_banner_th,
      banner_assets: source.banner_assets ?? {},
      rewards: (source.rewards ?? []).map(
        (reward: Record<string, unknown>) => ({
          rank: Number(reward.rank),
          reward: Number(reward.reward),
          currency: String(reward.currency || 'THB').toUpperCase(),
        }),
      ),
      tasks,
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const revisionNumber = await this.nextRevisionNumber(
        new Types.ObjectId(normalizedSourceId),
        source,
      );
      const draft = { ...draftBase, revision_number: revisionNumber };
      let created: QuestRecord | null;
      try {
        created = (await this.questModel
          .findOneAndUpdate(
            { _id: draftId, revision_request_key: requestKey },
            { $setOnInsert: draft },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          )
          .lean()) as QuestRecord | null;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        const [idOwner, requestOwner] = await Promise.all([
          this.questModel.findById(draftId).lean(),
          this.questModel.findOne({ revision_request_key: requestKey }).lean(),
        ]);
        const owner = (idOwner ?? requestOwner) as QuestRecord | null;
        if (owner) {
          if (
            String(owner._id) === draftId.toHexString() &&
            owner.revision_payload_hash === payloadHash
          ) {
            return this.revisionResponse(owner);
          }
          throw new ConflictException(
            'request_key was already used for a different quest revision',
          );
        }
        // A concurrent request won this lineage number. Re-read the highest
        // direct child and retry without deleting the audit-preserved draft.
        continue;
      }
      if (!created || created.revision_payload_hash !== payloadHash) {
        throw new ConflictException(
          'Quest revision creation lost its idempotency fence',
        );
      }
      return this.revisionResponse(created);
    }
    throw new ConflictException({
      code: QUEST_CONFIG_REVISION_CONFLICT,
      message:
        'Another quest revision was created concurrently. Reload and try again.',
    });
  }

  async publishRevision(
    id: string,
    input: PublishQuestRevisionDto,
    actorId: string,
  ) {
    this.assertEnabled();
    this.assertActor(actorId);
    if (
      process.env.QUEST_REVISION_PUBLISH_READY?.trim().toLowerCase() !== 'true'
    ) {
      throw new ServiceUnavailableException({
        code: QUEST_REVISION_PUBLISH_NOT_READY,
        message:
          'Quest revision publication is disabled until the publication lock rollout is accepted.',
      });
    }
    if (!taskV2Enabled()) {
      throw new ServiceUnavailableException({
        code: QUEST_TASK_V2_UNAVAILABLE,
        message: 'Quest task-v2 must be enabled before publishing a revision.',
      });
    }
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid quest id');
    }
    const questId = new Types.ObjectId(id);
    const normalizedQuestId = questId.toHexString();
    const payloadHash = sha256({
      quest_id: normalizedQuestId,
      request_key: input.request_key.trim(),
      expected_campaign_revision: input.expected_campaign_revision,
      expected_config_revision: input.expected_config_revision,
    });
    const draft = (await this.questModel
      .findById(questId)
      .lean()) as QuestRecord | null;
    if (!draft) throw new HttpException('Quest revision not found', 404);
    if (draft.publication_status === 'published') {
      if (
        draft.publish_request_key === input.request_key.trim() &&
        draft.publish_payload_hash === payloadHash
      ) {
        return this.publishResponse(draft);
      }
      throw new ConflictException('Quest revision is already published');
    }
    if (draft.publication_status !== 'draft' || !draft.revision_of) {
      throw new BadRequestException('Only a quest revision draft can publish');
    }
    if (draft.reward_model !== 'task_v2') {
      throw new BadRequestException(
        'Quest revision must use task_v2 before publication.',
      );
    }
    this.assertExpectedRevisions(draft, input);
    this.assertPublishReady(draft);
    const publishPreflight = await this.revisionPreflight.evaluate(draft);
    this.assertPublishPreflight(publishPreflight.blockers);

    const now = new Date();
    let published: QuestRecord | null;
    try {
      published = (await this.questModel
        .findOneAndUpdate(
          {
            _id: mongoEq(questId),
            publication_status: 'draft',
            campaign_revision: mongoEq(input.expected_campaign_revision),
            config_revision: mongoEq(input.expected_config_revision),
            revision_source_campaign_revision: mongoEq(
              draft.revision_source_campaign_revision,
            ),
            revision_source_config_revision: mongoEq(
              draft.revision_source_config_revision,
            ),
            start_date: { $gt: now },
          },
          {
            $set: {
              publication_status: 'published',
              published_at: now,
              published_by: actorId,
              publish_request_key: input.request_key.trim(),
              publish_payload_hash: payloadHash,
              status: 'scheduled',
            },
          },
          { new: true },
        )
        .lean()) as QuestRecord | null;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      throw new ConflictException(
        'request_key was already used to publish another quest revision',
      );
    }
    if (!published) {
      const replay = (await this.questModel
        .findById(questId)
        .lean()) as QuestRecord | null;
      if (
        replay?.publication_status === 'published' &&
        replay.publish_request_key === input.request_key.trim() &&
        replay.publish_payload_hash === payloadHash
      ) {
        return this.publishResponse(replay);
      }
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message: 'Quest revision changed or started before publication.',
      });
    }
    return this.publishResponse(published);
  }

  private assertEnabled() {
    if (workflowEnabled()) return;
    throw new ServiceUnavailableException({
      code: QUEST_REVISION_WORKFLOW_DISABLED,
      message: 'Quest revision workflow is disabled.',
    });
  }

  private assertActor(actorId: string) {
    if (Types.ObjectId.isValid(actorId)) return;
    throw new BadRequestException('Authenticated admin actor is required.');
  }

  private assertExpectedRevisions(
    quest: QuestRecord,
    input: {
      expected_campaign_revision: number;
      expected_config_revision: number;
    },
  ) {
    if (
      Number(quest.campaign_revision ?? 0) !==
        input.expected_campaign_revision ||
      Number(quest.config_revision ?? 0) !== input.expected_config_revision
    ) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        message: 'Quest changed. Reload and try again.',
      });
    }
  }

  private assertFutureWindow(start: Date, end: Date) {
    const now = new Date();
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start <= now ||
      end <= start
    ) {
      throw new BadRequestException(
        'Quest revision requires a valid future, non-empty window.',
      );
    }
  }

  private async assertNoPublishedOverlap(
    start: Date,
    end: Date,
    excludedId: Types.ObjectId,
  ) {
    const overlap = await this.questModel.exists({
      _id: { $ne: excludedId },
      publication_status: { $ne: 'draft' },
      start_date: { $lte: end },
      end_date: { $gte: start },
    });
    if (overlap) {
      throw new ConflictException(
        'Quest revision window overlaps another published quest.',
      );
    }
  }

  private revisionValueClause(
    field: string,
    expected: number,
  ): Record<string, any> {
    return expected === 0
      ? { $or: [{ [field]: 0 }, { [field]: { $exists: false } }] }
      : { [field]: expected };
  }

  private sourceRevisionFilter(
    sourceId: Types.ObjectId,
    expectedCampaignRevision: number,
    expectedConfigRevision: number,
  ): Record<string, any> {
    return {
      _id: sourceId,
      publication_status: { $ne: 'draft' },
      $and: [
        this.revisionValueClause('campaign_revision', expectedCampaignRevision),
        this.revisionValueClause('config_revision', expectedConfigRevision),
      ],
    };
  }

  private async nextRevisionNumber(
    sourceId: Types.ObjectId,
    source: QuestRecord,
  ): Promise<number> {
    const latestChild = (await this.questModel
      .findOne({ revision_of: sourceId })
      .sort({ revision_number: -1, _id: -1 })
      .select('revision_number')
      .lean()) as QuestRecord | null;
    return (
      Math.max(
        Number(source.revision_number ?? 0),
        Number(latestChild?.revision_number ?? 0),
      ) + 1
    );
  }

  private async cloneTasks(sourceId: string, source: QuestRecord) {
    if (Array.isArray(source.tasks) && source.tasks.length > 0) {
      const tasks = source.tasks
        .filter((task: Record<string, any>) => task.enabled !== false)
        .map((task: Record<string, any>, index: number): QuestRecord => {
          const canonical = canonicalizeStoredQuestTask(
            sourceId,
            task,
            source.reward_model,
          );
          return {
            ...canonical,
            task_key: newQuestTaskKey(),
            task_type: canonical.task_type,
            points: Number(canonical.points),
            ...(canonical.task_type === 'brand_purchase'
              ? { extra_point: Number(canonical.points) }
              : {}),
            sort_order: Number(task.sort_order ?? index),
          };
        });
      const brandOfferIds = tasks
        .filter((task) => task.task_type === 'brand_purchase')
        .map((task) => taskOfferId(task))
        .filter((id): id is Types.ObjectId => Boolean(id));
      const offers =
        brandOfferIds.length === 0
          ? []
          : ((await this.offerModel
              .find({
                _id: { $in: brandOfferIds },
                ...ACTIVE_APPROVED_OFFER_FILTER,
              })
              .select('_id offer_id merchant_id')
              .lean()) as QuestRecord[]);
      const offerById = new Map(
        offers.map((offer) => [String(offer._id), offer]),
      );
      return tasks.map((task) => {
        if (task.task_type !== 'brand_purchase') return task;
        const id = taskOfferId(task);
        const offer = id ? offerById.get(id.toHexString()) : undefined;
        const offerId = positiveProviderId(offer?.offer_id);
        const merchantId = positiveProviderId(offer?.merchant_id);
        if (id && offer && offerId !== null && merchantId !== null) {
          return {
            ...task,
            offer: id,
            offer_id: offerId,
            merchant_id: merchantId,
            extra_point: Number(task.points),
          };
        }
        const storedOfferId = positiveProviderId(task.offer_id);
        const storedMerchantId = positiveProviderId(task.merchant_id);
        const {
          offer: _offer,
          offer_id: _offerId,
          merchant_id: _merchantId,
          ...recoverableTask
        } = task;
        return {
          ...recoverableTask,
          ...(id ? { offer: id } : {}),
          ...(storedOfferId !== null ? { offer_id: storedOfferId } : {}),
          ...(storedMerchantId !== null
            ? { merchant_id: storedMerchantId }
            : {}),
          extra_point: Number(task.points),
          enabled: false,
          source_offer_remediation_required: true,
        };
      });
    }

    const effective = await this.catalog.getAdminCatalog(sourceId);
    const brandTasks = effective.tasks.filter(
      (task) =>
        task.source === 'legacy_offer_fallback' &&
        task.task_kind === 'brand_purchase' &&
        task.offer?.id,
    );
    const offerIds = brandTasks.flatMap((task) =>
      Types.ObjectId.isValid(task.offer!.id)
        ? [new Types.ObjectId(task.offer!.id)]
        : [],
    );
    const offers = (await this.offerModel
      .find({
        _id: { $in: offerIds },
        ...ACTIVE_APPROVED_OFFER_FILTER,
      })
      .select('_id offer_id merchant_id')
      .lean()) as QuestRecord[];
    const offerById = new Map(
      offers.map((offer) => [String(offer._id), offer]),
    );
    return brandTasks.flatMap((task, index) => {
      const id = Types.ObjectId.isValid(task.offer!.id)
        ? new Types.ObjectId(task.offer!.id)
        : null;
      const offer = id ? offerById.get(id.toHexString()) : undefined;
      const offerId = positiveProviderId(offer?.offer_id);
      const merchantId = positiveProviderId(offer?.merchant_id);
      const offerIsReady =
        id && offer && offerId !== null && merchantId !== null;
      return [
        {
          task_key: newQuestTaskKey(),
          task_type: 'brand_purchase',
          ...(id ? { offer: id } : {}),
          ...(offerId !== null ? { offer_id: offerId } : {}),
          ...(merchantId !== null ? { merchant_id: merchantId } : {}),
          points: Number(task.points),
          extra_point: Number(task.points),
          sort_order: index,
          enabled: Boolean(offerIsReady),
          ...(!offerIsReady ? { source_offer_remediation_required: true } : {}),
          wording: task.wording_en,
          wording_en: task.wording_en,
          wording_th: task.wording_th,
          notes: '',
        },
      ];
    });
  }

  private nextScheduledPayout(source: QuestRecord, end: Date) {
    if (source.reward_distribution_mode === 'manual') return null;
    const delayDays = Number(source.reward_distribution_delay_days ?? 0);
    return new Date(end.getTime() + delayDays * 86_400_000);
  }

  private assertPublishReady(draft: QuestRecord) {
    const blockers = questRevisionContentBlockers(draft);
    if (blockers.includes(QUEST_REVISION_TASKS_REQUIRED)) {
      throw new BadRequestException('Quest revision has no enabled tasks.');
    }
    if (blockers.includes(QUEST_REVISION_TASKS_INVALID)) {
      throw new BadRequestException(
        'Quest revision contains an invalid enabled task.',
      );
    }
    if (blockers.includes(QUEST_REVISION_REWARDS_REQUIRED)) {
      throw new BadRequestException('Quest revision has no rewards.');
    }
    if (blockers.includes(QUEST_REVISION_REWARDS_INVALID)) {
      throw new BadRequestException('Quest revision rewards are invalid.');
    }
    if (blockers.includes(QUEST_REVISION_MEDIA_REQUIRED)) {
      throw new BadRequestException(
        'Quest revision is missing required media.',
      );
    }
    if (blockers.includes(QUEST_REVISION_DECISION_REQUIRED)) {
      throw new ConflictException({
        code: QUEST_REVISION_DECISION_REQUIRED,
        message:
          'Quest revision has unresolved product decisions and cannot publish.',
        blocked_decisions: draft.blocked_decisions,
      });
    }
  }

  private assertPublishPreflight(blockers: string[]) {
    if (blockers.includes(QUEST_REVISION_WINDOW_INVALID)) {
      throw new BadRequestException({
        code: QUEST_REVISION_WINDOW_INVALID,
        message: 'Quest revision requires a valid future, non-empty window.',
      });
    }
    if (blockers.includes(QUEST_REVISION_OFFERS_UNAVAILABLE)) {
      throw new BadRequestException({
        code: QUEST_REVISION_OFFERS_UNAVAILABLE,
        message:
          'Quest revision tasks require existing approved active offers.',
      });
    }
    if (blockers.includes(QUEST_REVISION_WINDOW_OVERLAP)) {
      throw new ConflictException({
        code: QUEST_REVISION_WINDOW_OVERLAP,
        message: 'Quest revision window overlaps another published quest.',
      });
    }
    if (blockers.includes(QUEST_REVISION_SOURCE_STALE)) {
      throw new ConflictException({
        code: QUEST_CONFIG_REVISION_CONFLICT,
        blocker: QUEST_REVISION_SOURCE_STALE,
        message:
          'Source quest changed after this revision was created. Create a fresh revision.',
      });
    }
    if (blockers.length > 0) {
      throw new ConflictException({
        code: blockers[0],
        message: 'Quest revision failed publication preflight.',
      });
    }
  }

  private revisionResponse(quest: QuestRecord) {
    const blockedDecisions = quest.blocked_decisions ?? [];
    const warnings = [];
    if (blockedDecisions.includes(LEGACY_POINTS_THRESHOLD_DECISION)) {
      warnings.push({
        code: 'LEGACY_POINTS_THRESHOLD_NOT_MATERIALIZED',
        message:
          'The legacy 300-point bonus was not copied because its future business semantics are unconfirmed.',
      });
    }
    if (
      (quest.tasks ?? []).some(
        (task: QuestRecord) => task.source_offer_remediation_required === true,
      )
    ) {
      warnings.push({
        code: SOURCE_OFFER_REMEDIATION_WARNING,
        message:
          'One or more source brand tasks reference unavailable offers. Replace or remove the disabled rows before publishing.',
      });
    }
    return {
      quest: sanitizeAdminQuestRecord(quest),
      revision_workflow: questRevisionWorkflowReadiness(quest, {
        canCreateRevision: quest.publication_status !== 'draft',
      }),
      warnings,
      blocked_decisions: blockedDecisions,
    };
  }

  private publishResponse(quest: QuestRecord) {
    return {
      quest: sanitizeAdminQuestRecord(quest),
      published: true,
      revision_workflow: questRevisionWorkflowReadiness(quest, {
        canCreateRevision: true,
      }),
    };
  }
}
