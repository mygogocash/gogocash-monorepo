import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectModel } from '@nestjs/mongoose';
import { UserOtp } from 'src/user/schemas/user-otp.schema';
import { Model } from 'mongoose';

@Injectable()
export class OtpService {
  constructor(
    private readonly mailerService: MailerService,
    @InjectModel(UserOtp.name) private userOtpModel: Model<UserOtp>,
  ) {}

  async sendOtpToEmail(email: string) {
    console.log('email', email);
    // 1. Generate OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const userOtp = await this.userOtpModel.findOneAndUpdate(
      { email },
      { email, otp },
      { upsert: true, new: true },
    );
    // 3. ส่งอีเมลผ่าน NestJS Mailer
    if (userOtp) {
      await this.mailerService.sendMail({
        from: 'Gogocash <support@gogocash.co>',
        to: email,
        subject: 'Gogocash รหัสยืนยันการเข้าสู่ระบบ (OTP)',
        template: './otp', // หากใช้ Template engine (HBS/EJS)
        context: { otp },
        text: `รหัส OTP ของคุณคือ: ${otp}`,
      });
    }
    // await this.mailerService.sendMail({
    //   to: email,
    //   subject: 'Test Email',
    //   text: 'Hello from NestJS',
    //   html: '<b>Hello from NestJS</b>',
    // });

    return { message: 'OTP sent successfully' };
  }

  async verifyOtpAndCreateToken(email: string, userOtp: string) {
    // const doc = await admin.firestore().collection('otps').doc(email).get();

    // if (!doc.exists) throw new Error('OTP not found');

    // // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const { otp, createdAt } = doc.data();

    const userOtpDoc = await this.userOtpModel.findOne({ email });

    if (!userOtpDoc) throw new Error('OTP not found');

    const { otp } = userOtpDoc;
    // ตรวจสอบความถูกต้อง (และอาจเช็คเวลาหมดอายุที่นี่)
    if (otp === userOtp) {
      // 4. สร้าง Firebase Custom Token เพื่อให้ Frontend นำไป Login
      // const customToken = await admin.auth().createCustomToken(email);

      // ลบ OTP ทันทีที่ใช้เสร็จ (Security Best Practice)
      await this.userOtpModel.deleteOne({ email });

      return { message: 'OTP verified successfully', status: 'success' };
    } else {
      throw new Error('Invalid OTP');
    }
  }
}
