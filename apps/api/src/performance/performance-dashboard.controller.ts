import { Controller, Get, Query } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { MemoryMonitorService } from './memory-monitor.service';

/**
 * 📊 性能仪表盘控制器
 * 
 * 功能:
 * - 实时性能指标查询
 * - 慢接口分析
 * - 系统资源监控
 * - 内存监控和分析
 * - 性能警告和通知管理
 */
@Controller('admin/performance')
export class PerformanceDashboardController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly memoryMonitorService: MemoryMonitorService
  ) {}
  
  /**
   * 📈 获取全部性能指标
   */
  @Get('metrics')
  async getPerformanceMetrics() {
    const metrics = this.performanceService.getPerformanceMetrics();
    
    return {
      message: '性能指标获取成功',
      data: metrics,
      optimized: true, // 优化完成标记
    };
  }

  /**
   * 🐌 慢接口分析
   */
  @Get('slow-endpoints')
  async getSlowEndpoints(
    @Query('limit') limit: string = '10',
    @Query('threshold') threshold: string = '1000'
  ) {
    const slowEndpoints = this.performanceService.getSlowEndpoints(
      parseInt(limit), 
      parseInt(threshold)
    );

    return {
      message: '慢接口分析完成',
      data: slowEndpoints,
    };
  }

  /**
   * 💾 内存使用状态
   */
  @Get('memory')
  async getMemoryStatus() {
    const memoryStatus = this.memoryMonitorService.getCurrentMemoryStatus();
    const memoryTrend = this.memoryMonitorService.getMemoryTrend();

    return {
      message: '内存状态获取成功',
      data: {
        current: memoryStatus,
        trend: memoryTrend,
      },
    };
  }

  /**
   * 📊 内存使用历史
   */
  @Get('memory-usage')
  async getMemoryUsage(@Query('period') period: string = '1h') {
    const memoryData = this.performanceService.getMemoryUsageHistory(period);

    return {
      message: '内存使用量获取成功',
      data: memoryData,
    };
  }

  /**
   * 📊 系统健康检查
   */
  @Get('health')
  async getSystemHealth() {
    const healthData = this.performanceService.getSystemHealth();
    const memoryStatus = this.memoryMonitorService.getCurrentMemoryStatus();
    
    return {
      message: '系统健康检查完成',
      data: {
        ...healthData,
        memory: {
          ...healthData.details.memory,
          monitoring: memoryStatus.status,
          thresholds: memoryStatus.thresholds,
        },
      },
    };
  }

  /**
   * 🔄 内存监控控制
   */
  @Get('memory/restart-monitoring')
  async restartMemoryMonitoring() {
    this.memoryMonitorService.stopMonitoring();
    this.memoryMonitorService.startMonitoring();
    
    return {
      message: '内存监控重启完成',
      data: {
        status: 'restarted',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
