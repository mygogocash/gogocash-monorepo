import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { Request, Response } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';

describe('UserController', () => {
  let controller: UserController;
  const userService = {
    updateProfile: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    findOne: jest.fn(),
    uploadProfileAvatar: jest.fn(),
    streamProfileAvatar: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Authorization wiring (V-4). GET /user/balance/me/mycashback/admin/:id had
  // NO guard, so anyone could read ANY user's cashback balance + use the route
  // as an existence oracle by ObjectId. Pin the guard so a future edit dropping
  // it fails CI instead of silently re-opening the leak.
  // ---------------------------------------------------------------------------
  describe('authorization wiring (V-4)', () => {
    const proto = UserController.prototype as unknown as Record<
      string,
      unknown
    >;
    const guardsOf = (method: string): unknown[] =>
      (Reflect.getMetadata(
        '__guards__',
        proto[method] as object,
      ) as unknown[]) ?? [];

    it('balanceMyCashbackAdmin > is protected by AuthAdminGuard (no unauthenticated balance/PII leak)', () => {
      expect(guardsOf('balanceMyCashbackAdmin')).toContain(AuthAdminGuard);
    });

    it('balanceMyCashback (self) > stays protected by FirebaseAuthGuard', () => {
      expect(guardsOf('balanceMyCashback')).toContain(FirebaseAuthGuard);
    });
  });

  describe('PATCH /user/:id', () => {
    it('update > given a different user id in the URL > then it edits the callers own record, not the targeted one (no IDOR)', async () => {
      const selfId = new Types.ObjectId();
      const req = { user: { sub: selfId.toString() } } as unknown as Request;

      await controller.update(
        '0123456789abcdef01234567', // a DIFFERENT user's id
        { username: 'x' } as never,
        req,
      );

      // Must route through the allowlisted self-service path with the caller's
      // own id, never the attacker-supplied param id.
      expect(userService.updateProfile).toHaveBeenCalledTimes(1);
      const calledId = userService.updateProfile.mock
        .calls[0][0] as Types.ObjectId;
      expect(calledId.toString()).toBe(selfId.toString());
      expect(calledId.toString()).not.toBe('0123456789abcdef01234567');
    });
  });

  describe('POST /user/profile/avatar', () => {
    it('uploadProfileAvatar > given a non-image file > then rejects with BadRequestException', async () => {
      const req = {
        user: { sub: new Types.ObjectId().toString() },
      } as unknown as Request;

      await expect(
        controller.uploadProfileAvatar(req, {
          mimetype: 'application/pdf',
        } as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      expect(userService.uploadProfileAvatar).not.toHaveBeenCalled();
    });

    it('uploadProfileAvatar > given an image file > then returns avatar_url from the service', async () => {
      const id = new Types.ObjectId();
      const req = { user: { sub: id.toString() } } as unknown as Request;
      userService.uploadProfileAvatar.mockResolvedValue({
        avatar_url: 'local-media:avatar.jpg',
      });

      await expect(
        controller.uploadProfileAvatar(req, {
          mimetype: 'image/jpeg',
        } as Express.Multer.File),
      ).resolves.toEqual({ avatar_url: 'local-media:avatar.jpg' });

      expect(userService.uploadProfileAvatar).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        expect.objectContaining({ mimetype: 'image/jpeg' }),
      );
    });
  });

  describe('GET /user/profile/avatar/stream', () => {
    it('streamProfileAvatar > given empty ref > then rejects with BadRequestException', async () => {
      const req = {
        user: { sub: new Types.ObjectId().toString() },
      } as unknown as Request;
      const res = { setHeader: jest.fn() } as unknown as Response;

      await expect(
        controller.streamProfileAvatar(req, '', res),
      ).rejects.toThrow(BadRequestException);
      expect(userService.streamProfileAvatar).not.toHaveBeenCalled();
    });

    it('streamProfileAvatar > given a stored ref > then pipes the stream with content type', async () => {
      const id = new Types.ObjectId();
      const req = { user: { sub: id.toString() } } as unknown as Request;
      const pipe = jest.fn();
      userService.streamProfileAvatar.mockResolvedValue({
        contentType: 'image/png',
        stream: { pipe },
      });

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      await controller.streamProfileAvatar(req, 'local-media:avatar.png', res);

      expect(userService.streamProfileAvatar).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        'local-media:avatar.png',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(pipe).toHaveBeenCalledWith(res);
    });
  });
});
