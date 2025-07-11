import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { setupAuthSwagger } from '@repo/config';
import { AllExceptionsFilter } from '@repo/common';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

/**
 * 🚀 认证服务引导程序
 * 启动基于 NestJS 的微服务认证服务器
 */
async function bootstrap() {
  const logger = new Logger('Auth-Bootstrap');

  try {
    // 🏗️ 创建 NestJS 应用
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // 📁 静态文件服务（如 favicon.ico 等）
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // 🍪 Cookie 解析器
    app.use(cookieParser());

    // 🗜️ 压缩中间件
    app.use(compression({
      level: 6,
      threshold: 1024,
    }));

    // 🛡️ 安全头设置
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
      })
    );

    // 🌐 CORS 配置
    const corsConfig = configService.get('security.cors');
    app.enableCors({
      origin: corsConfig?.allowedOrigins || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
      ],
      credentials: corsConfig?.credentials ?? true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    });

    // ⚠️ 全局异常过滤器（包含 Zod 错误处理）
    app.useGlobalFilters(new AllExceptionsFilter());

    // 📋 请求日志中间件
    app.use((req: any, res: any, next: any) => {
      const start = Date.now();
      const { method, originalUrl } = req;
      
      logger.debug(`→ ${method} ${originalUrl}`);
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        logger.debug(`← ${method} ${originalUrl} ${statusCode} (+${duration}ms)`);
      });
      
      next();
    });

    // 🔗 API 前缀设置
    app.setGlobalPrefix('api/v1');

    // 📝 Swagger API 文档配置
    const port = configService.get<number>('PORT') || 4000;
    if (process.env.NODE_ENV !== 'production') {
      try {
        setupAuthSwagger(app, port);
      } catch (error) {
        logger.warn('跳过 Swagger 配置:', error.message);
      }
    }

    // 🚀 启动服务器
    await app.listen(port);

    // 📊 启动完成日志
    const securityConfig = configService.get('security.bruteForce');
    
    logger.log('🚀 认证服务已成功启动！');
    logger.log(`📍 服务器端口: ${port}`);
    logger.log(`📝 API 文档: http://localhost:${port}/api-docs`);
    logger.log(`🔗 API 基础路径: http://localhost:${port}/api/v1`);
    logger.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🛡️ 安全配置:`);
    logger.log(`   - 最大登录尝试次数: ${securityConfig?.maxLoginAttempts || 5}次`);
    logger.log(`✅ Zod 验证系统已激活`);
    logger.log(`🔍 健康检查: http://localhost:${port}/api/v1/auth/health`);
    logger.log(`💡 认证测试: 在 Swagger 中调用 /auth/login 后点击 Authorize 按钮`);

  } catch (error) {
    logger.error('❌ 认证服务启动失败:', error);
    process.exit(1);
  }
}

// 🔧 未处理的异常处理
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('未处理的 Promise 拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('未处理的异常:', error);
  process.exit(1);
});

// 🚀 启动服务
bootstrap();
