import { BadRequestException, ConflictException } from '@nestjs/common';

import { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';

import {
  normalizePolicyMediaUrl,
  policyMediaUrlHash,
  PolicyMediaAssetRegistryService,
} from './policy-media-asset-registry.service';

function query<T>(value: T) {
  return {
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
    exec: jest.fn().mockResolvedValue(value),
  };
}

const asset: CommandOwnedStoredMediaAsset = {
  provider: 'r2',
  ownership: 'command-owned',
  owner_key: 'policy-save-1',
  owner_attempt_token: 'attempt-1',
  url: ' https://media.example/Policy/Icon.PNG?version=A ',
  bucket: 'media',
  object_key: `categories/policy-save-1/attempt-1/${'a'.repeat(64)}.png`,
  sha256: 'a'.repeat(64),
  original_name: 'Icon.PNG',
  content_type: 'image/png',
};

function makeHarness() {
  const registryModel: any = {
    findOne: jest.fn(() => query(null)),
    findOneAndUpdate: jest.fn(() => query(null)),
  };
  const categoryModel: any = {
    countDocuments: jest.fn(() => query(0)),
  };
  const offerModel: any = {
    countDocuments: jest.fn(() => query(0)),
  };
  const brandModel: any = {
    countDocuments: jest.fn(() => query(0)),
  };
  const service = new PolicyMediaAssetRegistryService(
    registryModel,
    categoryModel,
    offerModel,
    brandModel,
  );
  return {
    service,
    registryModel,
    categoryModel,
    offerModel,
    brandModel,
    session: { id: 'session-a' } as never,
  };
}

describe('policy media URL identity', () => {
  it('trims only and hashes the exact case-sensitive URL including its query', () => {
    expect(normalizePolicyMediaUrl(asset.url)).toBe(
      'https://media.example/Policy/Icon.PNG?version=A',
    );
    expect(policyMediaUrlHash(asset.url)).toMatch(/^[a-f0-9]{64}$/);
    expect(policyMediaUrlHash(asset.url)).not.toBe(
      policyMediaUrlHash('https://media.example/policy/icon.png?version=a'),
    );
  });

  it('rejects blank and non-string URL identities', () => {
    expect(() => normalizePolicyMediaUrl('   ')).toThrow(BadRequestException);
    expect(() => normalizePolicyMediaUrl(null)).toThrow(BadRequestException);
  });
});

describe('PolicyMediaAssetRegistryService', () => {
  it('registers a verified command-owned asset by touching the active fence in the caller session', async () => {
    const { service, registryModel, session } = makeHarness();
    const normalizedUrl = normalizePolicyMediaUrl(asset.url);
    const row = {
      url_hash: policyMediaUrlHash(normalizedUrl),
      url: normalizedUrl,
      state: 'active',
      revision: 1,
    };
    registryModel.findOneAndUpdate.mockReturnValue(query(row));

    await expect(
      service.registerCommandOwnedInSession(asset, session),
    ).resolves.toMatchObject(row);

    expect(registryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        url_hash: policyMediaUrlHash(normalizedUrl),
        url: normalizedUrl,
        state: 'active',
        provider: 'r2',
        ownership: 'command-owned',
        bucket: asset.bucket,
        object_key: asset.object_key,
        content_sha256: asset.sha256,
      }),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          url_hash: policyMediaUrlHash(normalizedUrl),
          url: normalizedUrl,
          state: 'active',
        }),
        $inc: { revision: 1 },
      }),
      expect.objectContaining({ upsert: true, session }),
    );
  });

  it('rejects incomplete or unverified assets before touching the registry', async () => {
    const { service, registryModel, session } = makeHarness();
    await expect(
      service.registerCommandOwnedInSession(
        { ...asset, sha256: undefined },
        session,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(registryModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('allows a missing legacy URL to remain untracked and never creates a registry row', async () => {
    const { service, registryModel, session } = makeHarness();
    await expect(
      service.touchAttachInSession('https://legacy.example/icon.png', session),
    ).resolves.toEqual({ tracked: false });
    expect(registryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'active' }),
      { $inc: { revision: 1 } },
      expect.objectContaining({ upsert: false, session }),
    );
    expect(registryModel.findOne).toHaveBeenCalled();
  });

  it.each(['deleting', 'deleted'] as const)(
    'rejects attachment while a tracked URL is %s',
    async (state) => {
      const { service, registryModel, session } = makeHarness();
      registryModel.findOne.mockReturnValue(
        query({
          url_hash: policyMediaUrlHash(asset.url),
          url: normalizePolicyMediaUrl(asset.url),
          state,
          revision: 2,
        }),
      );

      await expect(
        service.touchAttachInSession(asset.url, session),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('never claims an untracked legacy URL and skips reference scans', async () => {
    const {
      service,
      registryModel,
      categoryModel,
      offerModel,
      brandModel,
      session,
    } = makeHarness();
    await expect(
      service.beginDeleteInSession('https://legacy.example/icon.png', session),
    ).resolves.toEqual({ claimed: false, reason: 'untracked' });
    expect(registryModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(categoryModel.countDocuments).not.toHaveBeenCalled();
    expect(offerModel.countDocuments).not.toHaveBeenCalled();
    expect(brandModel.countDocuments).not.toHaveBeenCalled();
  });

  it('returns exact Category, Offer, and Brand reference counts without transitioning state', async () => {
    const {
      service,
      registryModel,
      categoryModel,
      offerModel,
      brandModel,
      session,
    } = makeHarness();
    const url = normalizePolicyMediaUrl(asset.url);
    registryModel.findOne.mockReturnValue(
      query({
        _id: 'registry-a',
        url_hash: policyMediaUrlHash(url),
        url,
        state: 'active',
        revision: 4,
      }),
    );
    categoryModel.countDocuments.mockReturnValue(query(1));
    offerModel.countDocuments.mockReturnValue(query(2));
    brandModel.countDocuments.mockReturnValue(query(3));

    await expect(service.beginDeleteInSession(url, session)).resolves.toEqual({
      claimed: false,
      reason: 'referenced',
      references: { categories: 1, offers: 2, brands: 3, total: 6 },
    });
    expect(categoryModel.countDocuments).toHaveBeenCalledWith({
      $or: [
        { image: url },
        { banner: url },
        { 'image_asset.url': url },
        { 'banner_asset.url': url },
      ],
    });
    expect(offerModel.countDocuments).toHaveBeenCalledWith({
      $or: [
        { logo: url },
        { logo_desktop: url },
        { logo_mobile: url },
        { logo_circle: url },
        { banner: url },
        { banner_mobile: url },
        { 'logo_asset.url': url },
        { 'banner_asset.url': url },
      ],
    });
    expect(brandModel.countDocuments).toHaveBeenCalledWith({
      $or: [{ logo: url }, { logo_circle: url }, { banner: url }],
    });
    expect(registryModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rescans every owner collection before reclaiming an expired deleting lease', async () => {
    const {
      service,
      registryModel,
      categoryModel,
      offerModel,
      brandModel,
      session,
    } = makeHarness();
    const url = normalizePolicyMediaUrl(asset.url);
    const expired = {
      _id: 'registry-expired',
      url_hash: policyMediaUrlHash(url),
      url,
      state: 'deleting',
      revision: 7,
      delete_token: 'dead-worker',
      delete_lease_expires_at: new Date(Date.now() - 1_000),
    };
    const claimed = {
      ...expired,
      revision: 8,
      delete_token: 'replacement-worker',
      delete_lease_expires_at: new Date(Date.now() + 60_000),
    };
    registryModel.findOne.mockReturnValue(query(expired));
    registryModel.findOneAndUpdate.mockReturnValue(query(claimed));

    await expect(
      service.beginDeleteInSession(url, session),
    ).resolves.toMatchObject({
      claimed: true,
      delete_token: expect.any(String),
      references: { categories: 0, offers: 0, brands: 0, total: 0 },
    });
    expect(categoryModel.countDocuments).toHaveBeenCalledTimes(1);
    expect(offerModel.countDocuments).toHaveBeenCalledTimes(1);
    expect(brandModel.countDocuments).toHaveBeenCalledTimes(1);
    expect(registryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expired._id,
        revision: expired.revision,
        $or: expect.arrayContaining([
          expect.objectContaining({ state: 'active' }),
          expect.objectContaining({ state: 'deleting' }),
        ]),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ state: 'deleting' }),
        $inc: { revision: 1 },
      }),
      expect.objectContaining({ session }),
    );
  });

  it('returns busy without changing state for an unexpired deletion lease, after a full rescan', async () => {
    const {
      service,
      registryModel,
      categoryModel,
      offerModel,
      brandModel,
      session,
    } = makeHarness();
    const url = normalizePolicyMediaUrl(asset.url);
    registryModel.findOne.mockReturnValue(
      query({
        _id: 'registry-busy',
        url_hash: policyMediaUrlHash(url),
        url,
        state: 'deleting',
        revision: 3,
        delete_token: 'active-worker',
        delete_lease_expires_at: new Date(Date.now() + 60_000),
      }),
    );

    await expect(service.beginDeleteInSession(url, session)).resolves.toEqual({
      claimed: false,
      reason: 'busy',
      references: { categories: 0, offers: 0, brands: 0, total: 0 },
    });
    expect(categoryModel.countDocuments).toHaveBeenCalledTimes(1);
    expect(offerModel.countDocuments).toHaveBeenCalledTimes(1);
    expect(brandModel.countDocuments).toHaveBeenCalledTimes(1);
    expect(registryModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('finalizes only the matching deleting token and keeps storage failures retryable', async () => {
    const { service, registryModel, session } = makeHarness();
    const url = normalizePolicyMediaUrl(asset.url);
    registryModel.findOneAndUpdate
      .mockReturnValueOnce(query({ state: 'deleted' }))
      .mockReturnValueOnce(query({ state: 'deleting' }));

    await expect(
      service.finalizeDeleted(url, 'worker-a', session),
    ).resolves.toBe(true);
    expect(registryModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      {
        url_hash: policyMediaUrlHash(url),
        url,
        state: 'deleting',
        delete_token: 'worker-a',
      },
      expect.objectContaining({
        $set: expect.objectContaining({ state: 'deleted' }),
        $unset: expect.objectContaining({ delete_token: 1 }),
        $inc: { revision: 1 },
      }),
      expect.objectContaining({ returnDocument: 'after', session }),
    );

    await expect(
      service.failDelete(url, 'worker-b', new Error('R2 unavailable'), session),
    ).resolves.toBe(true);
    expect(registryModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      {
        url_hash: policyMediaUrlHash(url),
        url,
        state: 'deleting',
        delete_token: 'worker-b',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          state: 'deleting',
          last_error: 'R2 unavailable',
        }),
        $unset: expect.objectContaining({
          delete_token: 1,
          delete_lease_expires_at: 1,
        }),
        $inc: { revision: 1 },
      }),
      expect.objectContaining({ returnDocument: 'after', session }),
    );
  });
});
