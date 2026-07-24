import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

describe('ExploreController', () => {
  it('delegates /explore/shops and /explore/deals to the service', async () => {
    const service = {
      listShops: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      listDeals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    } as unknown as ExploreService;
    const controller = new ExploreController(service);

    await controller.listShops({ shopType: 'mall' });
    await controller.listDeals({ category: 'fashion' });

    expect(service.listShops).toHaveBeenCalledWith({ shopType: 'mall' });
    expect(service.listDeals).toHaveBeenCalledWith({ category: 'fashion' });
  });
});
