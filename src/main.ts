import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert string to number, etc.
      },
    }),
  );

  app.use(cookieParser());

  // CORS configuration - use ALLOWED_ORIGINS env var for production
  const allowedOrigins = process.env.WEB_APP_URL;
  app.enableCors({
    origin: allowedOrigins,
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
