import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PerformanceDashboardController } from './performance-dashboard.controller';
import { PerformanceService } from './performance.service';
import { PerformanceMiddleware } from './performance.middleware';
import { MemoryMonitorService } from './memory-monitor.service';

/**
 * 📊 性能监控模块
 * 
 * 功能:
 * - 提供实时性能指标
 * - 系统健康检查
 * - 内存和CPU监控
 * - 慢接口分析
 * - 性能数据收集中间件
 */
@Module({
  imports: [ConfigModule],
  controllers: [PerformanceDashboardController],
  providers: [
    PerformanceService,
    PerformanceMiddleware,
    MemoryMonitorService,
  ],
  exports: [
    PerformanceService,
    PerformanceMiddleware,
    MemoryMonitorService,
  ],
})
export class PerformanceModule {}
