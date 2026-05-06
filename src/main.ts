import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';
import { SanitisedExceptionFilter } from './common/sanitised-exception.filter';

async function bootstrap() {
  // rawBody is required by the Customer.io webhook controller for HMAC
  // signature verification — NestJS preserves the unparsed buffer on
  // request.rawBody for any route that needs it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // Security headers. CSP is disabled because the app serves Swagger UI
  // (inline scripts/styles) and is API-only otherwise. Re-enable CSP only
  // if/when this server starts serving HTML to end-user browsers.
  app.use(helmet({ contentSecurityPolicy: false }));
  // Body size limits — defends against memory-exhaustion DoS via huge JSON.
  // File uploads use Multer (multipart) which is unaffected by these caps.
  app.use(json({ limit: '256kb' }));
  app.use(urlencoded({ extended: true, limit: '256kb' }));
  app.use(cookieParser());
  app.useGlobalFilters(new SanitisedExceptionFilter());
  // DEV ONLY: request logger so we can see incoming hits in the nest log.
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: any, _res: any, next: any) => {
      // eslint-disable-next-line no-console
      console.log(`[REQ] ${req.method} ${req.originalUrl || req.url}`);
      next();
    });
  }
  // Browsers reject `origin: '*'` when `credentials: true`. Use an explicit
  // allow-list and fall through to reflect the origin for non-credentialed
  // requests (useful for public GETs, curl, Swagger UI, etc.).
  const CORS_ALLOWLIST = [
    // Staging
    'https://app-staging.gogocash.co',
    'https://admin-staging.gogocash.co',
    'https://staging.gogocash.co',
    'https://gogocash-staging-637d5.web.app',
    'https://gogocash-web--gogocash-app-staging.us-central1.hosted.app',
    // AI test
    'https://app-ai-test.gogocash.co',
    'https://admin-ai-test.gogocash.co',
    'https://gogocash-admin-ai-test.web.app',
    'https://gogocash-web-ai-test--gogocash-app-staging.us-central1.hosted.app',
    // Local dev
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // No origin (server-to-server, curl) — allow.
      if (!origin) return callback(null, true);
      if (CORS_ALLOWLIST.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-PostHog-Distinct-Id',
      'X-PostHog-Anonymous-Id',
      'X-App-Locale',
    ],
  });
  const config = new DocumentBuilder()
    .setTitle('Crossmint Auth API')
    .setDescription('API for authentication with Crossmint (full mode)')
    .setVersion('1.0')
    // กำหนด Security Scheme สำหรับ Admin Token
    // .addSecurity('admin-token', {
    //   type: 'apiKey',
    //   name: 'X-Admin-Token', // ชื่อ Header ที่จะส่ง Token
    //   in: 'header',
    // })
    .addBearerAuth(
      // This is the key part for Bearer token
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', // Or whatever format your token is
        name: 'Authorization',
        in: 'header',
      },
      'access-token', // A unique name for this security scheme
    )
    // .addCookieAuth('access_token') // ✅ ให้ Swagger รู้ว่าใช้ cookie
    // .addCookieAuth('refresh_token') // ✅ เพิ่ม refresh token ด้วย
    .build();

  app.useStaticAssets(path.join(__dirname, '../uploads'));

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('doc_68bf99fed9667685c1637607', app, document);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
