import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('API-Bootstrap');

  try {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
    const configService = app.get(ConfigService);

    // 提供静态文件服务（图标等）
    app.useStaticAssets({
      root: join(__dirname, '..', 'public'),
    });




    // CORS配置
    app.enableCors({
    origin: "http://localhost:3000",
    credentials: true,
  });

    // 全局异常过滤器（包含Zod错误处理）

    // API前缀设置
    // app.setGlobalPrefix('api/v1');
    app.setGlobalPrefix("api", { exclude: ["/api/auth/*path"] });

    const port = configService.get<number>('API_PORT') || 3001;
    
 

    await app.listen(port);

 
    logger.log(`🔗 API端点：http://localhost:${port}/api`);

  } catch (error) {
    logger.error('API应用程序启动失败:', error);
    process.exit(1);
  }
}

bootstrap();
