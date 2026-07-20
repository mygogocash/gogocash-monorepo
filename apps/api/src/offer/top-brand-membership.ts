import { Model } from 'mongoose';
import {
  MAX_TOP_BRANDS,
  normalizeTopBrandEntries,
  resolveDeviceBrandEntries,
  type TopBrandConfigLike,
} from './top-brand.contract';

type TopBrandConfigDoc = TopBrandConfigLike & { _id?: unknown };

/**
 * Keep curated Top brands config in sync with the offer Top Brand (`extra_store`)
 * toggle (#475). Appends to both device lists when enabled (respecting max);
 * pulls from all three arrays when disabled.
 */
export async function syncOfferTopBrandMembership(
  topBrandConfigModel: Model<TopBrandConfigDoc>,
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
  const entry = { offerId: id, cashback: '' };
  const nextDesktop = desktop.some((row) => row.offerId === id)
    ? desktop
    : desktop.length >= MAX_TOP_BRANDS
      ? desktop
      : [...desktop, entry];
  const nextMobile = mobile.some((row) => row.offerId === id)
    ? mobile
    : mobile.length >= MAX_TOP_BRANDS
      ? mobile
      : [...mobile, entry];

  if (
    nextDesktop.length === desktop.length &&
    nextMobile.length === mobile.length &&
    desktop.some((row) => row.offerId === id) &&
    mobile.some((row) => row.offerId === id)
  ) {
    return;
  }

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
  const ids = [
    ...new Set(
      memberOfferIds.map((id) => String(id ?? '').trim()).filter(Boolean),
    ),
  ];

  if (ids.length === 0) {
    await offerModel.updateMany(
      { extra_store: true },
      { $set: { extra_store: false } },
    ).exec();
    return;
  }

  await offerModel
    .updateMany({ _id: { $in: ids } }, { $set: { extra_store: true } })
    .exec();
  await offerModel
    .updateMany(
      { extra_store: true, _id: { $nin: ids } },
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
