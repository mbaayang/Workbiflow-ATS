import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './@config/filters/http-exception.filter';
import { TransformInterceptor } from './@config/interceptors/transform.interceptor';
import * as dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import hpp from 'hpp'
import helmet from 'helmet'
import { AppModule } from './app.module';
import { join } from 'path';

dotenv.config()

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'], // Only log errors, warnings, and regular logs
  });

  app.setGlobalPrefix('api');

  const corsOptions = {
    origin: '*',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Origin',
    ],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ['Content-Disposition']
  };
  app.enableCors(corsOptions);

  app.use(cookieParser())
  app.use(compression())
  app.use(hpp())
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
      }
    }
  }))
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
  
  const config = new DocumentBuilder()
    .setTitle('Workbiflow ATS API')
    .setDescription('API documentation for Workbiflow ATS')
    .setVersion('1.0')
    .addTag('Workbiflow ATS')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.listen(3000);
  console.log('App is running on port 3000');
}
bootstrap();