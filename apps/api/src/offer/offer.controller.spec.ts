import type { Request } from 'express';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';
import {
  GetMissingOrderDto,
  GetMyOfferDto,
  SaveMissingOrderDto,
} from './dto/create-offer.dto';
import { UpdateCouponDto } from './dto/update-offer.dto';

/**
 * OfferController is a thin HTTP delegation layer over OfferService. The
 * behavior that matters here — and is NOT exercised by the service's own
 * tests — is:
 *   - query-string parsing / defaulting for the paginated GET endpoints,
 *   - the admin endpoint forwarding `admin=true` plus the curation filters,
 *   - auth-gated endpoints extracting the caller id from `request.user.sub`,
 *   - the write-json endpoint unwrapping `.data` before re-delegating.
 *
 * Every OfferService method is mocked; no Mongoose, network, or filesystem is
 * touched, and the guards/interceptors are bypassed by instantiating the
 * controller directly (they never run on a hand-built instance).
 */

type OfferServiceMock = {
  [K in keyof OfferService]: OfferService[K] extends (
    ...args: never[]
  ) => unknown
    ? jest.Mock
    : OfferService[K];
};

function createOfferServiceMock(): OfferServiceMock {
  return {
    getOfferExtraPoint: jest.fn().mockResolvedValue({ point: 1 }),
    getBannerHome: jest.fn().mockResolvedValue({ banner: 'home' }),
    getAllBrandBanner: jest.fn().mockResolvedValue({ banner: 'all-brand' }),
    getDisplayTopBrands: jest.fn().mockResolvedValue({ data: [] }),
    createAdminOffer: jest.fn().mockResolvedValue({ _id: 'offer-new' }),
    getCoupon: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    getCouponId: jest.fn().mockResolvedValue({ _id: 'coupon-1' }),
    updateCoupon: jest.fn().mockResolvedValue({ updated: true }),
    findAll: jest.fn().mockResolvedValue({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      data: [],
    }),
    findAllExtra: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ _id: 'offer-1' }),
    getCategoryList: jest.fn().mockResolvedValue([]),
    findMyOffer: jest.fn().mockResolvedValue([]),
    writeJJsonToFile: jest.fn().mockResolvedValue({ written: true }),
    favoriteOfferByUser: jest.fn().mockResolvedValue({ favorited: true }),
    getFavoriteOfferByUser: jest.fn().mockResolvedValue({ data: [] }),
    saveMissingOrder: jest.fn().mockResolvedValue({ saved: true }),
    getMissingOrder: jest.fn().mockResolvedValue({ data: [] }),
  } as unknown as OfferServiceMock;
}

/**
 * Build a minimal Express-like Request whose `query` is what the controller
 * reads for the unauthenticated paginated endpoints.
 */
function makeRequest(query: Record<string, unknown> = {}): Request {
  return { query } as unknown as Request;
}

/**
 * Build an authenticated request: the controller reads `request.user.sub`.
 */
function makeAuthRequest(sub: string, query: Record<string, unknown> = {}) {
  return { user: { sub }, query } as unknown as Request & {
    user: { sub: string };
  };
}

