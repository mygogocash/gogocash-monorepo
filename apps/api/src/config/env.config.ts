import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  PORT: process.env.PORT || 8080,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ADMIN_SECRET: process.env.JWT_ADMIN_SECRET,
  INVOLVE_SECRET: process.env.INVOLVE_SECRET,
  /** Optimise Media affiliate network (loaded from Google Secret Manager in prod/staging). */
  OPTIMISE_API_KEY: process.env.OPTIMISE_API_KEY,
  OPTIMISE_CONTACT_ID: process.env.OPTIMISE_CONTACT_ID || '2442123',
  OPTIMISE_AGENCY_ID: process.env.OPTIMISE_AGENCY_ID,
  // Public API host — the `/v1` segment is part of the base. The old default
  // (`https://api.optimisemedia.com`) is an NXDOMAIN and was never reachable;
  // the real gateway is `public.api.optimisemedia.com/v1` (verified live).
  OPTIMISE_API_BASE:
    process.env.OPTIMISE_API_BASE || 'https://public.api.optimisemedia.com/v1',
  /**
   * Accesstrade Global affiliate network. Auth is a two-stage provisioning ->
   * HS256 JWT flow keyed off the publisher username+password (NOT a single API
   * key); the region host + site id are required on nearly every call.
   */
  ACCESSTRADE_USERNAME: process.env.ACCESSTRADE_USERNAME,
  ACCESSTRADE_PASSWORD: process.env.ACCESSTRADE_PASSWORD,
  ACCESSTRADE_SITE_ID: process.env.ACCESSTRADE_SITE_ID,
  ACCESSTRADE_API_BASE:
    process.env.ACCESSTRADE_API_BASE || 'https://gurkha.accesstrade.in.th',
  // Email (Resend) — RESEND_API_KEY loaded from Google Secret Manager in
  // prod/staging. MAIL_FROM must be an address on a Resend-verified domain.
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM || 'GoGoCash <noreply@gogocash.co>',
  // Public LINE Login channel ID. Access tokens must be issued for this exact
  // channel before their profile or claimed user id is trusted.
  LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID,
  // Base URL of the admin app — used to build invite / password-reset links.
  ADMIN_APP_URL:
    process.env.ADMIN_APP_URL || 'https://admin-staging.gogocash.co',
  WEB_URL: process.env.WEB_APP_URL,
  /**
   * ORION Phase 0 ops mode. LIVE = intended production posture once Vertex is
   * wired; DEGRADED (default) = safe Phase 0 without external AI providers;
   * OFF = hard-disabled health signal.
   */
  ORION_MODE: process.env.ORION_MODE || 'DEGRADED',
  /** In-memory TTL for GET /admin/orion/context/snapshot (seconds). */
  ORION_SNAPSHOT_TTL_SEC: process.env.ORION_SNAPSHOT_TTL_SEC || '90',
}));
