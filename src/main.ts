import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: '*', // Adjust this to your needs
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
