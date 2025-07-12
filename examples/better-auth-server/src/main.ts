import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix("api", { exclude: ["/api/auth/*path"] });
  app.enableCors({
    origin: "http://localhost:3001",
    credentials: true,
  });
  
  await app.listen(3000);
}
bootstrap();