describe('OfferController', () => {
  let controller: OfferController;
  let service: OfferServiceMock;

  beforeEach(() => {
    // Instantiate the real controller directly against a mocked service.
    // Guards/interceptors are metadata-only and never run on a hand-built
    // instance, so we avoid pulling JwtService/Reflector/Firebase into the test.
    service = createOfferServiceMock();
    controller = new OfferController(service as unknown as OfferService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOfferExtraPoint', () => {
    it('getOfferExtraPoint > given a request > then delegates to OfferService.getOfferExtraPoint and returns its result', async () => {
      await expect(controller.getOfferExtraPoint()).resolves.toEqual({
        point: 1,
      });
      expect(service.getOfferExtraPoint).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBannerHome', () => {
    it('getBannerHome > given a request > then delegates to OfferService.getBannerHome', async () => {
      await expect(controller.getBannerHome()).resolves.toEqual({
        banner: 'home',
      });
      expect(service.getBannerHome).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllBrandBanner', () => {
    it('getAllBrandBanner > then delegates to the separate banner service', async () => {
      await expect(controller.getAllBrandBanner()).resolves.toEqual({
        banner: 'all-brand',
      });
      expect(service.getAllBrandBanner).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTopBrands', () => {
    it('getTopBrands > given a request > then delegates to OfferService.getDisplayTopBrands', async () => {
      await expect(controller.getTopBrands()).resolves.toEqual({ data: [] });
      expect(service.getDisplayTopBrands).toHaveBeenCalledTimes(1);
    });
  });

  describe('createOffer', () => {
    it('createOffer > given multipart body and files > then delegates to OfferService.createAdminOffer', async () => {
      const body = {
        brand_name: 'Orbit Airways',
        affiliate_tracking_link: 'https://track.example/orbit',
      };
      const logo = { originalname: 'logo.png' } as Express.Multer.File;

      await expect(
        controller.createOffer(body, { logo_desktop: [logo] }),
      ).resolves.toEqual({ _id: 'offer-new' });
      expect(service.createAdminOffer).toHaveBeenCalledWith(body, {
        logo_desktop: [logo],
      });
    });
  });

  describe('getCoupon', () => {
    // Admin coupon listing forwards pagination + search verbatim; getting the
    // argument order wrong silently corrupts admin pagination.
    it('getCoupon > given page/limit/search > then forwards them positionally to OfferService.getCoupon', async () => {
      await controller.getCoupon(makeRequest(), 3, 25, 'nike');

      expect(service.getCoupon).toHaveBeenCalledTimes(1);
      expect(service.getCoupon).toHaveBeenCalledWith(3, 25, 'nike');
    });
  });

  describe('getCouponId', () => {
    it('getCouponId > given an offerId path param > then forwards it to OfferService.getCouponId', async () => {
      await controller.getCouponId(makeRequest(), 'offer-42');

      expect(service.getCouponId).toHaveBeenCalledWith('offer-42');
    });
  });

  describe('updateCoupon', () => {
    // The coupon body is forwarded as-is; this is a money/eligibility write so
    // the payload must reach the service unmodified.
    it('updateCoupon > given a coupon body > then forwards the whole body to OfferService.updateCoupon', async () => {
      const body = {
        id: 'coupon-1',
        name: 'Summer',
        code: 'SUMMER10',
        discount: 10,
        quantity: 100,
      } as unknown as UpdateCouponDto;

      await controller.updateCoupon(makeRequest(), body);

      expect(service.updateCoupon).toHaveBeenCalledTimes(1);
      expect(service.updateCoupon).toHaveBeenCalledWith(body);
    });
  });

  describe('findAll', () => {
    // The public listing endpoint must NOT pass admin=true; that flag is what
    // unhides pending/rejected offers, so a regression here would leak
    // unapproved offers to the customer app.
    it('findAll > given an empty query > then applies default page/limit and never requests admin data', () => {
      controller.findAll(makeRequest({}));

      expect(service.findAll).toHaveBeenCalledTimes(1);
      // page=1, limit=10, search='', category='', country=''
      expect(service.findAll).toHaveBeenCalledWith(1, 10, '', '', '');
    });

    it('findAll > given string query params > then casts page/limit to numbers and passes search/category/country', () => {
      controller.findAll(
        makeRequest({
          page: '4',
          limit: '50',
          search: 'shoes',
          category: 'fashion',
          country: 'Thailand',
        }),
      );

      expect(service.findAll).toHaveBeenCalledWith(
        4,
        50,
        'shoes',
        'fashion',
        'Thailand',
      );
    });
  });

  describe('findAllExtra', () => {
    it('findAllExtra > given a request > then delegates to OfferService.findAllExtra', async () => {
      await expect(controller.findAllExtra()).resolves.toEqual([]);
      expect(service.findAllExtra).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllAdmin', () => {
    // Admin listing must forward admin=true AND the curation filters in the
    // 7th positional slot — this is the boundary that lets admins see
    // pending_review / rejected / per-source offers.
    it('findAllAdmin > given empty query > then forwards defaults, admin=true, and empty (undefined) curation filters', () => {
      controller.findAllAdmin(makeRequest({}));

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(1, 10, '', '', '', true, {
        status: undefined,
        source: undefined,
      });
    });

    it('findAllAdmin > given status and source filters > then forwards them inside the curation-filter object', () => {
      controller.findAllAdmin(
        makeRequest({
          page: '2',
          limit: '20',
          search: 'q',
          category: 'cat',
          country: 'TH',
          status: 'pending_review',
          source: 'involve',
        }),
      );

      expect(service.findAll).toHaveBeenCalledWith(
        2,
        20,
        'q',
        'cat',
        'TH',
        true,
        {
          status: 'pending_review',
          source: 'involve',
        },
      );
    });
  });

  describe('findOne', () => {
    it('findOne > given an id path param > then forwards it to OfferService.findOne', async () => {
      await controller.findOne('offer-7');

      expect(service.findOne).toHaveBeenCalledWith('offer-7');
    });
  });

  describe('getCategoryList', () => {
    it('getCategoryList > given a search query > then forwards the search term', () => {
      controller.getCategoryList(makeRequest({ search: 'beauty' }));

      expect(service.getCategoryList).toHaveBeenCalledWith('beauty');
    });

    it('getCategoryList > given no search query > then forwards an empty string', () => {
      controller.getCategoryList(makeRequest({}));

      expect(service.getCategoryList).toHaveBeenCalledWith('');
    });
  });

  describe('myOffers', () => {
    // Auth-gated: the offer list must be scoped to the authenticated caller's
    // id (request.user.sub), never to a client-supplied id.
    it('myOffers > given an authenticated user > then scopes the query to request.user.sub', () => {
      const body = { page: 1, limit: 10 } as GetMyOfferDto;

      controller.myOffers(makeAuthRequest('user-123'), body);

      expect(service.findMyOffer).toHaveBeenCalledTimes(1);
      expect(service.findMyOffer).toHaveBeenCalledWith('user-123', body);
    });
  });

  describe('writeJJsonToFile', () => {
    // The export endpoint first pulls a large page of offers, then hands ONLY
    // the `.data` array to the writer. Passing the whole envelope instead would
    // write malformed output.
    it('writeJJsonToFile > given offers fetched > then writes only the data array (not the envelope)', async () => {
      const offers = [{ _id: 'a' }, { _id: 'b' }];
      service.findAll.mockResolvedValueOnce({
        page: 1,
        limit: 1000,
        total: 2,
        totalPages: 1,
        data: offers,
      });

      await controller.writeJJsonToFile();

      expect(service.findAll).toHaveBeenCalledWith(1, 1000, '', '');
      expect(service.writeJJsonToFile).toHaveBeenCalledTimes(1);
      expect(service.writeJJsonToFile).toHaveBeenCalledWith(offers);
    });
  });

  describe('favoriteOffer', () => {
    // Favoriting writes a row keyed by the caller; it must use the
    // authenticated id, not anything from the body/query.
    it('favoriteOffer > given an authenticated user and offerId > then toggles favorite for request.user.sub', async () => {
      await controller.favoriteOffer(makeAuthRequest('user-9'), 'offer-55');

      expect(service.favoriteOfferByUser).toHaveBeenCalledTimes(1);
      expect(service.favoriteOfferByUser).toHaveBeenCalledWith(
        'user-9',
        'offer-55',
      );
    });
  });

  describe('getFavoriteOffer', () => {
    it('getFavoriteOffer > given page/limit path params > then forwards user id with pagination', async () => {
      await controller.getFavoriteOffer(makeAuthRequest('user-3'), 2, 15);

      expect(service.getFavoriteOfferByUser).toHaveBeenCalledWith(
        'user-3',
        2,
        15,
      );
    });
  });

  describe('saveMissingOrder', () => {
    // Missing-order claims are user-submitted disputes with file uploads. The
    // claim must be attributed to the authenticated caller, and the uploaded
    // files must be forwarded for storage.
    it('saveMissingOrder > given body and uploaded files > then forwards caller id, body, and files', async () => {
      const body = {
        offer_id: 'offer-1',
        orderId: 'ORD-1',
        purchaseDate: '2026-06-01',
        note: 'missing cashback',
        amount: '199',
      } as SaveMissingOrderDto;
      const files = [
        { originalname: 'receipt.png' },
      ] as unknown as Express.Multer.File[];

      await controller.saveMissingOrder(
        makeAuthRequest('user-77'),
        body,
        files,
      );

      expect(service.saveMissingOrder).toHaveBeenCalledTimes(1);
      expect(service.saveMissingOrder).toHaveBeenCalledWith(
        'user-77',
        body,
        files,
      );
    });
  });

  describe('getMissingOrder', () => {
    // This endpoint destructures pagination out of the BODY (not the query) and
    // scopes results to the authenticated caller.
    it('getMissingOrder > given a body with pagination > then forwards page/limit/search plus the caller id', async () => {
      const body = {
        page: 2,
        limit: 5,
        search: 'pending',
      } as GetMissingOrderDto;

      await controller.getMissingOrder(makeAuthRequest('user-11'), body);

      expect(service.getMissingOrder).toHaveBeenCalledTimes(1);
      expect(service.getMissingOrder).toHaveBeenCalledWith(
        2,
        5,
        'pending',
        'user-11',
      );
    });
  });
});
