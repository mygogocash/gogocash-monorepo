import { OtpService } from './otp.service';

/**
 * The legacy UserOtp flow (POST /auth/send-otp) must deliver its OTP through
 * Resend (EmailService.sendEmail) — not the retired @nestjs-modules/mailer
 * MailerService with its missing './otp' template.
 */
describe('OtpService.sendOtpToEmail (Resend via EmailService)', () => {
  it('sends the OTP through EmailService.sendEmail with the code in the body', async () => {
    const sendEmail = jest.fn().mockResolvedValue(undefined);
    const emailService = { sendEmail } as unknown as never;
    const userOtpModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ email: 'u@e.co' }),
    } as unknown as never;
    const otpModel = {} as unknown as never;

    const service = new OtpService(emailService, userOtpModel, otpModel);

    const result = await service.sendOtpToEmail('u@e.co');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const payload = sendEmail.mock.calls[0][0];
    expect(payload.to).toBe('u@e.co');
    expect(payload.subject).toMatch(/OTP|ยืนยัน/);
    // The 6-digit code must appear in the rendered email (html or text).
    expect(`${payload.html ?? ''} ${payload.text ?? ''}`).toMatch(/\d{6}/);
    expect(result).toEqual({ message: 'OTP sent successfully' });
  });
});
