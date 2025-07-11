import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis 服务
 * - JWT 令牌黑名单管理
 * - 刷新令牌的存储和验证
 * - 登录尝试次数管理（防止暴力破解）
 * - 通用缓存功能
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis!: Redis; // 使用明确的赋值断言

  constructor(private configService: ConfigService) {}

  /**
   * 模块初始化时设置 Redis 连接
   */
  async onModuleInit() {
    try {
      this.redis = new Redis({
        host: this.configService.get('redis.host'),
        port: this.configService.get('redis.port'),
        password: this.configService.get('redis.password'),
        db: this.configService.get('redis.db'),
        maxRetriesPerRequest: this.configService.get('redis.maxRetriesPerRequest'),
        lazyConnect: this.configService.get('redis.lazyConnect'),
      });

      this.redis.on('connect', () => {
        this.logger.log('已连接到 Redis');
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis 连接错误:', err);
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Redis 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 模块销毁时断开 Redis 连接
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.disconnect();
      this.logger.log('Redis 连接已断开');
    }
  }

  /**
   * 将令牌添加到黑名单
   * @param token JWT 令牌
   * @param expiresIn 过期时间（秒）
   */
  async addToBlacklist(token: string, expiresIn: number): Promise<void> {
    const key = this.getBlacklistKey(token);
    await this.redis.setex(key, expiresIn, 'blacklisted');
    this.logger.log(`令牌已添加到黑名单: ${token.substring(0, 20)}...`);
  }

  /**
   * 检查令牌是否在黑名单中
   * @param token JWT 令牌
   * @returns 是否在黑名单中
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = this.getBlacklistKey(token);
    const result = await this.redis.get(key);
    return result !== null;
  }

  /**
   * 将用户的所有刷新令牌添加到黑名单（登出时）
   * @param userId 用户 ID
   */
  async blacklistUserTokens(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`用户 ${userId} 的所有刷新令牌已失效`);
    }
  }

  /**
   * 存储刷新令牌
   * @param userId 用户 ID
   * @param tokenId 令牌 ID
   * @param expiresIn 过期时间（秒）
   */
  async storeRefreshToken(userId: string, tokenId: string, expiresIn: number): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    await this.redis.setex(key, expiresIn, 'valid');
    this.logger.debug(`刷新令牌已存储: ${userId}`);
  }

  /**
   * 验证刷新令牌的有效性
   * @param userId 用户 ID
   * @param tokenId 令牌 ID
   * @returns 是否有效
   */
  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    const key = `refresh_token:${userId}:${tokenId}`;
    const result = await this.redis.get(key);
    return result === 'valid';
  }

  /**
   * 删除特定的刷新令牌
   * @param userId 用户 ID
   * @param tokenId 令牌 ID
   */
  async removeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = `refresh_token:${userId}:${tokenId}`;
    await this.redis.del(key);
    this.logger.debug(`刷新令牌已删除: ${userId}:${tokenId}`);
  }

  /**
   * 管理登录尝试次数（防止暴力破解）
   * @param identifier 标识符（IP 地址或邮箱）
   * @param windowSeconds 时间窗口（秒）
   * @returns 当前尝试次数
   */
  async incrementLoginAttempts(identifier: string, windowSeconds: number = 900): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return attempts;
  }

  /**
   * 查询登录尝试次数
   * @param identifier 标识符
   * @returns 尝试次数
   */
  async getLoginAttempts(identifier: string): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const attempts = await this.redis.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  /**
   * 重置登录尝试次数
   * @param identifier 标识符
   */
  async resetLoginAttempts(identifier: string): Promise<void> {
    const key = `login_attempts:${identifier}`;
    await this.redis.del(key);
  }

  /**
   * 设置通用缓存
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒）
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 查询缓存
   * @param key 键
   * @returns 值
   */
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * 删除缓存
   * @param key 键
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 生成黑名单键
   * @param token 令牌
   * @returns Redis 键
   */
  private getBlacklistKey(token: string): string {
    return `blacklist:${token}`;
  }

  /**
   * 返回 Redis 客户端（高级用法）
   * @returns Redis 客户端
   */
  getClient(): Redis {
    return this.redis;
  }
}
