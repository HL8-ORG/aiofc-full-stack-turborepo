import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';

/**
 * @description 扩展 Express Request 接口,添加请求ID字段
 * @mechanism 通过 declare global 扩展全局类型定义
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * @description 安全中间件配置函数
 * @param app NestJS 应用实例
 * @param configService 配置服务实例
 * 
 * @mechanism
 * 1. Cookie解析:
 *    - 解析请求中的cookie信息
 *    - 支持签名cookie验证
 * 
 * 2. 压缩处理:
 *    - 使用gzip算法压缩响应内容
 *    - 可配置压缩级别和阈值
 *    - 支持过滤特定请求
 * 
 * 3. 安全头设置:
 *    - CSP: 内容安全策略配置
 *    - HSTS: 强制HTTPS
 *    - 引用策略控制
 * 
 * 4. CORS跨域:
 *    - 配置允许的源
 *    - 控制跨域请求方法
 *    - 设置预检请求缓存
 */
export function setupSecurityMiddleware(
  app: INestApplication,
  configService: ConfigService
): void {
  // Cookie 解析器配置
  app.use(cookieParser());

  // 压缩中间件配置
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

  // Helmet 安全头配置
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

  // CORS 跨域配置
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
 * @description 开发环境专用中间件配置
 * @param app NestJS 应用实例
 * @param configService 配置服务实例
 * 
 * @mechanism
 * - 仅在开发环境中启用
 * - 配置更宽松的内容安全策略
 * - 允许开发所需的不安全内容
 */
export function setupDevelopmentMiddleware(
  app: INestApplication,
  configService: ConfigService
): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

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
 * @description 请求日志中间件配置
 * @param app NestJS 应用实例
 * @param configService 配置服务实例
 * 
 * @mechanism
 * 1. 请求追踪:
 *    - 生成唯一请求ID
 *    - 在响应头中返回请求ID
 * 
 * 2. 日志记录:
 *    - 开发环境下详细记录请求信息
 *    - 可配置敏感数据记录选项
 */
export function setupRequestLogging(
  app: INestApplication,
  configService: ConfigService
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logSensitiveData = configService.get('security.logging.logSensitiveData', false);

  app.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('x-request-id', req.requestId);
    
    if (isDevelopment && logSensitiveData) {
      console.log(`🔍 [${req.requestId}] ${req.method} ${req.url}`);
      console.log(`   User-Agent: ${req.get('User-Agent')}`);
      console.log(`   IP: ${req.ip || req.connection.remoteAddress}`);
    }
    
    next();
  });
}

/**
 * @description 健康检查端点配置
 * @param app NestJS 应用实例
 * @param serviceName 服务名称
 * 
 * @mechanism
 * 1. 健康检查端点:
 *    - 返回服务状态信息
 *    - 包含内存使用、运行时间等指标
 * 
 * 2. Ping测试:
 *    - 提供简单的可用性检查
 */
export function setupHealthCheck(
  app: INestApplication,
  serviceName: string
): void {
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

  app.use('/ping', (req: Request, res: Response) => {
    res.send('pong');
  });
}

/**
 * @description 全局中间件配置函数
 * @param app NestJS 应用实例
 * @param configService 配置服务实例
 * @param serviceName 服务名称
 * 
 * @mechanism
 * 按照以下顺序配置中间件:
 * 1. 请求日志(最先执行)
 * 2. 安全中间件
 * 3. 开发环境中间件
 * 4. 健康检查
 * 5. API路由前缀
 */
export function setupAllMiddleware(
  app: INestApplication,
  configService: ConfigService,
  serviceName: string
): void {
  setupRequestLogging(app, configService);
  setupSecurityMiddleware(app, configService);
  setupDevelopmentMiddleware(app, configService);
  setupHealthCheck(app, serviceName);
  app.setGlobalPrefix('api/v1');
}
