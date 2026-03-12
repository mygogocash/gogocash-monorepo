import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  PORT: process.env.PORT || 8080,
  CROSSMINT_BASE_URL: process.env.CROSSMINT_AUTH_BASE,
  CROSSMINT_PROJECT_ID: process.env.CROSSMINT_PROJECT_ID,
  CROSSMINT_SECRET: process.env.CROSSMINT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ADMIN_SECRET: process.env.JWT_ADMIN_SECRET,
  INVOLVE_SECRET: process.env.INVOLVE_SECRET,
  // Email OTP Configuration
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  WEB_URL: process.env.WEB_APP_URL,
}));
