import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@repo/common';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('API-Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // 提供静态文件服务（图标等）
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // 安全中间件
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      })
    );

    // 压缩中间件

    // Cookie解析器

    // CORS配置
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    });

    // 全局异常过滤器（包含Zod错误处理）
    app.useGlobalFilters(new AllExceptionsFilter());

    // API前缀设置
    app.setGlobalPrefix('api/v1');

    const port = configService.get<number>('API_PORT') || 4001;
    
 

    await app.listen(port);

 
    logger.log(`🔗 API端点：http://localhost:${port}/api/v1`);

  } catch (error) {
    logger.error('API应用程序启动失败:', error);
    process.exit(1);
  }
}

bootstrap();
