import { Injectable, Logger } from '@nestjs/common';

/**
 * 🏠 API 主服务
 * 
 * 提供系统信息和健康检查功能
 */
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello() {
    return 'Hello BetterAuth!';
  }
}
