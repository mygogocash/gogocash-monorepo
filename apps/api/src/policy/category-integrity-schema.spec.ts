import { CategorySchema } from 'src/offer/schemas/category.schema';
import { OfferSchema } from 'src/offer/schemas/offer.schema';

import { PolicyCategorySourceSchema } from './schemas/policy-category-source.schema';
import { PolicyMediaAssetRegistrySchema } from './schemas/policy-media-asset-registry.schema';
import { PolicyMediaWriteCommandSchema } from './schemas/policy-media-write-command.schema';

function findIndex(
  indexes: ReturnType<typeof CategorySchema.indexes>,
  key: Record<string, number>,
) {
  return indexes.find(
    ([candidate]) => JSON.stringify(candidate) === JSON.stringify(key),
  );
}

describe('policy category integrity schema contracts', () => {
  it('keeps source index replacement migration-owned and removes the legacy unique category fence', () => {
    expect(PolicyCategorySourceSchema.get('autoIndex')).toBe(false);
    const indexes = PolicyCategorySourceSchema.indexes();
    expect(findIndex(indexes, { source: 1, source_key: 1 })?.[1]).toMatchObject(
      {
        name: 'policy_category_source_identity_v2',
        unique: true,
      },
    );
    expect(findIndex(indexes, { category_id: 1 })?.[1]).toMatchObject({
      name: 'policy_category_source_category_id_v2',
    });
    expect(
      indexes.some(
        ([key, options]) =>
          JSON.stringify(key) === JSON.stringify({ category_id: 1 }) &&
          options.unique === true,
      ),
    ).toBe(false);
  });

  it('declares the canonical category identity and both offer reference indexes', () => {
    expect(
      findIndex(CategorySchema.indexes(), { name_normalized: 1 })?.[1],
    ).toMatchObject({
      name: 'policy_category_name_normalized_v2',
      unique: true,
      partialFilterExpression: {
        name_normalized: { $type: 'string' },
      },
    });
    expect(
      findIndex(OfferSchema.indexes(), { policy_category_id: 1 }),
    ).toBeDefined();
    expect(
      findIndex(OfferSchema.indexes(), { categories_normalized: 1 }),
    ).toBeDefined();
  });

  it('keeps the media lifecycle registry migration-owned with exact hash and retry indexes', () => {
    expect(PolicyMediaAssetRegistrySchema.get('autoIndex')).toBe(false);
    expect(
      findIndex(PolicyMediaAssetRegistrySchema.indexes(), { url_hash: 1 })?.[1],
    ).toMatchObject({
      name: 'policy_media_asset_registry_url_hash_v1',
      unique: true,
    });
    expect(
      findIndex(PolicyMediaAssetRegistrySchema.indexes(), {
        state: 1,
        delete_lease_expires_at: 1,
      })?.[1],
    ).toMatchObject({ name: 'policy_media_asset_registry_state_lease_v1' });

    const statePath = PolicyMediaAssetRegistrySchema.path('state') as any;
    expect(statePath.options.enum).toEqual(['active', 'deleting', 'deleted']);
  });

  it('declares exact durable media-write ownership indexes', () => {
    expect(PolicyMediaWriteCommandSchema.get('autoIndex')).toBe(false);
    expect(
      findIndex(PolicyMediaWriteCommandSchema.indexes(), {
        request_key: 1,
      })?.[1],
    ).toMatchObject({ name: 'request_key_1', unique: true });
    expect(
      findIndex(PolicyMediaWriteCommandSchema.indexes(), {
        'planned_assets.asset.owner_key': 1,
        'planned_assets.asset.owner_attempt_token': 1,
        'planned_assets.asset.object_key': 1,
      })?.[1],
    ).toMatchObject({
      name: 'planned_asset_owner_1_attempt_1_object_1',
      partialFilterExpression: {
        'planned_assets.asset.object_key': { $type: 'string' },
      },
    });
  });
});
