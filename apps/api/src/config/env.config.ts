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
  /** Optimise Media affiliate network (loaded from Google Secret Manager in prod/staging). */
  OPTIMISE_API_KEY: process.env.OPTIMISE_API_KEY,
  OPTIMISE_CONTACT_ID: process.env.OPTIMISE_CONTACT_ID || '2442123',
  OPTIMISE_AGENCY_ID: process.env.OPTIMISE_AGENCY_ID,
  OPTIMISE_API_BASE:
    process.env.OPTIMISE_API_BASE || 'https://api.optimisemedia.com',
  // Email (Resend) — RESEND_API_KEY loaded from Google Secret Manager in
  // prod/staging. MAIL_FROM must be an address on a Resend-verified domain.
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM || 'GoGoCash <noreply@gogocash.co>',
  // Base URL of the admin app — used to build invite / password-reset links.
  ADMIN_APP_URL:
    process.env.ADMIN_APP_URL || 'https://admin-staging.gogocash.co',
  WEB_URL: process.env.WEB_APP_URL,
}));
