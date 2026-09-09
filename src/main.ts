import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import * as express from 'express';
import { join } from 'path';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/response.interceptor';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ---- 同一端口同时托管前端静态站（前后端同源，免 CORS）----
  const pub = join(process.cwd(), 'public');
  app.use(express.static(pub, { index: false }));
  app.use((req: any, res: any, next: any) => {
    if (req.path && req.path.startsWith('/api')) return next();
    res.sendFile(join(pub, 'index.html'));
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global rate limit (in-memory). For distributed deployment, back with Redis.
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, data: null, message: '请求过于频繁，请稍后再试', error: { code: 'RATE_LIMITED' } },
    }),
  );

  // Allow the local frontend dev server by default. Set CORS_ORIGIN (comma
  // separated) in production. We use Bearer tokens (not cookies), so
  // credentials stay false — this avoids the `*` + credentials conflict.
  // A single "*" is treated as "reflect the request origin" for local dev
  // convenience; an explicit list is matched strictly (production).
  const raw = (process.env.CORS_ORIGIN || 'http://127.0.0.1:8099,http://localhost:8099')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = raw.length === 1 && raw[0] === '*' ? true : raw;
  app.enableCors({ origin, credentials: false });

  const config = new DocumentBuilder()
    .setTitle('SUA English API')
    .setDescription('SUA English — AI English Learning Platform backend API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '4000', 10);
  // 必须绑定 0.0.0.0，否则反向代理访问不到
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`SUA English backend listening on http://localhost:${port} (docs: /api/docs)`);
}

bootstrap();
