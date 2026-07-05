import { Request } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserAdminService } from './user-admin/user-admin-service';
import { AdminInviteService } from './admin-invite.service';

/**
 * AdminController is a thin delegation layer over three injected services. The
 * behaviour worth pinning is NOT "does it call a method" for its own sake, but
 * the argument transformation it performs before delegating — money-field
 * coercion (commission_store/max_cap), string->bool flags, multipart file
 * unwrapping, query-param Number() defaults, and deriving the acting admin id
 * from the authenticated request. Those are the places a regression silently
 * corrupts data or attributes an action to the wrong admin.
 *
 * We instantiate the REAL controller against fully-mocked services (no Nest DI,
 * no guards, no DB/network), so the suite runs in milliseconds with zero open
 * handles.
 */
describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<Pick<AdminService, never>> &
    Record<string, jest.Mock>;
  let userAdminService: Record<string, jest.Mock>;
  let adminInviteService: Record<string, jest.Mock>;

  const RETURN = Symbol('service-return');

  beforeEach(() => {
    // Every service method returns the same sentinel so we can assert the
    // controller passes the result straight through without reshaping it.
    const stub = () => jest.fn().mockReturnValue(RETURN);

    adminService = {
      getCreatedConversions: stub(),
      getTopBrands: stub(),
      saveTopBrands: stub(),
      create: stub(),
      getWithdrawAll: stub(),
      getConversionAll: stub(),
      getConversionInWithdraw: stub(),
      getFeeRate: stub(),
      updateFeeRate: stub(),
      updateRequestWithdraw: stub(),
      update: stub(),
      remove: stub(),
      findAll: stub(),
      updateOffer: stub(),
      approveOffer: stub(),
      rejectOffer: stub(),
      updateCategory: stub(),
      updateUser: stub(),
      getMyCashBackUser: stub(),
      updateBannerHome: stub(),
      getBannerHome: stub(),
      updateConversionDataByConversionId: stub(),
      getDeepLinkList: stub(),
    };

    userAdminService = {
      login: stub(),
      register: stub(),
      findById: stub(),
    };

    adminInviteService = {
      invite: stub(),
      acceptInvite: stub(),
      forgotPassword: stub(),
      resetPassword: stub(),
    };

    controller = new AdminController(
      adminService as unknown as AdminService,
      userAdminService as unknown as UserAdminService,
      adminInviteService as unknown as AdminInviteService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── Auth / invite delegation ───────────────────────────────────────────

  describe('login', () => {
    it('login > given credentials > then it delegates to UserAdminService.login and returns its result', () => {
      const dto = { email: 'admin@gogocash.co', password: 'secret' };
      const result = controller.login(dto as never);

      expect(userAdminService.login).toHaveBeenCalledWith(dto);
      expect(result).toBe(RETURN);
    });
  });

  describe('invite', () => {
    // The invite route is the privilege-escalation seam: the controller must
    // forward exactly the email + role the (already superadmin-gated) caller
    // supplied, not a reshaped or defaulted value.
    it('invite > given an email and role > then it forwards both to AdminInviteService.invite', () => {
      controller.invite({ email: 'new@gogocash.co', role: 'support' } as never);

      expect(adminInviteService.invite).toHaveBeenCalledWith(
        'new@gogocash.co',
        'support',
      );
    });
  });

  describe('acceptInvite', () => {
    it('acceptInvite > given an accept-invite body > then it passes the whole body through', () => {
      const body = {
        token: 't',
        email: 'a@gogocash.co',
        password: 'longenough',
      };
      controller.acceptInvite(body as never);

      expect(adminInviteService.acceptInvite).toHaveBeenCalledWith(body);
    });
  });

  describe('forgotPassword', () => {
    it('forgotPassword > given an email > then it forwards only the email', () => {
      controller.forgotPassword({ email: 'a@gogocash.co' } as never);

      expect(adminInviteService.forgotPassword).toHaveBeenCalledWith(
        'a@gogocash.co',
      );
    });
  });

  describe('resetPassword', () => {
    it('resetPassword > given a reset body > then it passes the whole body through', () => {
      const body = {
        token: 't',
        email: 'a@gogocash.co',
        password: 'longenough',
      };
      controller.resetPassword(body as never);

      expect(adminInviteService.resetPassword).toHaveBeenCalledWith(body);
    });
  });

  describe('getProfile', () => {
    // The profile endpoint must resolve the admin from the *authenticated*
    // token subject, never from a client-supplied id.
    it('getProfile > given an authenticated request > then it looks up by the token subject (req.user.sub)', () => {
      const req = { user: { sub: 'admin-123' } } as unknown as Request;
      controller.getProfile(req);

      expect(userAdminService.findById).toHaveBeenCalledWith('admin-123');
    });

    it('getProfile > given a request with no user > then it looks up with undefined (no crash)', () => {
      const req = {} as unknown as Request;
      controller.getProfile(req);

      expect(userAdminService.findById).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getRoles', () => {
    it('getRoles > given an authenticated admin > then it returns built-in admin role metadata', () => {
      const result = controller.getRoles();

      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'super_admin',
            label: 'Super Admin',
            system: true,
          }),
          expect.objectContaining({
            id: 'viewer',
            label: 'Viewer',
            system: true,
          }),
        ]),
      );
    });
  });

  describe('register', () => {
    it('register > given a register dto > then it delegates to UserAdminService.register', () => {
      const dto = { email: 'x@gogocash.co' };
      controller.register(dto as never);

      expect(userAdminService.register).toHaveBeenCalledWith(dto);
    });
  });

  // ─── Query-param coercion ───────────────────────────────────────────────

  describe('getCreatedConversions', () => {
    it('getCreatedConversions > given numeric limit/page > then they are coerced via Number()', () => {
      controller.getCreatedConversions(25 as never, 3 as never);

      expect(adminService.getCreatedConversions).toHaveBeenCalledWith(25, 3);
    });

    // Pagination params arrive as raw query strings; bad/empty input must fall
    // back to safe defaults (10 per page, page 1) rather than NaN.
    it('getCreatedConversions > given missing params > then it defaults to limit 10, page 1', () => {
      controller.getCreatedConversions();

      expect(adminService.getCreatedConversions).toHaveBeenCalledWith(10, 1);
    });

    it('getCreatedConversions > given a non-numeric limit string > then NaN falls back to the default', () => {
      controller.getCreatedConversions('abc' as never, '0' as never);

      // Number('abc') -> NaN -> || 10; Number('0') -> 0 -> || 1
      expect(adminService.getCreatedConversions).toHaveBeenCalledWith(10, 1);
    });
  });

  describe('getConversionAll', () => {
    // Guards the argument ORDER, which differs from the query-param order: the
    // service signature is (page, limit, search, key, status) but the query is
    // declared (page, limit, search, status, key). A re-ordering regression here
    // would silently filter by the wrong field.
    it('getConversionAll > given all query params > then page/limit are numeric and key/status are passed in service order', () => {
      controller.getConversionAll('2', '50', 'nike', 'approved', 'mykey');

      expect(adminService.getConversionAll).toHaveBeenCalledWith(
        2,
        50,
        'nike',
        'mykey',
        'approved',
      );
    });
  });

  describe('withdrawAll', () => {
    // The query is declared (limit, page, search) but the service expects
    // (page, limit, search) — the controller swaps the first two. This pins
    // that order so a regression doesn't paginate by the wrong axis.
    it('withdrawAll > given (limit, page, search) > then getWithdrawAll receives (page, limit, search)', () => {
      controller.withdrawAll(20 as never, 2 as never, 'term');

      expect(adminService.getWithdrawAll).toHaveBeenCalledWith(2, 20, 'term');
    });
  });

  describe('findAll', () => {
    it('findAll > given pagination/search > then it forwards page, limit, search to the service', () => {
      controller.findAll(10 as never, 1 as never, 'q');

      expect(adminService.findAll).toHaveBeenCalledWith(1, 10, 'q');
    });
  });

  describe('getConversionInWithdraw', () => {
    it('getConversionInWithdraw > given a { data } envelope > then it unwraps the id array', () => {
      controller.getConversionInWithdraw({ data: [1, 2, 3] });

      expect(adminService.getConversionInWithdraw).toHaveBeenCalledWith([
        1, 2, 3,
      ]);
    });
  });

  // ─── Fee rate (money config) ────────────────────────────────────────────

  describe('updateFeeRate', () => {
    // Fee-rate is money config; the controller must pass the dto + the path id
    // (in that order) so the right fee document is updated.
    it('updateFeeRate > given an id and dto > then it forwards (dto, id)', () => {
      const dto = { system: 5, store: 2 };
      controller.updateFeeRate('fee-1', dto as never);

      expect(adminService.updateFeeRate).toHaveBeenCalledWith(dto, 'fee-1');
    });
  });

  describe('saveTopBrands', () => {
    it('saveTopBrands > given a brands array > then it unwraps body.brands', () => {
      const brands = [{ offerId: 'offer-1', cashback: '5%' }];
      controller.saveTopBrands({ brands });

      expect(adminService.saveTopBrands).toHaveBeenCalledWith(brands);
    });
  });

  // ─── Admin record management ────────────────────────────────────────────

  describe('update', () => {
    it('update > given id and dto > then it forwards (id, dto)', () => {
      const dto = { role: 'viewer' };
      controller.update('admin-9', dto as never);

      expect(adminService.update).toHaveBeenCalledWith('admin-9', dto);
    });
  });

  describe('remove', () => {
    it('remove > given an id > then it forwards the id', () => {
      controller.remove('admin-9');

      expect(adminService.remove).toHaveBeenCalledWith('admin-9');
    });
  });

  describe('updateUser', () => {
    it('updateUser > given an id and dto > then it forwards id and the mobile field only', () => {
      controller.updateUser('user-7', { mobile: '0812345678' } as never);

      expect(adminService.updateUser).toHaveBeenCalledWith(
        'user-7',
        '0812345678',
      );
    });
  });

  // ─── updateOffer: the high-value transformation logic ───────────────────

  describe('updateOffer', () => {
    // commission_store and max_cap are cashback economics. The controller only
    // forwards them when the multipart value is a real value ("undefined" is a
    // sentinel the multipart layer can send). Missing fields must remain
    // undefined so partial saves preserve the existing economics.
    it('updateOffer > given real commission_store/max_cap > then they are forwarded as-is', () => {
      controller.updateOffer(
        'offer-1',
        {
          commission_store: 12 as never,
          max_cap: 500 as never,
          offer_name_display: 'Nike',
        } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(adminService.updateOffer.mock.calls[0][0]).toBe('offer-1');
      expect(arg.commission_store).toBe(12);
      expect(arg.max_cap).toBe(500);
    });

    it('updateOffer > given the literal "undefined" string for money fields > then they are omitted', () => {
      controller.updateOffer(
        'offer-1',
        {
          commission_store: 'undefined' as never,
          max_cap: 'undefined' as never,
        } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.commission_store).toBeUndefined();
      expect(arg.max_cap).toBeUndefined();
    });

    it('updateOffer > given missing money fields > then they stay undefined (no accidental overwrite)', () => {
      controller.updateOffer('offer-1', {} as never, {});

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.commission_store).toBeUndefined();
      expect(arg.max_cap).toBeUndefined();
    });

    it('updateOffer > given zero commission_store/max_cap > then zero is forwarded as an explicit value', () => {
      controller.updateOffer(
        'offer-1',
        { commission_store: 0 as never, max_cap: 0 as never } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.commission_store).toBe(0);
      expect(arg.max_cap).toBe(0);
    });

    // disabled/extra_store arrive as multipart strings; only the exact string
    // "true" enables them. "false" explicitly disables them, while absent stays
    // undefined so partial saves never rewrite existing flags.
    it('updateOffer > given disabled "true" and extra_store "true" > then both become boolean true', () => {
      controller.updateOffer(
        'offer-1',
        { disabled: 'true' as never, extra_store: 'true' } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.disabled).toBe(true);
      expect(arg.extra_store).toBe(true);
    });

    it('updateOffer > given disabled "false" and extra_store omitted > then disabled is false and extra_store is preserved', () => {
      controller.updateOffer(
        'offer-1',
        { disabled: 'false' as never } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.disabled).toBe(false);
      expect(arg.extra_store).toBeUndefined();
    });

    it('updateOffer > given disabled and extra_store omitted > then both stay undefined for partial-save preservation', () => {
      controller.updateOffer('offer-1', {} as never, {});

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.disabled).toBeUndefined();
      expect(arg.extra_store).toBeUndefined();
    });

    it('updateOffer > given tracking_link > then it forwards the customer redirect link', () => {
      controller.updateOffer(
        'offer-1',
        { tracking_link: 'https://track.example/brand' } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.tracking_link).toBe('https://track.example/brand');
    });

    it('updateOffer > given lookup_value > then it forwards the slug for persistence', () => {
      controller.updateOffer(
        'offer-1',
        { lookup_value: 'shopee_th' } as never,
        {},
      );

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.lookup_value).toBe('shopee_th');
    });

    // Multipart files arrive as single-element arrays per field; the controller
    // unwraps [0]. A missing field must become null, not undefined, so the
    // service can treat "no new image" consistently.
    it('updateOffer > given uploaded file arrays > then each is unwrapped to its first element', () => {
      const logo = { originalname: 'logo.png' } as Express.Multer.File;
      const banner = { originalname: 'banner.png' } as Express.Multer.File;

      controller.updateOffer('offer-1', {} as never, {
        logo_desktop: [logo],
        banner: [banner],
      });

      const arg = adminService.updateOffer.mock.calls[0][1];
      expect(arg.logo_desktop).toBe(logo);
      expect(arg.banner).toBe(banner);
      // Fields with no upload must be null, not undefined.
      expect(arg.logo_mobile).toBeNull();
      expect(arg.banner_mobile).toBeNull();
      expect(arg.logo_circle).toBeNull();
    });
  });

  // ─── Approve / reject offer: admin attribution ──────────────────────────

  describe('approveOffer', () => {
    // The acting admin id must come from the authenticated token subject so the
    // approval is attributed correctly in the audit trail.
    it('approveOffer > given an authenticated request > then it passes the offer id and req.user.sub', () => {
      const req = { user: { sub: 'admin-77' } } as unknown as Request;
      controller.approveOffer('offer-5', {} as never, req);

      expect(adminService.approveOffer).toHaveBeenCalledWith(
        'offer-5',
        'admin-77',
      );
    });

    it('approveOffer > given a request with no subject > then the admin id falls back to "unknown"', () => {
      const req = { user: {} } as unknown as Request;
      controller.approveOffer('offer-5', {} as never, req);

      expect(adminService.approveOffer).toHaveBeenCalledWith(
        'offer-5',
        'unknown',
      );
    });
  });

  describe('rejectOffer', () => {
    it('rejectOffer > given a reason and authenticated request > then it forwards id, admin id, and reason', () => {
      const req = { user: { sub: 'admin-77' } } as unknown as Request;
      controller.rejectOffer('offer-5', { reason: 'low quality' }, req);

      expect(adminService.rejectOffer).toHaveBeenCalledWith(
        'offer-5',
        'admin-77',
        'low quality',
      );
    });

    it('rejectOffer > given no token subject > then the admin id falls back to "unknown"', () => {
      const req = {} as unknown as Request;
      controller.rejectOffer('offer-5', { reason: 'spam' }, req);

      expect(adminService.rejectOffer).toHaveBeenCalledWith(
        'offer-5',
        'unknown',
        'spam',
      );
    });
  });

  // ─── Category + banner multipart unwrapping ─────────────────────────────

  describe('updateCategory', () => {
    it('updateCategory > given an uploaded image array > then it unwraps the first file', () => {
      const image = { originalname: 'cat.png' } as Express.Multer.File;
      controller.updateCategory('cat-1', { image: [image] });

      expect(adminService.updateCategory).toHaveBeenCalledWith('cat-1', {
        image,
      });
    });

    it('updateCategory > given no image > then image is null', () => {
      controller.updateCategory('cat-1', {});

      expect(adminService.updateCategory).toHaveBeenCalledWith('cat-1', {
        image: null,
      });
    });
  });

  describe('updateBannerHome', () => {
    // The home banner mixes uploaded files (per-slot arrays, unwrapped to [0])
    // with text links. Present slots use the file/link; absent ones must be
    // null so an empty submission clears rather than corrupts the slot.
    it('updateBannerHome > given a mix of files and links > then files are unwrapped and missing slots are null', () => {
      const image1 = { originalname: '1.png' } as Express.Multer.File;
      controller.updateBannerHome({ image_1: [image1] }, {
        link_1: 'https://a.co',
        link_3: 'https://c.co',
      } as never);

      const dto = adminService.updateBannerHome.mock.calls[0][0];
      expect(dto.image_1).toBe(image1);
      expect(dto.link_1).toBe('https://a.co');
      expect(dto.link_3).toBe('https://c.co');
      // Unsubmitted slots collapse to null.
      expect(dto.image_2).toBeNull();
      expect(dto.image_5).toBeNull();
      expect(dto.link_2).toBeNull();
      expect(dto.link_5).toBeNull();
    });

    it('updateBannerHome > given schedule controls > then enabled and window fields pass through as-is', () => {
      controller.updateBannerHome({}, {
        enabled_1: false,
        enabled_2: true,
        start_date_1: '2026-06-01',
        end_date_1: '2026-06-30',
        end_date_2: '2026-07-15',
      } as never);

      const dto = adminService.updateBannerHome.mock.calls[0][0];
      expect(dto.enabled_1).toBe(false);
      expect(dto.enabled_2).toBe(true);
      expect(dto.start_date_1).toBe('2026-06-01');
      expect(dto.end_date_1).toBe('2026-06-30');
      expect(dto.end_date_2).toBe('2026-07-15');
      // Omitted optional schedule fields should remain undefined.
      expect(dto.enabled_5).toBeUndefined();
      expect(dto.start_date_3).toBeUndefined();
      expect(dto.end_date_5).toBeUndefined();
    });

    it('updateBannerHome > given multipart boolean strings > then enabled controls are coerced', () => {
      controller.updateBannerHome({}, {
        enabled_1: 'false',
        enabled_2: 'true',
      } as never);

      const dto = adminService.updateBannerHome.mock.calls[0][0];
      expect(dto.enabled_1).toBe(false);
      expect(dto.enabled_2).toBe(true);
    });

    it('updateBannerHome > given an empty submitted link > then the clear intent is forwarded', () => {
      controller.updateBannerHome({}, { link_1: '' } as never);

      const dto = adminService.updateBannerHome.mock.calls[0][0];
      expect(dto.link_1).toBe('');
      expect(dto.link_2).toBeNull();
    });
  });

  // ─── Remaining read/passthrough endpoints ───────────────────────────────

  describe('passthrough read endpoints', () => {
    it('getTopBrands > then it delegates to the service', () => {
      expect(controller.getTopBrands()).toBe(RETURN);
      expect(adminService.getTopBrands).toHaveBeenCalledTimes(1);
    });

    it('getFeeRate > then it delegates to the service', () => {
      expect(controller.getFeeRate()).toBe(RETURN);
      expect(adminService.getFeeRate).toHaveBeenCalledTimes(1);
    });

    it('getBannerHome > then it delegates to the service', () => {
      expect(controller.getBannerHome()).toBe(RETURN);
      expect(adminService.getBannerHome).toHaveBeenCalledTimes(1);
    });

    it('getDeepLinkList > then it delegates to the service', () => {
      expect(controller.getDeepLinkList()).toBe(RETURN);
      expect(adminService.getDeepLinkList).toHaveBeenCalledTimes(1);
    });

    it('viewMyCahsback > given a user id > then it delegates to getMyCashBackUser', () => {
      controller.viewMyCahsback('user-3');
      expect(adminService.getMyCashBackUser).toHaveBeenCalledWith('user-3');
    });

    it('updateConversionDataByConversionId > given an id > then it forwards the id', () => {
      controller.updateConversionDataByConversionId('conv-1');
      expect(
        adminService.updateConversionDataByConversionId,
      ).toHaveBeenCalledWith('conv-1');
    });

    it('updateRequestWithdraw > given a file and dto > then it forwards (dto, file)', () => {
      const file = { originalname: 'slip.png' } as Express.Multer.File;
      const dto = { status: 'approved', id: 'w-1' };
      controller.updateRequestWithdraw(file, dto as never);
      expect(adminService.updateRequestWithdraw).toHaveBeenCalledWith(
        dto,
        file,
      );
    });

    it('create > given a create dto > then it delegates to AdminService.create', () => {
      const dto = { name: 'stub' };
      controller.create(dto as never);
      expect(adminService.create).toHaveBeenCalledWith(dto);
    });
  });
});
