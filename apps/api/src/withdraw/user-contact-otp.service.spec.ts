import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { UserContactOtpService } from './user-contact-otp.service';

describe('UserContactOtpService (#424)', () => {
  const userId = new Types.ObjectId().toHexString();
  let otpModel: {
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
  };
  let userModel: { findById: jest.Mock; findByIdAndUpdate: jest.Mock };
  let emailService: { sendOtp: jest.Mock };
  let service: UserContactOtpService;

  beforeEach(() => {
    otpModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
      findOne: jest.fn(),
      deleteOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      }),
    };
    userModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: userId }),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: userId }),
      }),
    };
    emailService = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    service = new UserContactOtpService(
      otpModel as never,
      userModel as never,
      emailService as never,
    );
  });

  it('sendOtp > given a valid email target > then emails the inserted address and upserts a session', async () => {
    const result = await service.sendOtp({
      userId,
      channel: 'email',
      target: ' New.User@Example.com ',
    });

    expect(result).toEqual({ success: true, message: 'OTP sent' });
    expect(emailService.sendOtp).toHaveBeenCalledWith(
      'new.user@example.com',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(otpModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        target: 'new.user@example.com',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          verified: false,
          attempts: 0,
        }),
      }),
      expect.any(Object),
    );
  });

  it('sendOtp > given mobile channel > then returns a clear unavailable error (route exists)', async () => {
    await expect(
      service.sendOtp({
        userId,
        channel: 'mobile',
        target: '0812345678',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(emailService.sendOtp).not.toHaveBeenCalled();
  });

  it('sendOtp > given unknown user > then 404', async () => {
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.sendOtp({
        userId,
        channel: 'email',
        target: 'a@b.co',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sendOtp > given invalid email > then 400', async () => {
    await expect(
      service.sendOtp({
        userId,
        channel: 'email',
        target: 'not-an-email',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifyOtp > given matching code > then marks verified and deletes the session', async () => {
    const otp = '123456';
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const doc = {
      _id: new Types.ObjectId(),
      otpHash,
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      verified: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    otpModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    const result = await service.verifyOtp({
      userId,
      channel: 'email',
      target: 'a@b.co',
      otp,
    });

    expect(result).toEqual({ success: true, verified: true });
    expect(doc.save).toHaveBeenCalled();
    expect(otpModel.deleteOne).toHaveBeenCalled();
  });

  it('verifyOtp > given wrong code > then 400 and increments attempts', async () => {
    const doc = {
      _id: new Types.ObjectId(),
      otpHash: 'aa'.repeat(32),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      verified: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    otpModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
    });

    await expect(
      service.verifyOtp({
        userId,
        channel: 'email',
        target: 'a@b.co',
        otp: '000000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(doc.attempts).toBe(1);
    expect(doc.save).toHaveBeenCalled();
  });

  it('verifyOtp > given no session > then 400', async () => {
    otpModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.verifyOtp({
        userId,
        channel: 'email',
        target: 'a@b.co',
        otp: '123456',
      }),
    ).rejects.toThrow(/No active OTP/);
  });

  it('updateWithdrawUser > maps primary email/mobile onto the User document', async () => {
    const result = await service.updateWithdrawUser({
      userId,
      emails: [' Primary@Example.com ', 'secondary@example.com'],
      mobiles: ['0811111111'],
      fullName: 'Ada Lovelace',
      gender: 'female',
      birthdate: '1990-01-01',
    });

    expect(result.success).toBe(true);
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      {
        $set: expect.objectContaining({
          email: 'primary@example.com',
          email_verified: true,
          mobile: '0811111111',
          username: 'Ada Lovelace',
          gender: 'female',
          birthdate: '1990-01-01',
        }),
      },
      { new: true },
    );
  });
});
