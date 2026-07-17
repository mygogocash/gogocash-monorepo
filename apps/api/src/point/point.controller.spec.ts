import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { PointController } from './point.controller';
import { PointService } from './point.service';
import { TasksService } from './tasksService';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { Types } from 'mongoose';
import { QuestMediaQaService } from './quest-media-qa.service';

/**
 * PointController is a thin HTTP delegator: it forwards each route to the right
 * PointService/TasksService method and, for authenticated routes, extracts the
 * caller id from req['user'].sub. The behavior contract under test is therefore
 * "the right service method is called with the right arguments (and the right
 * user id)" — getting the wrong id here means one user's quest points/PII would
 * be read or written under another user's request.
 */
describe('PointController', () => {
  let controller: PointController;
  let pointService: jest.Mocked<PointService>;
  let tasksService: jest.Mocked<TasksService>;
  let questMediaQa: jest.Mocked<QuestMediaQaService>;

  // A sentinel each delegating method returns so we can assert the controller
  // returns the service result verbatim (no transformation).
  const RESULT = Symbol('service-result');

  const pointServiceMock = {
    create: jest.fn().mockReturnValue(RESULT),
    findAll: jest.fn().mockReturnValue(RESULT),
    getPoint: jest.fn().mockReturnValue(RESULT),
    getListReferral: jest.fn().mockReturnValue(RESULT),
    getQuestRankList: jest.fn().mockReturnValue(RESULT),
    getMyQuestRankListOfPoint: jest.fn().mockReturnValue(RESULT),
    getQuestRankListOfPoint: jest.fn().mockReturnValue(RESULT),
    createQuest: jest.fn().mockReturnValue(RESULT),
    closeQuest: jest.fn().mockReturnValue(RESULT),
    getQuestAdmin: jest.fn().mockReturnValue(RESULT),
    getQuestOpen: jest.fn().mockReturnValue(RESULT),
    getQuestSocial: jest.fn().mockReturnValue(RESULT),
    getQuestAll: jest.fn().mockReturnValue(RESULT),
    getQuestEndTRound: jest.fn().mockReturnValue(RESULT),
    questSocial: jest.fn().mockReturnValue(RESULT),
    updateQuestSocial: jest.fn().mockReturnValue(RESULT),
    getMyPointSumEveryMonth: jest.fn().mockReturnValue(RESULT),
    getSpacialPointNextRound: jest.fn().mockReturnValue(RESULT),
  };

  const tasksServiceMock = {
    handleCron: jest.fn().mockReturnValue(RESULT),
  };
  const questMediaQaMock = {
    readiness: jest.fn().mockReturnValue(RESULT),
    status: jest.fn().mockReturnValue(RESULT),
    cleanupAcceptance: jest.fn().mockReturnValue(RESULT),
  };

  // Build a fake Express request carrying the auth-resolved user, mirroring what
  // FirebaseAuthGuard/AuthAdminGuard set on request['user'].
  const reqWithUser = (sub: unknown): Request =>
    ({ user: { sub } }) as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [
        { provide: PointService, useValue: pointServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: QuestMediaQaService, useValue: questMediaQaMock },
      ],
    })
      // The guards have their own DB/JWT deps; the controller's behavior does not
      // depend on them, so neutralize them to keep the test a fast unit.
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PointController>(PointController);
    pointService = module.get(PointService);
    tasksService = module.get(TasksService);
    questMediaQa = module.get(QuestMediaQaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('create > given a CreatePointDto > then it forwards the dto to PointService.create and returns its result', () => {
      const dto = { foo: 'bar' } as never;

      const result = controller.create(dto);

      expect(pointService.create).toHaveBeenCalledTimes(1);
      expect(pointService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(RESULT);
    });
  });

  describe('findAll', () => {
    it('findAll > given no arguments > then it delegates to PointService.findAll', () => {
      const result = controller.findAll();

      expect(pointService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toBe(RESULT);
    });
  });

  describe('findOne', () => {
    // Reads the caller's own point balance — must scope to req.user.sub, never a
    // client-supplied id.
    it('findOne > given an authenticated request > then it reads the point of req.user.sub', () => {
      const result = controller.findOne(reqWithUser('user-123'));

      expect(pointService.getPoint).toHaveBeenCalledWith('user-123');
      expect(result).toBe(RESULT);
    });

    it('findOne > given a request with no resolved user > then it passes undefined (does not crash)', () => {
      controller.findOne({} as unknown as Request);

      expect(pointService.getPoint).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getListReferral', () => {
    it('getListReferral > given an authenticated request > then it lists referrals for req.user.sub', () => {
      controller.getListReferral(reqWithUser('ref-owner'));

      expect(pointService.getListReferral).toHaveBeenCalledWith('ref-owner');
    });
  });

  describe('getQuestRankList', () => {
    it('getQuestRankList > given a start and end date > then it forwards both to PointService.getQuestRankList', () => {
      const result = controller.getQuestRankList('2024-01-01', '2024-01-31');

      expect(pointService.getQuestRankList).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31',
      );
      expect(result).toBe(RESULT);
    });
  });

  describe('getMyQuestRank', () => {
    // Per-user quest ranking — the user id must come from the token, and the date
    // window must be passed through in order.
    it('getMyQuestRank > given an authenticated request and date range > then it queries req.user.sub for that window', () => {
      controller.getMyQuestRank(
        reqWithUser('me-99'),
        '2024-02-01',
        '2024-02-29',
      );

      expect(pointService.getMyQuestRankListOfPoint).toHaveBeenCalledWith(
        'me-99',
        '2024-02-01',
        '2024-02-29',
      );
    });
  });

  describe('addPoint (check-points route)', () => {
    // NOTE: despite the handler name "addPoint", it does NOT add points; it
    // delegates to the read-only getQuestRankListOfPoint. Pinning the actual
    // current behavior so a refactor can't silently turn this into a write.
    it('addPoint > given a date range > then it delegates to getQuestRankListOfPoint (read-only, not a points mutation)', () => {
      const result = controller.addPoint('2024-03-01', '2024-03-31');

      expect(pointService.getQuestRankListOfPoint).toHaveBeenCalledWith(
        '2024-03-01',
        '2024-03-31',
      );
      expect(tasksService.handleCron).not.toHaveBeenCalled();
      expect(result).toBe(RESULT);
    });
  });

  describe('savePoint', () => {
    it('savePoint > given no arguments > then it triggers TasksService.handleCron', () => {
      const result = controller.savePoint();

      expect(tasksService.handleCron).toHaveBeenCalledTimes(1);
      expect(result).toBe(RESULT);
    });
  });

  describe('createQuest', () => {
    // Admin quest creation with banner uploads: both the DTO and the uploaded
    // file map must reach the service unmodified, or banners would be dropped.
    it('createQuest > given a quest dto and uploaded files > then it forwards both to PointService.createQuest', () => {
      const dto = {
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        status: 'open',
      } as never;
      const files = {
        banner_en: [{ originalname: 'en.png' }],
        banner_th: [{ originalname: 'th.png' }],
      } as never;

      const result = controller.createQuest(dto, files);

      expect(pointService.createQuest).toHaveBeenCalledWith(dto, files);
      expect(result).toBe(RESULT);
    });
  });

  describe('quest media acceptance routes', () => {
    it('returns the read-only readiness contract', () => {
      expect(controller.getQuestMediaReadiness()).toBe(RESULT);
      expect(questMediaQa.readiness).toHaveBeenCalledTimes(1);
    });

    it('reads nonce-scoped QA status by request key', () => {
      expect(controller.getQuestMediaQaStatus('quest-media:qa:test')).toBe(
        RESULT,
      );
      expect(questMediaQa.status).toHaveBeenCalledWith('quest-media:qa:test');
    });

    it('delegates guarded acceptance cleanup without changing its body', () => {
      const input = {
        quest_id: new Types.ObjectId().toHexString(),
        request_key: 'quest-media:qa:test-command',
        qa_marker: 'quest-media-qa:test-marker',
        cleanup_nonce: 'n'.repeat(32),
      };
      expect(controller.cleanupQuestMediaAcceptance(input)).toBe(RESULT);
      expect(questMediaQa.cleanupAcceptance).toHaveBeenCalledWith(input);
    });
  });

  describe('closeQuest', () => {
    it('closeQuest > given a CloseQuestDto > then it forwards it to PointService.closeQuest', () => {
      const dto = { status: 'close' } as never;

      controller.closeQuest(dto);

      expect(pointService.closeQuest).toHaveBeenCalledWith(dto);
    });
  });

  describe('getAdminQuestOpen', () => {
    it('getAdminQuestOpen > when called > then it delegates to PointService.getQuestAdmin', () => {
      const result = controller.getAdminQuestOpen();

      expect(pointService.getQuestAdmin).toHaveBeenCalledTimes(1);
      expect(result).toBe(RESULT);
    });
  });

  describe('getQuestOpen', () => {
    it('getQuestOpen > when called > then it delegates to PointService.getQuestOpen', () => {
      controller.getQuestOpen();

      expect(pointService.getQuestOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQuestSocial', () => {
    it('getQuestSocial > given an authenticated request > then it reads social quests for req.user.sub', () => {
      controller.getQuestSocial(reqWithUser('social-user'));

      expect(pointService.getQuestSocial).toHaveBeenCalledWith('social-user');
    });
  });

  describe('getQuestAll', () => {
    it('getQuestAll > when called > then it delegates to PointService.getQuestAll', () => {
      controller.getQuestAll();

      expect(pointService.getQuestAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQuestEndToRound', () => {
    // Admin-only round aggregation that returns user PII; verify it forwards the
    // window to the (correctly spelled) service method.
    it('getQuestEndToRound > given a date range > then it forwards both dates to PointService.getQuestEndTRound', () => {
      controller.getQuestEndToRound('2024-04-01', '2024-04-30');

      expect(pointService.getQuestEndTRound).toHaveBeenCalledWith(
        '2024-04-01',
        '2024-04-30',
      );
    });
  });

  describe('questSocial', () => {
    // Mutating a social-quest action: id from token, plus the type/action route
    // params, all in order.
    it('questSocial > given type and action params > then it calls PointService.questSocial with req.user.sub, type, action', () => {
      controller.questSocial(reqWithUser('qs-user'), 'facebook', 'follow');

      expect(pointService.questSocial).toHaveBeenCalledWith(
        'qs-user',
        'facebook',
        'follow',
      );
    });
  });

  describe('updateQuestSocial', () => {
    // The route :id is the quest id; the actor must still be the token user, not
    // the path id. Assert both reach the service in the right slots.
    it('updateQuestSocial > given a quest id param > then it passes (req.user.sub, id) to PointService.updateQuestSocial', () => {
      controller.updateQuestSocial(reqWithUser('actor-1'), 'quest-42');

      expect(pointService.updateQuestSocial).toHaveBeenCalledWith(
        'actor-1',
        'quest-42',
      );
    });
  });

  describe('getMyPointSumAllMonth', () => {
    it('getMyPointSumAllMonth > given an authenticated request > then it sums months for req.user.sub', () => {
      controller.getMyPointSumAllMonth(reqWithUser('sum-user'));

      expect(pointService.getMyPointSumEveryMonth).toHaveBeenCalledWith(
        'sum-user',
      );
    });
  });

  describe('getSpacialPointNextRound', () => {
    it('getSpacialPointNextRound > given a date range > then it forwards both dates to PointService.getSpacialPointNextRound', () => {
      controller.getSpacialPointNextRound('2024-05-01', '2024-05-31');

      expect(pointService.getSpacialPointNextRound).toHaveBeenCalledWith(
        '2024-05-01',
        '2024-05-31',
      );
    });
  });
});
