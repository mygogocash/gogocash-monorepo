import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';

import { Offer } from 'src/offer/schemas/offer.schema';

import {
  QUEST_REVISION_NOT_DRAFT,
  QUEST_REVISION_OFFERS_UNAVAILABLE,
  QUEST_REVISION_SOURCE_STALE,
  QUEST_REVISION_WINDOW_INVALID,
  QUEST_REVISION_WINDOW_OVERLAP,
  QuestRevisionPublishPreflight,
} from './quest-revision-readiness';
import { Quest } from './schemas/quest.schema';

const ACTIVE_APPROVED_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
} as const;

type QuestRevisionSnapshot = {
  _id?: unknown;
  publication_status?: unknown;
  revision_of?: unknown;
  revision_source_campaign_revision?: unknown;
  revision_source_config_revision?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  tasks?: unknown;
};
type QuestRevisionTaskSnapshot = {
  enabled?: unknown;
  task_type?: unknown;
  offer?: unknown;
  offer_id?: unknown;
  merchant_id?: unknown;
  source_offer_remediation_required?: unknown;
};
type OfferIdentity = {
  _id?: unknown;
  offer_id?: unknown;
  merchant_id?: unknown;
};

function objectId(value: unknown): Types.ObjectId | null {
  const candidate =
    value && typeof value === 'object' && '_id' in value
      ? (value as { _id?: unknown })._id
      : value;
  const normalized =
    candidate instanceof Types.ObjectId
      ? candidate.toHexString()
      : String(candidate ?? '');
  return Types.ObjectId.isValid(normalized)
    ? new Types.ObjectId(normalized)
    : null;
}

function expectedRevision(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 0
    ? normalized
    : null;
}

function positiveProviderId(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function dateValue(value: unknown): Date {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date(Number.NaN);
}

function revisionValueClause(
  field: string,
  expected: number,
): Record<string, unknown> {
  return expected === 0
    ? { $or: [{ [field]: 0 }, { [field]: { $exists: false } }] }
    : { [field]: expected };
}

/**
 * Evaluates whether one persisted Quest revision snapshot is publishable.
 *
 * This service deliberately returns a point-in-time receipt. It does not lock
 * the source Quest, offers, or competing campaign windows; publication still
 * needs an atomic serialization boundary before its rollout gate can be
 * enabled.
 */
@Injectable()
export class QuestRevisionPreflightService {
  constructor(
    @InjectModel(Quest.name) private readonly questModel: Model<Quest>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
  ) {}

  async evaluate(
    draft: QuestRevisionSnapshot,
    now = new Date(),
  ): Promise<QuestRevisionPublishPreflight> {
    const blockers: string[] = [];
    if (draft.publication_status !== 'draft') {
      blockers.push(QUEST_REVISION_NOT_DRAFT);
    }

    const start = dateValue(draft.start_date);
    const end = dateValue(draft.end_date);
    const windowIsValid =
      !Number.isNaN(now.getTime()) &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start > now &&
      end > start;
    if (!windowIsValid) {
      blockers.push(QUEST_REVISION_WINDOW_INVALID);
    }

    const sourceId = objectId(draft.revision_of);
    const expectedCampaignRevision = expectedRevision(
      draft.revision_source_campaign_revision,
    );
    const expectedConfigRevision = expectedRevision(
      draft.revision_source_config_revision,
    );

    const sourceLookup =
      sourceId &&
      expectedCampaignRevision !== null &&
      expectedConfigRevision !== null
        ? this.questModel.exists({
            _id: sourceId,
            publication_status: { $ne: 'draft' },
            $and: [
              revisionValueClause(
                'campaign_revision',
                expectedCampaignRevision,
              ),
              revisionValueClause('config_revision', expectedConfigRevision),
            ],
          })
        : Promise.resolve(null);

    const taskSnapshots = Array.isArray(draft.tasks)
      ? draft.tasks.filter(
          (task): task is QuestRevisionTaskSnapshot =>
            Boolean(task) && typeof task === 'object',
        )
      : [];
    const hasSourceOfferRemediation = taskSnapshots.some(
      (task) => task.source_offer_remediation_required === true,
    );
    const enabledBrandTasks = taskSnapshots.filter(
      (task) => task.enabled !== false && task.task_type === 'brand_purchase',
    );
    const brandOfferIds = new Map<string, Types.ObjectId>();
    let hasInvalidBrandOffer = false;
    for (const task of enabledBrandTasks) {
      const id = objectId(task.offer);
      if (!id) {
        hasInvalidBrandOffer = true;
        continue;
      }
      brandOfferIds.set(id.toHexString(), id);
    }

    const requestedOfferIds = [...brandOfferIds.values()];
    const offerLookup =
      requestedOfferIds.length > 0
        ? this.findActiveApprovedOffers(requestedOfferIds)
        : Promise.resolve([]);

    const draftId = objectId(draft._id);
    const overlapLookup = windowIsValid
      ? this.questModel.exists({
          ...(draftId ? { _id: { $ne: draftId } } : {}),
          publication_status: { $ne: 'draft' },
          start_date: { $lte: end },
          end_date: { $gte: start },
        })
      : Promise.resolve(null);

    const [source, activeOffers, overlap] = await Promise.all([
      sourceLookup,
      offerLookup,
      overlapLookup,
    ]);

    if (!source) {
      blockers.push(QUEST_REVISION_SOURCE_STALE);
    }

    const activeOffersById = new Map(
      activeOffers.flatMap((offer) => {
        const id = objectId(offer._id)?.toHexString();
        return id ? [[id, offer] as const] : [];
      }),
    );
    const providerIdentityMismatch = enabledBrandTasks.some((task) => {
      const id = objectId(task.offer)?.toHexString();
      const offer = id ? activeOffersById.get(id) : undefined;
      const taskOfferId = positiveProviderId(task.offer_id);
      const taskMerchantId = positiveProviderId(task.merchant_id);
      const offerId = positiveProviderId(offer?.offer_id);
      const merchantId = positiveProviderId(offer?.merchant_id);
      return (
        !offer ||
        taskOfferId === null ||
        taskMerchantId === null ||
        offerId === null ||
        merchantId === null ||
        taskOfferId !== offerId ||
        taskMerchantId !== merchantId
      );
    });
    if (
      hasSourceOfferRemediation ||
      hasInvalidBrandOffer ||
      activeOffersById.size !== requestedOfferIds.length ||
      requestedOfferIds.some((id) => !activeOffersById.has(id.toHexString())) ||
      providerIdentityMismatch
    ) {
      blockers.push(QUEST_REVISION_OFFERS_UNAVAILABLE);
    }

    if (overlap) {
      blockers.push(QUEST_REVISION_WINDOW_OVERLAP);
    }

    return {
      checked: true,
      blockers: [...new Set(blockers)],
    };
  }

  private async findActiveApprovedOffers(
    offerIds: Types.ObjectId[],
  ): Promise<OfferIdentity[]> {
    const filter: QueryFilter<Offer> = {
      _id: { $in: offerIds },
      ...ACTIVE_APPROVED_OFFER_FILTER,
    };
    return (await this.offerModel
      .find(filter)
      .select('_id offer_id merchant_id')
      .lean()) as OfferIdentity[];
  }
}
