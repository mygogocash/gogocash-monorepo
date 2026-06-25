import { CatalogService } from './catalog.service';

describe('CatalogService search hardening', () => {
  it('uses escaped literal regex for published product search', async () => {
    const productModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    const service = new CatalogService({} as never, productModel, {} as never);

    await service.listPublishedProducts({ search: '(a+)+b' });

    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        title: { $regex: '\\(a\\+\\)\\+b', $options: 'i' },
      }),
    );
  });
});
