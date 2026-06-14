import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PolicyService } from './policy.service';
import type { UpsertPolicyDto } from './dto/upsert-policy.dto';

/**
 * Service-level tests focused on the validation contract — these are the
 * rules that protect the Policy collection from bad writes. We mock the
 * mongoose models with the minimum surface the service actually uses.
 */

const VALID_CATEGORY_ID = '507f1f77bcf86cd799439011';
const NONEXISTENT_CATEGORY_ID = '507f1f77bcf86cd799439099';

function makeService(opts: { categoryExists?: boolean } = {}) {
  const categoryExists = opts.categoryExists ?? true;

  const policyModel: any = {
    _docs: [] as any[],
    findOne: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(null),
  };

  const categoryModel: any = {
    exists: jest.fn().mockReturnValue({
      lean: () =>
        Promise.resolve(categoryExists ? { _id: VALID_CATEGORY_ID } : null),
    }),
  };

  return {
    service: new PolicyService(policyModel, categoryModel),
    policyModel,
    categoryModel,
  };
}

const validBanner: UpsertPolicyDto['banner'] = {
  primary_locale: 'th',
  translations: { th: 'แบนเนอร์', en: 'Banner' },
};

const validTerms: UpsertPolicyDto['terms'] = {
  primary_locale: 'th',
  translations: { th: 'เงื่อนไข', en: 'Terms' },
};

describe('PolicyService.upsert', () => {
  it('rejects unknown category with NotFoundException', async () => {
    const { service } = makeService({ categoryExists: false });
    await expect(
      service.upsert({
        category_id: NONEXISTENT_CATEGORY_ID,
        banner: validBanner,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects unsupported locale keys in banner.translations', async () => {
    const { service } = makeService();
    await expect(
      service.upsert({
        category_id: VALID_CATEGORY_ID,
        banner: {
          primary_locale: 'th',
          translations: { th: 'ok', xx: 'pirate' },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported locale keys in terms.additional_terms', async () => {
    const { service } = makeService();
    await expect(
      service.upsert({
        category_id: VALID_CATEGORY_ID,
        terms: {
          ...validTerms,
          additional_terms: { th: 'ok', martian: 'no' },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when no translation has any non-empty value', async () => {
    const { service } = makeService();
    await expect(
      service.upsert({
        category_id: VALID_CATEGORY_ID,
        banner: { primary_locale: 'th', translations: { th: '   ', en: '' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects translations exceeding the per-locale length cap', async () => {
    const { service } = makeService();
    await expect(
      service.upsert({
        category_id: VALID_CATEGORY_ID,
        banner: {
          primary_locale: 'th',
          translations: { th: 'x'.repeat(50_001) },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a happy-path banner+terms upsert and strips empty translations', async () => {
    const { service, policyModel } = makeService();
    policyModel.lean.mockResolvedValueOnce({
      category_id: VALID_CATEGORY_ID,
      banner: {
        primary_locale: 'th',
        translations: { th: 'แบนเนอร์', en: 'Banner' },
      },
    });
    await service.upsert({
      category_id: VALID_CATEGORY_ID,
      banner: {
        primary_locale: 'th',
        // ja is empty — should be dropped before storage
        translations: { th: 'แบนเนอร์', en: 'Banner', ja: '' },
      },
      terms: validTerms,
    });
    const persistedBanner = (policyModel.findOneAndUpdate as jest.Mock).mock
      .calls[0][1].$set.banner;
    expect(persistedBanner.translations).toEqual({
      th: 'แบนเนอร์',
      en: 'Banner',
    });
    expect(persistedBanner.translations).not.toHaveProperty('ja');
  });
});

describe('PolicyService.findByCategory', () => {
  it('rejects malformed category id with BadRequestException', async () => {
    const { service } = makeService();
    await expect(
      service.findByCategory('not-a-mongo-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PolicyService.remove', () => {
  it('returns deleted=true when a row was removed', async () => {
    const { service, policyModel } = makeService();
    policyModel.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    expect(await service.remove(VALID_CATEGORY_ID)).toEqual({ deleted: true });
  });

  it('returns deleted=false when nothing matched (idempotent)', async () => {
    const { service, policyModel } = makeService();
    policyModel.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
    expect(await service.remove(VALID_CATEGORY_ID)).toEqual({ deleted: false });
  });
});
