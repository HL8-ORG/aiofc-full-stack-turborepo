/**
 * @file performance.middleware.ts
 * @description 性能监控中间件,用于监控和分析请求性能指标
 * @module common/middleware/performance
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * @description 扩展 Express Request 接口,添加性能监控相关字段
 * @mechanism 通过 declare global 扩展全局类型定义
 */
declare global {
  namespace Express {
    interface Request {
      /** 请求唯一标识 */
      requestId?: string;
      /** 请求开始时间 */
      startTime?: bigint;
      /** 性能指标数据 */
      performanceMetrics?: {
        /** 开始时间戳 */
        startTime: bigint;
        /** 内存使用基准值 */
        memoryUsageBefore: NodeJS.MemoryUsage;
        /** CPU使用基准值 */
        cpuUsageBefore: NodeJS.CpuUsage;
      };
    }
  }
}

/**
 * @interface PerformanceMetric
 * @description 性能指标数据结构
 * @mechanism 记录请求的完整性能数据,包括:
 * - 基本信息(ID、方法、URL等)
 * - 时间指标(响应时间)
 * - 资源使用(内存、CPU)
 * - 客户端信息(IP、UA)
 */
interface PerformanceMetric {
  /** 请求唯一标识 */
  requestId: string;
  /** HTTP 方法 */
  method: string;
  /** 请求URL */
  url: string;
  /** HTTP状态码 */
  statusCode: number;
  /** 响应时间(毫秒) */
  duration: number;
  /** 内存使用情况 */
  memoryUsage: {
    /** 请求开始时内存使用 */
    before: NodeJS.MemoryUsage;
    /** 请求结束时内存使用 */
    after: NodeJS.MemoryUsage;
    /** 内存使用变化 */
    delta: {
      /** 常驻集大小变化 */
      rss: number;
      /** 已用堆内存变化 */
      heapUsed: number;
      /** 总堆内存变化 */
      heapTotal: number;
      /** 外部内存变化 */
      external: number;
    };
  };
  /** CPU使用情况 */
  cpuUsage: {
    /** 请求开始时CPU使用 */
    before: NodeJS.CpuUsage;
    /** 请求结束时CPU使用 */
    after: NodeJS.CpuUsage;
    /** CPU使用变化 */
    delta: {
      /** 用户CPU时间变化 */
      user: number;
      /** 系统CPU时间变化 */
      system: number;
    };
  };
  /** 用户代理字符串 */
  userAgent?: string;
  /** 客户端IP */
  ip: string;
  /** 时间戳 */
  timestamp: string;
}

/**
 * @class PerformanceMiddleware
 * @description 性能监控中间件类
 * @mechanism 通过以下机制实现性能监控:
 * 1. 请求生命周期跟踪
 * 2. 资源使用监控
 * 3. 性能指标收集
 * 4. 异常情况告警
 * 5. 数据统计分析
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  /** 日志记录器实例 */
  private readonly logger = new Logger(PerformanceMiddleware.name);
  /** 慢响应阈值(毫秒) */
  private readonly slowResponseThreshold = 1000;
  /** 内存泄漏阈值(字节) */
  private readonly memoryLeakThreshold = 50 * 1024 * 1024;
  
  /** 
   * 性能统计数据
   * @mechanism 记录全局性能指标,用于分析系统整体表现
   */
  private performanceStats = {
    /** 总请求数 */
    totalRequests: 0,
    /** 慢请求数 */
    slowRequests: 0,
    /** 平均响应时间 */
    averageResponseTime: 0,
    /** 最大响应时间 */
    maxResponseTime: 0,
    /** 总响应时间 */
    totalResponseTime: 0,
  };

  /**
   * @description 中间件主函数,处理每个HTTP请求
   * @mechanism 
   * 1. 记录请求开始时的基准数据
   * 2. 生成请求唯一标识
   * 3. 注册响应完成和错误事件处理
   */
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
   * @description 收集和分析性能指标
   * @mechanism 
   * 1. 计算响应时间
   * 2. 计算资源使用变化
   * 3. 生成完整性能指标
   * 4. 更新统计数据
   * 5. 记录性能日志
   * 6. 检查性能警告
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
   * @description 更新性能统计数据
   * @mechanism 
   * 1. 累计请求计数
   * 2. 计算平均响应时间
   * 3. 更新最大响应时间
   * 4. 统计慢请求数量
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
   * @description 记录性能日志
   * @mechanism 
   * 1. 根据环境和性能指标决定日志级别
   * 2. 记录基本性能日志
   * 3. 记录详细性能指标
   * 4. 记录警告日志
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
   * @description 检查性能警告并发送通知
   * @mechanism 监控三种异常情况:
   * 1. 慢响应
   * 2. 内存泄漏
   * 3. 服务器错误
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
   * @description 发送慢响应通知
   * @mechanism 通过日志和Slack(如果配置)发送警告
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
   * @description 发送内存泄漏通知
   * @mechanism 通过日志和Slack(如果配置)发送警告
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
   * @description 发送服务器错误通知
   * @mechanism 通过日志和Slack(如果配置)发送警告
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
   * @description 发送Slack通知
   * @mechanism 通过Webhook发送消息到Slack频道
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
   * @description 生成请求唯一标识
   * @mechanism 使用时间戳和随机字符串组合生成
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * @description 提取客户端IP地址
   * @mechanism 按优先级尝试不同的IP来源:
   * 1. Cloudflare IP
   * 2. X-Forwarded-For
   * 3. X-Real-IP
   * 4. 连接远程地址
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
   * @description 格式化字节数为可读字符串
   * @mechanism 自动选择合适的单位(B、KB、MB、GB)
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
   * @description 获取当前性能统计数据
   * @mechanism 返回聚合的性能指标和系统状态
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