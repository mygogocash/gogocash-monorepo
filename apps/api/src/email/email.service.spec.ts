import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { RESEND_CLIENT } from './resend.provider';

/**
 * EmailService must send through Resend (not Gmail/SMTP). These tests inject a
 * fake Resend client so we assert the outbound payload without hitting network.
 */
describe('EmailService (Resend)', () => {
  const FROM = 'GoGoCash <noreply@gogocash.co>';
  let service: EmailService;
  let send: jest.Mock;

  beforeEach(async () => {
    send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email_123' }, error: null });
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: RESEND_CLIENT, useValue: { emails: { send } } },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => (k === 'env.MAIL_FROM' ? FROM : undefined),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(EmailService);
  });

  it('sendOtp > given an email+code > sends via Resend from the configured address', async () => {
    await service.sendOtp('user@example.com', '123456');

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.from).toBe(FROM);
    expect(payload.to).toBe('user@example.com');
    expect(payload.subject).toMatch(/verification/i);
    expect(`${payload.html ?? ''} ${payload.text ?? ''}`).toContain('123456');
  });

  it('sendEmail > forwards to/subject/html to Resend and defaults the from address', async () => {
    await service.sendEmail({ to: 'a@b.co', subject: 'Hi', html: '<p>x</p>' });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: FROM,
        to: 'a@b.co',
        subject: 'Hi',
        html: '<p>x</p>',
      }),
    );
  });

  it('sendEmail > given attachments > forwards filename+content to Resend', async () => {
    const content = Buffer.from('zip-bytes');
    await service.sendEmail({
      to: 'a@b.co',
      subject: 'Your data export',
      html: '<p>export</p>',
      attachments: [{ filename: 'gogocash-data-export.zip', content }],
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.co',
        attachments: [{ filename: 'gogocash-data-export.zip', content }],
      }),
    );
  });

  it('sendOtp > when Resend returns an error > throws (does not swallow)', async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { message: 'domain not verified' },
    });

    await expect(service.sendOtp('user@example.com', '123456')).rejects.toThrow(
      /domain not verified|Email delivery failed/i,
    );
  });
});
