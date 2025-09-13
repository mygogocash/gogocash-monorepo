import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  PORT: process.env.PORT || 3000,
  CROSSMINT_BASE_URL: process.env.CROSSMINT_AUTH_BASE,
  CROSSMINT_PROJECT_ID: process.env.CROSSMINT_PROJECT_ID,
  CROSSMINT_SECRET: process.env.CROSSMINT_SECRET,
}));
