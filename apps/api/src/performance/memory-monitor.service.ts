import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 📈 内存监控服务
 * 
 * 定期检查内存使用量，超过阈值时发出警告。
 * 包含自动垃圾回收功能。
 */
@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // 从环境变量加载配置
  private readonly memoryWarningThreshold: number;
  private readonly memoryCriticalThreshold: number;
  private readonly checkInterval: number;

  constructor(private readonly configService: ConfigService) {
    this.memoryWarningThreshold = parseInt(
      this.configService.get('MEMORY_WARNING_THRESHOLD', '100'),
      10
    );
    this.memoryCriticalThreshold = parseInt(
      this.configService.get('MEMORY_CRITICAL_THRESHOLD', '200'),
      10
    );
    this.checkInterval = parseInt(
      this.configService.get('MEMORY_CHECK_INTERVAL', '30000'),
      10
    );
  }

  /**
   * 模块初始化时启动内存监控
   */
  onModuleInit(): void {
    this.startMonitoring();
  }

  /**
   * 模块销毁时停止内存监控
   */
  onModuleDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * 启动内存监控
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.logger.warn('内存监控已在运行中');
      return;
    }

    this.logger.log(
      `🔍 开始内存监控 - 间隔: ${this.checkInterval/1000}秒, ` +
      `警告阈值: ${this.memoryWarningThreshold}MB, 危险阈值: ${this.memoryCriticalThreshold}MB`
    );
    
    // 定期检查内存
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    // 执行初始检查
    this.checkMemoryUsage();
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.log('⏹️ 内存监控已停止');
    }
  }

  /**
   * 检查内存使用量并进行阈值检测
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memoryUsage.external / 1024 / 1024);
    
    // 🚨 超过危险阈值 - 执行自动垃圾回收
    if (heapUsedMB > this.memoryCriticalThreshold) {
      this.logger.error(
        `🚨 危险: 内存达到危险水平! ` +
        `堆内存: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB, 外部内存: ${externalMB}MB`
      );
      
      this.executeGarbageCollection();
    } 
    // ⚠️ 超过警告阈值
    else if (heapUsedMB > this.memoryWarningThreshold) {
      this.logger.warn(
        `⚠️ 警告: 内存达到警告水平。` +
        `堆内存: ${heapUsedMB}MB/${heapTotalMB}MB, RSS: ${rssMB}MB, 外部内存: ${externalMB}MB`
      );
    }

    // 📊 调试日志（通过环境变量控制）
    if (this.configService.get('LOG_MEMORY') === 'true') {
      this.logger.debug(
        `💾 内存状态: 堆内存 ${heapUsedMB}MB/${heapTotalMB}MB, ` +
        `RSS ${rssMB}MB, 外部内存 ${externalMB}MB`
      );
    }
  }

  /**
   * 强制执行垃圾回收
   */
  private executeGarbageCollection(): void {
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      
      this.logger.log('🗑️ 正在执行垃圾回收...');
      global.gc();
      
      const afterGC = process.memoryUsage().heapUsed;
      const freedMB = Math.round((beforeGC - afterGC) / 1024 / 1024);
      
      this.logger.log(
        `🧹 垃圾回收完成: 释放 ${freedMB}MB ` +
        `(${Math.round(beforeGC / 1024 / 1024)}MB → ${Math.round(afterGC / 1024 / 1024)}MB)`
      );
    } else {
      this.logger.warn(
        '⚠️ 无法使用垃圾回收。' +
        '请使用 --expose-gc 标志启动 Node.js。'
      );
    }
  }

  /**
   * 返回当前内存状态
   */
  getCurrentMemoryStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    usage: ReturnType<typeof process.memoryUsage>;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    thresholds: {
      warning: number;
      critical: number;
    };
    uptime: number;
    timestamp: string;
  } {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memoryUsage.external / 1024 / 1024);

    // 状态判定
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (heapUsedMB > this.memoryCriticalThreshold) {
      status = 'critical';
    } else if (heapUsedMB > this.memoryWarningThreshold) {
      status = 'warning';
    }

    return {
      status,
      usage: memoryUsage,
      heapUsedMB,
      heapTotalMB,
      rssMB,
      externalMB,
      thresholds: {
        warning: this.memoryWarningThreshold,
        critical: this.memoryCriticalThreshold,
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 内存使用趋势分析
   */
  getMemoryTrend(): {
    current: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
    recommendation: string;
    healthScore: number;
  } {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    // 基于内存使用率计算健康分数
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
    let healthScore = 100;
    
    if (heapUsedMB > this.memoryCriticalThreshold) {
      healthScore = Math.max(0, 100 - (heapUsagePercent - 70) * 2);
    } else if (heapUsedMB > this.memoryWarningThreshold) {
      healthScore = Math.max(50, 100 - heapUsagePercent);
    } else {
      healthScore = Math.max(80, 100 - heapUsagePercent * 0.5);
    }

    // 生成建议
    let recommendation = '';
    if (heapUsedMB > this.memoryCriticalThreshold) {
      recommendation = '需要立即优化内存。建议检查并释放不必要的对象。';
    } else if (heapUsedMB > this.memoryWarningThreshold) {
      recommendation = '建议加强内存使用量监控。';
    } else {
      recommendation = '内存状态良好。';
    }

    return {
      current: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
      },
      recommendation,
      healthScore: Math.round(healthScore),
    };
  }
}
