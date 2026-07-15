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
const authService = {
  generateTempToken: jest.fn(),
  isPhoneLoginEligible: jest.fn(),
  signIn: jest.fn(),
  signInFirebase: jest.fn(),
};
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

  describe('POST /auth/sign-in > retired provider compatibility route', () => {
    it('returns 401 before AuthService or provider logic can run', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          address: '0xabc',
          id_crossmint: 'historical-id',
          email: 'user@example.com',
        });

      expect(res.status).toBe(401);
      expect(authService.signIn).not.toHaveBeenCalled();
    });
  });

  describe('Firebase login/register intent', () => {
    it('POST /auth/log-in disables implicit phone registration', async () => {
      authService.signInFirebase.mockResolvedValue({
        token: 'jwt',
        user: { _id: 'user-1', provider: 'phone' },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/log-in')
        .set('Authorization', 'Bearer firebase-token')
        .send({ country: 'TH' });

      expect(res.status).toBe(201);
      expect(authService.signInFirebase).toHaveBeenCalledWith(
        'firebase-token',
        expect.objectContaining({ country: 'TH' }),
        { allowPhoneRegistration: false },
      );
    });

    it('POST /auth/register allows explicit phone registration', async () => {
      authService.signInFirebase.mockResolvedValue({
        token: 'jwt',
        user: { _id: 'user-1', provider: 'phone' },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', 'Bearer firebase-token')
        .send({ country: 'TH' });

      expect(res.status).toBe(201);
      expect(authService.signInFirebase).toHaveBeenCalledWith(
        'firebase-token',
        expect.objectContaining({ country: 'TH' }),
        { allowPhoneRegistration: true },
      );
    });

    it('POST /auth/register records a login when Firebase resolves an existing user', async () => {
      authService.signInFirebase.mockResolvedValue({
        auth_flow: 'login',
        is_new_user: false,
        token: 'jwt',
        user: {
          _id: 'user-1',
          email: 'member@gogocash.co',
          provider: 'phone',
          username: 'member',
        },
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', 'Bearer firebase-token')
        .send({ country: 'TH' });

      expect(analytics.capture).toHaveBeenCalledWith(
        'user_login',
        expect.any(Object),
        expect.objectContaining({ provider: 'phone' }),
      );
      expect(analytics.capture).not.toHaveBeenCalledWith(
        'user_registered',
        expect.anything(),
        expect.anything(),
      );
    });
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

  describe('POST /auth/phone-sign-in/eligibility', () => {
    it('given a valid E.164 phone > returns only the eligibility boolean', async () => {
      authService.isPhoneLoginEligible.mockResolvedValue(true);

      const res = await request(app.getHttpServer())
        .post('/auth/phone-sign-in/eligibility')
        .send({ phone_e164: '+66812345678' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ eligible: true });
      expect(authService.isPhoneLoginEligible).toHaveBeenCalledWith(
        '+66812345678',
      );
    });

    it.each([[{ $gt: '' }], ['0812345678'], ['+66 81 234 5678'], ['+1234567']])(
      'given malformed phone %p > rejects before any account lookup',
      async (phone_e164) => {
        const res = await request(app.getHttpServer())
          .post('/auth/phone-sign-in/eligibility')
          .send({ phone_e164 });

        expect(res.status).toBe(400);
        expect(authService.isPhoneLoginEligible).not.toHaveBeenCalled();
      },
    );
  });
});
