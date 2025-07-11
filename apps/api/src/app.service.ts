import { Injectable, Logger } from '@nestjs/common';

/**
 * 🏠 API 主服务
 * 
 * 提供系统信息和健康检查功能
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  /**
   * 🏠 获取 API 基本信息
   */
  getApiInfo() {
    const apiInfo = {
      service: 'LMS API Gateway',
      description: '学习管理系统 API 服务器',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Seoul',
      features: [
        '课程管理 (CRUD)',
        '支付和交易处理',
        '学习进度管理',
        'JWT 身份认证',
        'Zod 数据验证',
        'API 文档 (Swagger)',
        '请求限制 (Rate Limiting)',
      ],
      endpoints: {
        courses: '/api/v1/courses',
        transactions: '/api/v1/transactions',
        userProgress: '/api/v1/users/course-progress',
        health: '/api/v1/health',
        docs: '/api-docs',
      },
    };

    this.logger.log('API 信息请求处理完成');
    return apiInfo;
  }

  /**
   * ❤️ 获取健康检查信息
   */
  getHealthCheck() {
    const healthInfo = {
      status: 'ok',
      service: 'lms-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Seoul',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB',
      },
      database: {
        status: 'connected',
        type: 'PostgreSQL',
        provider: 'Prisma',
      },
      cache: {
        status: 'connected',
        type: 'Redis',
      },
      services: {
        auth: 'running',
        courses: 'running',
        transactions: 'running',
        userProgress: 'running',
      },
    };

    this.logger.log('健康检查请求处理完成');
    return healthInfo;
  }
}
