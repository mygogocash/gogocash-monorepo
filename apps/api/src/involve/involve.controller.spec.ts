import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { InvolveController } from './involve.controller';
import { InvolveService } from './involve.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import {
  CreateAffiliateDto,
  CreateAffiliateAiDto,
  RequestGetConversion,
} from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { ApiKeyGuard } from 'src/common/api-key.guard';

/**
 * InvolveController is a thin HTTP boundary in front of InvolveService. The
 * behaviour worth pinning is: (1) each route delegates to the right service
 * method with the right arguments, (2) string path params that the service
 * treats as numbers are coerced with `+id`, (3) the authenticated user id is
 * threaded from `req.user.sub` (never trusted from the body/path), and (4) the
 * affiliate-deeplink flow fires its analytics event with the generated link's
 * offer/merchant after the link is produced.
 */
describe('InvolveController', () => {
  let controller: InvolveController;

  // Service collaborators are mocked: the controller owns no DB/network of its
  // own, so a real service would pull in Mongoose + HTTP and make the suite slow
  // and flaky. We assert on how the controller calls them.
  let involveService: {
    findAll: jest.Mock;
    checkOfferDuplicate: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createAffiliate: jest.Mock;
    createAffiliateAi: jest.Mock;
    getConversion: jest.Mock;
    getConversationAllPage: jest.Mock;
  };
  let analytics: { capture: jest.Mock };

  const makeRequest = (
    overrides: Partial<Request> & { user?: unknown } = {},
  ): Request =>
    ({
      headers: {},
      ...overrides,
    }) as unknown as Request;

  beforeEach(async () => {
    involveService = {
      findAll: jest.fn().mockResolvedValue(['offer-1']),
      checkOfferDuplicate: jest.fn().mockResolvedValue({ duplicates: 0 }),
      update: jest.fn().mockReturnValue({ updated: true }),
      remove: jest.fn().mockReturnValue({ removed: true }),
      createAffiliate: jest.fn().mockResolvedValue('https://deeplink.test/abc'),
      createAffiliateAi: jest.fn().mockResolvedValue({ ok: true }),
      getConversion: jest.fn().mockResolvedValue({ page: 1, rows: [] }),
      getConversationAllPage: jest.fn().mockResolvedValue({ total: 0 }),
    };
    analytics = { capture: jest.fn().mockResolvedValue(undefined) };

    // The route guards (AuthAdminGuard / FirebaseAuthGuard) inject JwtService and
    // are not the subject under test — we call the controller methods directly,
    // so stub the guards to keep the test module free of auth/Jwt wiring.
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [InvolveController],
      providers: [
        { provide: InvolveService, useValue: involveService },
        { provide: AnalyticsService, useValue: analytics },
      ],
    })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get<InvolveController>(InvolveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Authorization wiring (V-5 + involve stubs). These routes had NO guard:
  //   - PATCH/DELETE /involve/:id  -> anyone could mutate/delete offer data
  //   - GET /involve/checkOfferDuplicate -> unauthenticated admin utility
  //   - POST /involve/create-affiliate-ai/:email -> deeplink minting +
  //     email-enumeration + affiliate-API cost abuse (V-5)
  // Guards are per-method on this controller (not class-level), so each must be
  // pinned. AuthAdminGuard is the fail-closed default for create-affiliate-ai
  // pending the owner's caller decision (external/AI service may need an
  // API-key guard instead — tracked separately).
  // ---------------------------------------------------------------------------
  describe('authorization wiring (V-5 + involve stubs)', () => {
    const proto = InvolveController.prototype as unknown as Record<
      string,
      unknown
    >;
    const guardsOf = (method: string): unknown[] =>
      (Reflect.getMetadata(
        '__guards__',
        proto[method] as object,
      ) as unknown[]) ?? [];

    for (const method of ['checkOfferDuplicate', 'update', 'remove']) {
      it(`${method} > is protected by AuthAdminGuard (was an unguarded mutation/leak route)`, () => {
        expect(guardsOf(method)).toContain(AuthAdminGuard);
      });
    }

    it('createAffiliateAi > is protected by ApiKeyGuard (external/AI caller, fail-closed)', () => {
      expect(guardsOf('createAffiliateAi')).toContain(ApiKeyGuard);
    });
  });

  describe('findAll', () => {
    it('findAll > given a request > then it delegates to involveService.findAll and returns its result', async () => {
      const result = await controller.findAll();

      expect(involveService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(['offer-1']);
    });
  });

  describe('checkOfferDuplicate', () => {
    it('checkOfferDuplicate > given a request > then it delegates to involveService.checkOfferDuplicate', async () => {
      const result = await controller.checkOfferDuplicate();

      expect(involveService.checkOfferDuplicate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ duplicates: 0 });
    });
  });

  describe('update', () => {
    // The :id path param arrives as a string but the service signature is
    // (id: number, ...). The `+id` coercion is the contract — a regression to a
    // raw string would silently break every downstream numeric lookup.
    it('update > given a string id param > then it coerces to a number before calling the service', () => {
      const dto = { offer_name: 'Renamed' } as unknown as UpdateInvolveDto;

      controller.update('42', dto);

      expect(involveService.update).toHaveBeenCalledTimes(1);
      expect(involveService.update).toHaveBeenCalledWith(42, dto);
      const [passedId] = involveService.update.mock.calls[0];
      expect(typeof passedId).toBe('number');
    });

    it('update > given a non-numeric id > then it passes NaN (documents current coercion behaviour)', () => {
      // `+'abc'` is NaN. The controller does no validation, so this documents the
      // actual current behaviour rather than asserting a guard that does not exist.
      controller.update('abc', {} as UpdateInvolveDto);

      const [passedId] = involveService.update.mock.calls[0];
      expect(Number.isNaN(passedId)).toBe(true);
    });
  });

  describe('remove', () => {
    it('remove > given a string id param > then it coerces to a number before calling the service', () => {
      controller.remove('7');

      expect(involveService.remove).toHaveBeenCalledTimes(1);
      expect(involveService.remove).toHaveBeenCalledWith(7);
      expect(typeof involveService.remove.mock.calls[0][0]).toBe('number');
    });
  });

  describe('createAffiliate', () => {
    const dto: CreateAffiliateDto = {
      offer_id: 100,
      merchant_id: 200,
      deeplink: 'https://store.test/product/1',
    };

    // The user id is server-derived from the verified token (req.user.sub) and
    // passed to the service — it must NOT come from the request body. This is the
    // money-adjacent attribution boundary for affiliate links.
    it('createAffiliate > given an authenticated user > then it passes req.user.sub (not the body) as the owner id', async () => {
      const req = makeRequest({ user: { sub: 'firebase-uid-1' } } as never);

      const result = await controller.createAffiliate(dto, req);

      expect(involveService.createAffiliate).toHaveBeenCalledWith(
        dto,
        'firebase-uid-1',
      );
      expect(result).toBe('https://deeplink.test/abc');
    });

    // After the link is generated, the analytics event must fire with the
    // offer/merchant from the request and the web_app source flow. Attribution
    // breaking silently is a real revenue-reporting bug.
    it('createAffiliate > given a generated deeplink > then it captures affiliate_deeplink_generated with offer/merchant context', async () => {
      const req = makeRequest({ user: { sub: 'firebase-uid-1' } } as never);

      await controller.createAffiliate(dto, req);

      expect(analytics.capture).toHaveBeenCalledTimes(1);
      const [event, context, properties] = analytics.capture.mock.calls[0];
      expect(event).toBe('affiliate_deeplink_generated');
      expect(context).toMatchObject({ userId: 'firebase-uid-1' });
      expect(properties).toEqual({
        offer_id: 100,
        merchant_id: 200,
        source_flow: 'web_app',
      });
    });

    // The analytics event is a side effect, not part of the response contract;
    // it must only fire after the deeplink resolves successfully.
    it('createAffiliate > given the service rejects > then no analytics event is captured', async () => {
      const req = makeRequest({ user: { sub: 'firebase-uid-1' } } as never);
      involveService.createAffiliate.mockRejectedValueOnce(
        new Error('upstream down'),
      );

      await expect(controller.createAffiliate(dto, req)).rejects.toThrow(
        'upstream down',
      );
      expect(analytics.capture).not.toHaveBeenCalled();
    });

    // A missing/anonymous user must not crash the handler; id resolves to
    // undefined and is threaded through unchanged.
    it('createAffiliate > given no user on the request > then it passes an undefined owner id without throwing', async () => {
      const req = makeRequest();

      await controller.createAffiliate(dto, req);

      expect(involveService.createAffiliate).toHaveBeenCalledWith(
        dto,
        undefined,
      );
    });
  });

  describe('createAffiliateAi', () => {
    const dto: CreateAffiliateAiDto = {
      email: 'user@test.com',
      offer_id: 5,
      merchant_id: 6,
    };

    it('createAffiliateAi > given a dto and an email path param > then it forwards both to the service in order', async () => {
      const result = await controller.createAffiliateAi(dto, 'agent@test.com');

      expect(involveService.createAffiliateAi).toHaveBeenCalledWith(
        dto,
        'agent@test.com',
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('getConversion', () => {
    const body: RequestGetConversion = { page: 2, limit: 50 };

    // offer_id (path), pagination body, and the token-derived user id must all be
    // forwarded so conversions are scoped to the requesting user.
    it('getConversion > given offer_id, body, and an authenticated user > then it forwards all three to the service', async () => {
      const req = makeRequest({ user: { sub: 'uid-9' } } as never);

      const result = await controller.getConversion('offer-77', body, req);

      expect(involveService.getConversion).toHaveBeenCalledWith(
        'offer-77',
        body,
        'uid-9',
      );
      expect(result).toEqual({ page: 1, rows: [] });
    });

    it('getConversion > given no user on the request > then the owner id is undefined', async () => {
      const req = makeRequest();

      await controller.getConversion('offer-77', body, req);

      expect(involveService.getConversion).toHaveBeenCalledWith(
        'offer-77',
        body,
        undefined,
      );
    });
  });

  describe('getConversionAll', () => {
    const body: RequestGetConversion = { page: 1, limit: 20 };

    it('getConversionAll > given a body and authenticated user > then it delegates to getConversationAllPage with the user id', async () => {
      const req = makeRequest({ user: { sub: 'uid-3' } } as never);

      const result = await controller.getConversionAll(body, req);

      expect(involveService.getConversationAllPage).toHaveBeenCalledWith(
        body,
        'uid-3',
      );
      expect(result).toEqual({ total: 0 });
    });
  });
});
