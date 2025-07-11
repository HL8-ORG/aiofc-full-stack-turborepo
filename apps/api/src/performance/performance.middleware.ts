import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from './performance.service';
import { ConfigService } from '@nestjs/config';

/**
 * 📊 性能监控中间件
 * 
 * 收集和分析所有 HTTP 请求的性能数据。
 * 实时测量响应时间并自动检测慢请求。
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  constructor(
    private readonly performanceService: PerformanceService,
    private readonly configService: ConfigService
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, url } = req;
    const requestId = this.generateRequestId();

    // 请求开始日志记录（仅在开发环境）
    if (this.configService.get('LOG_PERFORMANCE') === 'true') {
      this.logger.debug(`[${requestId}] 请求开始: ${method} ${url}`);
    }

    // 响应完成时记录性能数据
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;

      // 📊 记录性能数据
      this.performanceService.recordRequest({
        url,
        method,
        responseTime,
        statusCode,
      });

      // ⚠️ 自动检测并记录慢请求
      const slowThreshold = parseInt(
        this.configService.get('SLOW_REQUEST_THRESHOLD', '1000'),
        10
      );

      if (responseTime > slowThreshold) {
        this.logger.warn(
          `🐌 检测到慢请求 [${requestId}]: ${method} ${url} - ${responseTime}ms (状态码: ${statusCode})`
        );
      }

      // ❌ 记录服务器错误
      if (statusCode >= 500) {
        this.logger.error(
          `❌ 服务器错误 [${requestId}]: ${method} ${url} - ${responseTime}ms (状态码: ${statusCode})`
        );
      }

      // 📈 性能日志记录（通过环境变量控制）
      if (this.configService.get('LOG_PERFORMANCE') === 'true') {
        this.logger.log(
          `[${requestId}] 请求完成: ${method} ${url} - ${responseTime}ms (${statusCode})`
        );
      }
    });

    next();
  }

  /**
   * 生成请求 ID（简单随机 ID）
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
