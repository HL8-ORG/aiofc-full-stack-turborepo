import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// 扩展 Request 接口
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: bigint;
      performanceMetrics?: {
        startTime: bigint;
        memoryUsageBefore: NodeJS.MemoryUsage;
        cpuUsageBefore: NodeJS.CpuUsage;
      };
    }
  }
}

/**
 * 📊 性能指标接口
 */
interface PerformanceMetric {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number; // 毫秒
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
  cpuUsage: {
    before: NodeJS.CpuUsage;
    after: NodeJS.CpuUsage;
    delta: {
      user: number;
      system: number;
    };
  };
  userAgent?: string;
  ip: string;
  timestamp: string;
}

/**
 * 🚀 性能监控中间件
 * 
 * 功能:
 * - 测量每个请求的响应时间
 * - 跟踪内存使用变化
 * - 监控 CPU 使用情况
 * - 自动检测并通知慢请求
 * - 生成结构化性能日志
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);
  private readonly slowResponseThreshold = 1000; // 1秒
  private readonly memoryLeakThreshold = 50 * 1024 * 1024; // 50MB
  
  // 性能统计
  private performanceStats = {
    totalRequests: 0,
    slowRequests: 0,
    averageResponseTime: 0,
    maxResponseTime: 0,
    totalResponseTime: 0,
  };

  use(req: Request, res: Response, next: NextFunction): void {
    // 记录请求开始时间
    const startTime = process.hrtime.bigint();
    const memoryUsageBefore = process.memoryUsage();
    const cpuUsageBefore = process.cpuUsage();

    // 生成请求 ID (如果不存在)
    if (!req.requestId) {
      req.requestId = this.generateRequestId();
    }

    // 初始化性能指标
    req.performanceMetrics = {
      startTime,
      memoryUsageBefore,
      cpuUsageBefore,
    };

    // 响应完成时收集性能数据
    res.on('finish', () => {
      this.collectPerformanceMetrics(req, res);
    });

    // 响应错误时也收集性能数据
    res.on('error', () => {
      this.collectPerformanceMetrics(req, res);
    });

    next();
  }

  /**
   * 📊 收集和分析性能指标
   */
  private collectPerformanceMetrics(req: Request, res: Response): void {
    if (!req.performanceMetrics) {
      return;
    }

    const endTime = process.hrtime.bigint();
    const memoryUsageAfter = process.memoryUsage();
    const cpuUsageAfter = process.cpuUsage(req.performanceMetrics.cpuUsageBefore);

    // 计算响应时间(毫秒)
    const duration = Number(endTime - req.performanceMetrics.startTime) / 1_000_000;

    // 计算内存使用变化
    const memoryDelta = {
      rss: memoryUsageAfter.rss - req.performanceMetrics.memoryUsageBefore.rss,
      heapUsed: memoryUsageAfter.heapUsed - req.performanceMetrics.memoryUsageBefore.heapUsed,
      heapTotal: memoryUsageAfter.heapTotal - req.performanceMetrics.memoryUsageBefore.heapTotal,
      external: memoryUsageAfter.external - req.performanceMetrics.memoryUsageBefore.external,
    };

    // 创建性能指标对象
    const metric: PerformanceMetric = {
      requestId: req.requestId || 'unknown',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Math.round(duration * 100) / 100, // 保留两位小数
      memoryUsage: {
        before: req.performanceMetrics.memoryUsageBefore,
        after: memoryUsageAfter,
        delta: memoryDelta,
      },
      cpuUsage: {
        before: req.performanceMetrics.cpuUsageBefore,
        after: cpuUsageAfter,
        delta: {
          user: cpuUsageAfter.user,
          system: cpuUsageAfter.system,
        },
      },
      userAgent: req.get('User-Agent'),
      ip: this.extractClientIp(req),
      timestamp: new Date().toISOString(),
    };

    // 更新统计数据
    this.updatePerformanceStats(metric);

    // 记录性能日志
    this.logPerformanceMetric(metric);

    // 检查性能警告条件
    this.checkPerformanceAlerts(metric);
  }

  /**
   * 📈 更新性能统计
   */
  private updatePerformanceStats(metric: PerformanceMetric): void {
    this.performanceStats.totalRequests++;
    this.performanceStats.totalResponseTime += metric.duration;
    this.performanceStats.averageResponseTime = 
      this.performanceStats.totalResponseTime / this.performanceStats.totalRequests;

    if (metric.duration > this.performanceStats.maxResponseTime) {
      this.performanceStats.maxResponseTime = metric.duration;
    }

    if (metric.duration > this.slowResponseThreshold) {
      this.performanceStats.slowRequests++;
    }
  }

  /**
   * 📝 记录性能日志
   */
  private logPerformanceMetric(metric: PerformanceMetric): void {
    const isSlowRequest = metric.duration > this.slowResponseThreshold;
    const hasMemoryLeak = metric.memoryUsage.delta.heapUsed > this.memoryLeakThreshold;

    // 基本性能日志
    if (process.env.NODE_ENV === 'development' || isSlowRequest) {
      this.logger.log(
        `🔍 [${metric.requestId}] ${metric.method} ${metric.url} ` +
        `${metric.statusCode} - ${metric.duration}ms ` +
        `(内存: ${this.formatBytes(metric.memoryUsage.delta.heapUsed)})`
      );
    }

    // 详细性能日志(慢请求或开发环境)
    if (isSlowRequest || process.env.NODE_ENV === 'development') {
      this.logger.debug('详细性能指标', {
        requestId: metric.requestId,
        duration: metric.duration,
        memory: {
          heap: this.formatBytes(metric.memoryUsage.delta.heapUsed),
          rss: this.formatBytes(metric.memoryUsage.delta.rss),
        },
        cpu: {
          user: `${metric.cpuUsage.delta.user}μs`,
          system: `${metric.cpuUsage.delta.system}μs`,
        },
      });
    }

    // 警告日志
    if (hasMemoryLeak) {
      this.logger.warn(
        `⚠️ 检测到内存使用急剧增加: ${this.formatBytes(metric.memoryUsage.delta.heapUsed)} ` +
        `(${metric.method} ${metric.url})`
      );
    }
  }

  /**
   * 🚨 检查性能警告并发送通知
   */
  private checkPerformanceAlerts(metric: PerformanceMetric): void {
    // 慢响应警告
    if (metric.duration > this.slowResponseThreshold) {
      this.sendSlowResponseAlert(metric);
    }

    // 内存泄漏警告
    if (metric.memoryUsage.delta.heapUsed > this.memoryLeakThreshold) {
      this.sendMemoryLeakAlert(metric);
    }

    // HTTP 错误警告
    if (metric.statusCode >= 500) {
      this.sendServerErrorAlert(metric);
    }
  }

  /**
   * 🐌 发送慢响应通知
   */
  private sendSlowResponseAlert(metric: PerformanceMetric): void {
    const message = `🐌 检测到慢响应
请求: ${metric.method} ${metric.url}
响应时间: ${metric.duration}ms (阈值: ${this.slowResponseThreshold}ms)
状态码: ${metric.statusCode}
请求 ID: ${metric.requestId}
时间: ${metric.timestamp}`;

    this.logger.warn(message);
    
    // Slack 通知(如果配置了环境变量)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(message);
    }
  }

  /**
   * 🧠 发送内存泄漏通知
   */
  private sendMemoryLeakAlert(metric: PerformanceMetric): void {
    const message = `🧠 内存使用急剧增加
请求: ${metric.method} ${metric.url}
内存增加: ${this.formatBytes(metric.memoryUsage.delta.heapUsed)}
当前堆使用量: ${this.formatBytes(metric.memoryUsage.after.heapUsed)}
请求 ID: ${metric.requestId}
时间: ${metric.timestamp}`;

    this.logger.warn(message);
    
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(message);
    }
  }

  /**
   * 💥 发送服务器错误通知
   */
  private sendServerErrorAlert(metric: PerformanceMetric): void {
    const message = `💥 发生服务器错误
请求: ${metric.method} ${metric.url}
状态码: ${metric.statusCode}
响应时间: ${metric.duration}ms
IP: ${metric.ip}
User-Agent: ${metric.userAgent}
请求 ID: ${metric.requestId}
时间: ${metric.timestamp}`;

    this.logger.error(message);
    
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(message);
    }
  }

  /**
   * 📱 发送 Slack 通知
   */
  private async sendSlackAlert(message: string): Promise<void> {
    try {
      // Slack webhook 实现(需要时)
      // await fetch(process.env.SLACK_WEBHOOK_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text: message })
      // });
    } catch (error) {
      this.logger.error('发送 Slack 通知失败', error);
    }
  }

  /**
   * 🆔 生成请求 ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🌐 提取客户端 IP
   */
  private extractClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    const realIp = req.headers['x-real-ip'] as string;

    return (
      cfConnectingIp ||
      forwardedFor?.split(',')[0]?.trim() ||
      realIp ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 📏 格式化字节单位
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(1);
    return `${bytes >= 0 ? '+' : ''}${size} ${sizes[i]}`;
  }

  /**
   * 📊 获取当前性能统计
   */
  getPerformanceStats() {
    const slowRequestRate = this.performanceStats.totalRequests > 0 
      ? (this.performanceStats.slowRequests / this.performanceStats.totalRequests) * 100 
      : 0;

    return {
      ...this.performanceStats,
      slowRequestRate: Math.round(slowRequestRate * 100) / 100,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }
}