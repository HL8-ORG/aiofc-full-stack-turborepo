import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    return 'NestJS 认证系统正在正常运行中!';
  }

  getHealthCheck() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        readable: this.formatUptime(uptime),
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      environment: this.configService.get('NODE_ENV') || 'development',
      version: '1.0.0',
      services: {
        database: 'PostgreSQL',
        cache: 'Redis',
        authentication: 'JWT',
      },
    };
  }

  private formatUptime(uptime: number): string {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟 ${seconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}
