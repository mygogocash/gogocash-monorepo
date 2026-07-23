jest.mock('src/auth/firebase-admin.provider', () => ({
  getAdminAuth: jest.fn(),
}));

import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { User } from 'src/user/schemas/user.schema';

import { QuestTaskProgressController } from './quest-task-progress.controller';

describe('QuestTaskProgressController', () => {
  it('returns the raw authenticated customer progress array', async () => {
    const rows = [{ quest_id: 'quest-1', tasks: [] }];
    const progress = {
      getCustomerProgress: jest.fn().mockResolvedValue(rows),
    };
    const controller = new QuestTaskProgressController(progress as never);

    await expect(
      controller.getCustomerProgress({ user: { sub: 'user-1' } } as never),
    ).resolves.toBe(rows);
    expect(progress.getCustomerProgress).toHaveBeenCalledWith('user-1');
  });

  it('never accepts a customer id from request parameters or body', async () => {
    const progress = { getCustomerProgress: jest.fn().mockResolvedValue([]) };
    const controller = new QuestTaskProgressController(progress as never);
    await controller.getCustomerProgress({
      user: { userId: 'session-user' },
      body: { user_id: 'attacker' },
    } as never);
    expect(progress.getCustomerProgress).toHaveBeenCalledWith('session-user');
  });

  it('resolves the real customer guard with its JWT and User dependencies', async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        FirebaseAuthGuard,
        { provide: getModelToken(User.name), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    expect(module.get(FirebaseAuthGuard)).toBeInstanceOf(FirebaseAuthGuard);
    expect(module.get(JwtService)).toBeInstanceOf(JwtService);
    await module.close();
  });
});
