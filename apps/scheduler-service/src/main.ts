import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = process.env['PORT'] || 3002;
  await app.listen(port);
  Logger.log(`Scheduler service running on port ${port}`);
}

bootstrap();
