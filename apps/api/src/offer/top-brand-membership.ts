import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  MAX_TOP_BRANDS,
  normalizeTopBrandEntries,
  resolveDeviceBrandEntries,
  type TopBrandConfigLike,
} from './top-brand.contract';

/**
 * Only the two methods this helper actually calls, mirroring the structural
 * model type `mirrorTopBrandExtraStoreFlags` already takes below. Mongoose's
 * `Model<T>` is invariant in its filter types, so `Model<TopBrandConfig>` is
 * not assignable to `Model<TopBrandConfigLike & …>` even though the schema
 * satisfies the contract. Depending on the shape instead keeps this helper
 * decoupled from the schema class and testable with a plain fake.
 */
type TopBrandConfigModelLike = {
  findOne: () => {
    lean: () => { exec: () => Promise<TopBrandConfigLike | null> };
  };
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => PromiseLike<unknown>;
};

function toObjectIds(ids: readonly string[]): Types.ObjectId[] {
  return ids
    .map((id) => String(id ?? '').trim())
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
}

/**
 * Keep curated Top brands config in sync with the offer Top Brand (`extra_store`)
 * toggle (#475). Appends to both device lists when enabled; pulls from all three
 * arrays when disabled. Throws when the curated list is full so the Brand Info
 * toggle cannot silently diverge from the Top brands page.
 */
export async function syncOfferTopBrandMembership(
  topBrandConfigModel: TopBrandConfigModelLike,
  offerId: string,
  enabled: boolean,
): Promise<void> {
  const id = String(offerId ?? '').trim();
  if (!id) return;

  if (!enabled) {
    await topBrandConfigModel.updateOne(
      {},
      {
        $pull: {
          brands: { offerId: id },
          brandsDesktop: { offerId: id },
          brandsMobile: { offerId: id },
        },
      },
    );
    return;
  }

  const config = await topBrandConfigModel.findOne().lean().exec();
  const desktop = resolveDeviceBrandEntries(config, 'desktop');
  const mobile = resolveDeviceBrandEntries(config, 'mobile');
  const alreadyDesktop = desktop.some((row) => row.offerId === id);
  const alreadyMobile = mobile.some((row) => row.offerId === id);
  if (alreadyDesktop && alreadyMobile) return;

  const entry = { offerId: id, cashback: '' };
  if (!alreadyDesktop && desktop.length >= MAX_TOP_BRANDS) {
    throw new BadRequestException(
      `Top brands is limited to ${MAX_TOP_BRANDS} offers. Remove one from Top brands setup before enabling Top Brand.`,
    );
  }
  if (!alreadyMobile && mobile.length >= MAX_TOP_BRANDS) {
    throw new BadRequestException(
      `Top brands is limited to ${MAX_TOP_BRANDS} offers. Remove one from Top brands setup before enabling Top Brand.`,
    );
  }

  const nextDesktop = alreadyDesktop ? desktop : [...desktop, entry];
  const nextMobile = alreadyMobile ? mobile : [...mobile, entry];

  await topBrandConfigModel.updateOne(
    {},
    {
      $set: {
        brands: nextDesktop,
        brandsDesktop: nextDesktop,
        brandsMobile: nextMobile,
      },
    },
    { upsert: true },
  );
}

/**
 * After saving the curated list, mirror membership onto Offer.extra_store so
 * the Brand Info Top Brand toggle matches the Top brands page (#475).
 */
export async function mirrorTopBrandExtraStoreFlags(
  offerModel: {
    updateMany: (
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
    ) => { exec: () => Promise<unknown> };
  },
  memberOfferIds: readonly string[],
): Promise<void> {
  const objectIds = toObjectIds([
    ...new Set(memberOfferIds.map((id) => String(id ?? '').trim())),
  ]);

  if (objectIds.length === 0) {
    await offerModel
      .updateMany({ extra_store: true }, { $set: { extra_store: false } })
      .exec();
    return;
  }

  await offerModel
    .updateMany({ _id: { $in: objectIds } }, { $set: { extra_store: true } })
    .exec();
  await offerModel
    .updateMany(
      { extra_store: true, _id: { $nin: objectIds } },
      { $set: { extra_store: false } },
    )
    .exec();
}

/** Normalize union of device lists for mirrorTopBrandExtraStoreFlags. */
export function topBrandMemberIds(
  brandsDesktop: { offerId: string }[],
  brandsMobile: { offerId: string }[],
): string[] {
  return normalizeTopBrandEntries([...brandsDesktop, ...brandsMobile]).map(
    (row) => row.offerId,
  );
}
