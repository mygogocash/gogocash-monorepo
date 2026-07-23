import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BrandService } from './brand.service';

function makeLeanQuery<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
    session: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
}

describe('BrandService', () => {
  let service: BrandService;
  let brandModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    countDocuments: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let offerModel: {
    find: jest.Mock;
    updateMany: jest.Mock;
  };
  let categoryIntegrity: {
    withNormalWrite: jest.Mock;
    withIntegrityMutation: jest.Mock;
  };
  let mediaRegistry: { touchAttachInSession: jest.Mock };

  beforeEach(() => {
    brandModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    offerModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
    };
    categoryIntegrity = {
      withNormalWrite: jest.fn(({ enforced }) => enforced()),
      withIntegrityMutation: jest.fn((writer) => writer({ id: 'session' })),
    };
    mediaRegistry = {
      touchAttachInSession: jest.fn().mockResolvedValue({ tracked: false }),
    };
    service = new BrandService(
      brandModel as never,
      offerModel as never,
      categoryIntegrity as never,
      mediaRegistry as never,
    );
  });

  describe('create', () => {
    it('create > given a duplicate slug > then it rejects instead of creating a second brand', async () => {
      brandModel.findOne.mockReturnValue(makeLeanQuery({ _id: 'existing' }));

      await expect(
        service.create({ brand_name: 'Klook', brand_slug: 'klook' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(brandModel.create).not.toHaveBeenCalled();
    });

    it('create > given a global brand without a default country > then it rejects ambiguous routing', async () => {
      brandModel.findOne.mockReturnValue(makeLeanQuery(null));

      await expect(
        service.create({ brand_name: 'Klook', is_global: true } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create > before activation > then it preserves the standalone legacy write', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      brandModel.findOne.mockReturnValue(makeLeanQuery(null));
      brandModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        brand_name: 'Klook',
        brand_slug: 'klook',
      });

      await service.create({
        brand_name: 'Klook',
        logo: 'https://legacy.example/logo.png',
      } as never);

      expect(brandModel.create).toHaveBeenCalledWith({
        brand_name: 'Klook',
        brand_slug: 'klook',
        logo: 'https://legacy.example/logo.png',
      });
      expect(categoryIntegrity.withIntegrityMutation).not.toHaveBeenCalled();
      expect(mediaRegistry.touchAttachInSession).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('update > before activation > then it preserves the standalone legacy writes', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      const brandId = new Types.ObjectId();
      const updated = { _id: brandId, brand_name: 'Klook', is_global: true };
      brandModel.findByIdAndUpdate.mockResolvedValue(updated);
      offerModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await expect(
        service.update(String(brandId), {
          is_global: true,
          default_country: 'TH',
        } as never),
      ).resolves.toEqual(updated);

      expect(brandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        brandId,
        expect.any(Object),
        { new: true, runValidators: true },
      );
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { brand_id: brandId },
        { $set: { is_global: true, default_country: 'TH' } },
      );
      expect(categoryIntegrity.withIntegrityMutation).not.toHaveBeenCalled();
      expect(mediaRegistry.touchAttachInSession).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('softDelete > before activation > preserves the standalone legacy writes', async () => {
      categoryIntegrity.withNormalWrite.mockImplementation(({ legacy }) =>
        legacy(),
      );
      const brandId = new Types.ObjectId();
      const save = jest.fn().mockResolvedValue(undefined);
      brandModel.findById.mockResolvedValue({ _id: brandId, save });
      offerModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await expect(service.softDelete(String(brandId))).resolves.toEqual({
        id: String(brandId),
        disabled: true,
      });

      expect(save).toHaveBeenCalledWith();
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { brand_id: brandId },
        { $set: { disabled: true } },
      );
      expect(categoryIntegrity.withIntegrityMutation).not.toHaveBeenCalled();
    });

    it('softDelete > ready v2 > disables the brand and variants in one fenced transaction', async () => {
      const brandId = new Types.ObjectId();
      const session = { id: 'integrity-session' };
      categoryIntegrity.withIntegrityMutation.mockImplementation((writer) =>
        writer(session),
      );
      brandModel.findByIdAndUpdate.mockResolvedValue({ _id: brandId });
      offerModel.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await expect(service.softDelete(String(brandId))).resolves.toEqual({
        id: String(brandId),
        disabled: true,
      });

      expect(brandModel.findByIdAndUpdate).toHaveBeenCalledWith(
        brandId,
        { $set: { disabled: true } },
        { new: true, session },
      );
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { brand_id: brandId },
        { $set: { disabled: true } },
        { session },
      );
    });

    it('softDelete > applying marker > blocks before any brand or offer write', async () => {
      categoryIntegrity.withNormalWrite.mockRejectedValue(
        new Error('integrity migration applying'),
      );

      await expect(
        service.softDelete(String(new Types.ObjectId())),
      ).rejects.toThrow('integrity migration applying');

      expect(brandModel.findById).not.toHaveBeenCalled();
      expect(brandModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(offerModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('list > given regex metacharacters in search > then brand_name filter escapes literals', async () => {
      const brandQuery = makeLeanQuery([]);
      brandModel.find.mockReturnValue(brandQuery);
      brandModel.countDocuments.mockResolvedValue(0);
      offerModel.find.mockReturnValue(makeLeanQuery([]));

      await service.list({ search: 'a.*', page: 1, limit: 20 } as never);

      expect(brandModel.find).toHaveBeenCalledWith({
        disabled: false,
        brand_name: { $regex: 'a\\.\\*', $options: 'i' },
      });
    });

    it('list > given regex metacharacters in country > then countries filter escapes literals', async () => {
      const brandId = new Types.ObjectId();
      const brandQuery = makeLeanQuery([
        { _id: brandId, brand_name: 'Klook', disabled: false },
      ]);
      brandModel.find.mockReturnValue(brandQuery);
      brandModel.countDocuments.mockResolvedValue(1);
      offerModel.find.mockReturnValue(makeLeanQuery([]));

      await service.list({ country: 'TH(+', page: 1, limit: 20 } as never);

      const variantFilter = offerModel.find.mock.calls[0][0];
      const regex = new RegExp(
        variantFilter.countries.$regex,
        variantFilter.countries.$options,
      );
      expect(regex.test('TH(+')).toBe(true);
      expect(regex.test('Thailand')).toBe(false);
    });

    it('list > given the ISO-2 country the app sends > then variant filter matches full country names', async () => {
      // Field bug 2026-07-10: same ISO-2 vs full-name mismatch as GET /offer —
      // country=MY matched no Involve variants ("Malaysia" has no "my" substring).
      const brandId = new Types.ObjectId();
      brandModel.find.mockReturnValue(
        makeLeanQuery([{ _id: brandId, brand_name: 'Klook', disabled: false }]),
      );
      brandModel.countDocuments.mockResolvedValue(1);
      offerModel.find.mockReturnValue(makeLeanQuery([]));

      await service.list({ country: 'MY', page: 1, limit: 20 } as never);

      const variantFilter = offerModel.find.mock.calls[0][0];
      const regex = new RegExp(
        variantFilter.countries.$regex,
        variantFilter.countries.$options,
      );
      expect(regex.test('Australia, Malaysia, Singapore, Thailand')).toBe(true);
      expect(regex.test('Thailand')).toBe(false);
      expect(regex.test('Myanmar')).toBe(false);
    });

    it('list > given a whitespace-only country > then no country mode applies (no filter, real totals)', async () => {
      // Review find 2026-07-10: the variant filter is gated on
      // countryFilterRegex (null for blank input) but the zero-variant drop
      // and totals were still gated on raw dto.country truthiness — a
      // country=%20 request skipped the filter yet reported page-local totals.
      const brandId = new Types.ObjectId();
      brandModel.find.mockReturnValue(
        makeLeanQuery([{ _id: brandId, brand_name: 'Klook', disabled: false }]),
      );
      brandModel.countDocuments.mockResolvedValue(5);
      offerModel.find.mockReturnValue(makeLeanQuery([]));

      const result = await service.list({
        country: '  ',
        page: 1,
        limit: 20,
      } as never);

      const variantFilter = offerModel.find.mock.calls[0][0];
      expect(variantFilter.countries).toBeUndefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });

  describe('resolveVariant', () => {
    it('resolveVariant > given a variant stored under the comma-containing "Korea, Republic of" spelling > then country=KR still matches it', async () => {
      // Review find 2026-07-10: the token matcher split the stored countries
      // on ',' so LABEL_TO_ISO2's own 'korea, republic of' expansion could
      // never match — the list regex matched it but resolveVariant fell
      // through to the first variant. Both paths must share one matcher.
      const brandId = new Types.ObjectId();
      brandModel.findOne.mockReturnValue(
        makeLeanQuery({
          _id: brandId,
          brand_name: 'KFood',
          brand_slug: 'kfood',
          disabled: false,
        }),
      );
      const sgVariant = {
        _id: new Types.ObjectId(),
        brand_id: brandId,
        countries: 'Singapore',
        disabled: false,
        status: 'approved',
      };
      const krVariant = {
        _id: new Types.ObjectId(),
        brand_id: brandId,
        countries: 'Korea, Republic of',
        disabled: false,
        status: 'approved',
      };
      offerModel.find.mockReturnValue(makeLeanQuery([sgVariant, krVariant]));

      const resolved = await service.resolveVariant('kfood', 'KR');

      expect(resolved.variant._id).toEqual(krVariant._id);
    });

    it('resolveVariant > given the ISO-2 country the app sends > then picks the matching full-name variant, not the fallback', async () => {
      // Field bug 2026-07-10: variant selection compared the raw request
      // country against lowercased full-name tokens, so `country=TH` never
      // matched "Thailand" and silently fell through to the first variant.
      const brandId = new Types.ObjectId();
      brandModel.findOne.mockReturnValue(
        makeLeanQuery({
          _id: brandId,
          brand_name: 'Expedia',
          brand_slug: 'expedia',
          disabled: false,
        }),
      );
      const sgVariant = {
        _id: new Types.ObjectId(),
        brand_id: brandId,
        countries: 'Singapore',
        disabled: false,
        status: 'approved',
      };
      const thVariant = {
        _id: new Types.ObjectId(),
        brand_id: brandId,
        countries: 'Australia, Malaysia, Thailand',
        disabled: false,
        status: 'approved',
      };
      offerModel.find.mockReturnValue(makeLeanQuery([sgVariant, thVariant]));

      const resolved = await service.resolveVariant('expedia', 'TH');

      expect(resolved.variant._id).toEqual(thVariant._id);
    });

    it('resolveVariant > given an ISO-2 default_country on the brand > then the default fallback still matches full-name variants', async () => {
      const brandId = new Types.ObjectId();
      brandModel.findOne.mockReturnValue(
        makeLeanQuery({
          _id: brandId,
          brand_name: 'Expedia',
          brand_slug: 'expedia',
          default_country: 'TH',
          disabled: false,
        }),
      );
      const sgVariant = {
        _id: new Types.ObjectId(),
        brand_id: brandId,
        countries: 'Singapore',
        disabled: false,
        status: 'approved',
      };
      const thVariant = {
        _id: new Types.ObjectId(),
        brand_id: brandId,
        countries: 'Thailand',
        disabled: false,
        status: 'approved',
      };
      offerModel.find.mockReturnValue(makeLeanQuery([sgVariant, thVariant]));

      const resolved = await service.resolveVariant('expedia', null);

      expect(resolved.variant._id).toEqual(thVariant._id);
    });

    it('resolveVariant > given pending and rejected variants > then it queries only active approved variants', async () => {
      const brandId = new Types.ObjectId();
      brandModel.findOne.mockReturnValue(
        makeLeanQuery({
          _id: brandId,
          brand_name: 'Klook',
          brand_slug: 'klook',
          disabled: false,
        }),
      );
      offerModel.find.mockReturnValue(
        makeLeanQuery([
          {
            _id: new Types.ObjectId(),
            brand_id: brandId,
            countries: 'Thailand',
            disabled: false,
            status: 'approved',
          },
        ]),
      );

      await service.resolveVariant('klook', 'Thailand');

      expect(offerModel.find).toHaveBeenCalledWith({
        brand_id: brandId,
        disabled: false,
        status: { $nin: ['pending_review', 'rejected'] },
      });
    });
  });
});
