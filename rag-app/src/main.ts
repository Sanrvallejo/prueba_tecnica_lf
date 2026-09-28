import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import {
  IMAGES_DIR,
  IMAGES_URL_PREFIX,
} from './documents/image-storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: 'http://localhost:3000' });
  app.useStaticAssets(IMAGES_DIR, { prefix: IMAGES_URL_PREFIX });
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
