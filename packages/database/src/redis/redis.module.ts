import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis 全局模块
 * - 设置为全局模块以便在整个应用程序中使用
 * - 负责管理 JWT 令牌黑名单、刷新令牌、登录尝试次数等
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
