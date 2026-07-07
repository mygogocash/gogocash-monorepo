import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BrandService } from './brand.service';

function makeLeanQuery<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
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
    service = new BrandService(brandModel as never, offerModel as never);
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

      expect(offerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          countries: { $regex: 'TH\\(\\+', $options: 'i' },
        }),
      );
    });
  });

  describe('resolveVariant', () => {
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
