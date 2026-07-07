import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { EmailService } from '../email/email.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { RateLimitGuard } from './rate-limit.guard';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';

// Mocked collaborators — the controller is exercised over real HTTP (supertest)
// so the route-level ValidationPipe wiring is what's under test, not the pipe in
// isolation. A NoSQL operator object in `email` MUST be rejected at the boundary
// before any OtpService/Mongo call (H1/C3 injection on the unauthenticated OTP
// endpoints).
const otpService = {
  createOtp: jest.fn(),
  verifyOtp: jest.fn(),
  sendOtpToEmail: jest.fn(),
  verifyOtpAndCreateToken: jest.fn(),
};
const emailService = { sendOtp: jest.fn() };
const authService = { generateTempToken: jest.fn() };
const analytics = { capture: jest.fn() };
const allow = { canActivate: () => true };

describe('AuthController', () => {
  let controller: AuthController;
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: OtpService, useValue: otpService },
        { provide: EmailService, useValue: emailService },
        { provide: AnalyticsService, useValue: analytics },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue(allow)
      .overrideGuard(FirebaseAuthGuard)
      .useValue(allow)
      .overrideGuard(AuthAdminGuard)
      .useValue(allow)
      .compile();

    controller = moduleRef.get<AuthController>(AuthController);
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/email/request-otp > given a NoSQL operator object as email', () => {
    it('then it is rejected with 400 before any OtpService call', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/email/request-otp')
        .send({ email: { $gt: '' } });

      expect(res.status).toBe(400);
      expect(otpService.createOtp).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/email/request-otp > given a valid email', () => {
    it('then OtpService.createOtp is called with the email string', async () => {
      otpService.createOtp.mockResolvedValue('123456');
      emailService.sendOtp.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/auth/email/request-otp')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(201);
      expect(otpService.createOtp).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('POST /auth/send-otp (legacy raw endpoint) > given a NoSQL operator object as email', () => {
    it('then it is rejected with 400 before any OtpService call', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/send-otp')
        .send({ email: { $gt: '' } });

      expect(res.status).toBe(400);
      expect(otpService.sendOtpToEmail).not.toHaveBeenCalled();
    });
  });
});
