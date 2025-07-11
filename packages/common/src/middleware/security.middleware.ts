import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';

// 扩展 Request 接口
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * 🛡️ 安全中间件配置
 * 为所有 NestJS 应用配置通用的安全中间件
 */
export function setupSecurityMiddleware(
  app: INestApplication,
  configService: ConfigService
): void {
  // 🍪 Cookie 解析器
  app.use(cookieParser());

  // 🗜️ 压缩中间件
  app.use(compression({
    level: 6, // 压缩级别 (1-9, 6是较好的平衡点)
    threshold: 1024, // 只压缩大于1KB的文件
    filter: (req: Request, res: Response) => {
      // 排除已压缩的内容
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // 🛡️ 安全头设置
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          scriptSrc: ["'self'", "'unsafe-eval'"], // 开发环境可能需要
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // 为了与 Next.js 兼容
      hsts: {
        maxAge: 31536000, // 1年
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: 'same-origin' }
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
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'x-request-id',
      'x-correlation-id',
      'Accept',
      'Origin'
    ],
    exposedHeaders: [
      'x-request-id',
      'x-correlation-id'
    ],
    maxAge: 86400, // 24小时预检请求缓存
  });
}

/**
 * 🔧 开发环境专用中间件
 * 配置仅在开发时需要的中间件
 */
export function setupDevelopmentMiddleware(
  app: INestApplication,
  configService: ConfigService
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // 在开发环境中应用更宽松的 CSP 策略
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
        },
      },
    })
  );
}

/**
 * 🔍 请求日志中间件
 * 记录请求/响应日志（在开发环境中详细记录）
 */
export function setupRequestLogging(
  app: INestApplication,
  configService: ConfigService
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logSensitiveData = configService.get('security.logging.logSensitiveData', false);

  // 添加请求 ID 中间件
  app.use((req: Request, res: Response, next: NextFunction) => {
    // 生成请求 ID (用于追踪)
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('x-request-id', req.requestId);
    
    // 仅在开发环境中详细记录
    if (isDevelopment && logSensitiveData) {
      console.log(`🔍 [${req.requestId}] ${req.method} ${req.url}`);
      console.log(`   User-Agent: ${req.get('User-Agent')}`);
      console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
    }
    
    next();
  });
}

/**
 * 📊 健康检查端点配置
 * 添加基本的健康检查端点
 */
export function setupHealthCheck(
  app: INestApplication,
  serviceName: string
): void {
  // 基本健康检查路由
  app.use('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // 简单的 ping 端点
  app.use('/ping', (req: Request, res: Response) => {
    res.send('pong');
  });
}

/**
 * 🏗️ 全局中间件配置
 * 一次性配置所有必需的中间件
 */
export function setupAllMiddleware(
  app: INestApplication,
  configService: ConfigService,
  serviceName: string
): void {
  // 请求日志（最先执行）
  setupRequestLogging(app, configService);
  
  // 安全中间件
  setupSecurityMiddleware(app, configService);
  
  // 开发环境专用中间件
  setupDevelopmentMiddleware(app, configService);
  
  // 健康检查端点
  setupHealthCheck(app, serviceName);
  
  // API 前缀设置
  app.setGlobalPrefix('api/v1');
}
