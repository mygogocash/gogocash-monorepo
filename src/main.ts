import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
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
