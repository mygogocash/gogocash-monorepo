import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Request } from 'express';
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
      const calledId = userService.updateProfile.mock.calls[0][0] as Types.ObjectId;
      expect(calledId.toString()).toBe(selfId.toString());
      expect(calledId.toString()).not.toBe('0123456789abcdef01234567');
    });
  });
});
