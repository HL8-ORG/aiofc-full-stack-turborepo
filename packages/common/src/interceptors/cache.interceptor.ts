import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator';

/**
 * 🚀 Redis 缓存拦截器
 * 
 * 功能:
 * - 方法调用前检查缓存
 * - 缓存未命中时执行方法并缓存结果
 * - 动态缓存键生成(参数替换)
 * - 基于 TTL 的过期管理
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: any // 需要注入 Redis 服务
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());

    // 如果没有缓存设置则直接执行
    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const methodArgs = context.getArgs();
    
    // 生成动态缓存键
    const dynamicCacheKey = this.buildCacheKey(cacheKey, methodArgs, request);

    this.logger.debug(`检查缓存: ${dynamicCacheKey}`);

    // 从缓存中查询数据
    return from(this.getFromCache(dynamicCacheKey)).pipe(
      switchMap((cachedResult) => {
        if (cachedResult !== null) {
          this.logger.debug(`缓存命中: ${dynamicCacheKey}`);
          return of(cachedResult);
        }

        this.logger.debug(`缓存未命中: ${dynamicCacheKey}`);
        
        // 缓存未命中时执行实际方法
        return next.handle().pipe(
          tap((result) => {
            // 将结果存入缓存
            this.saveToCache(dynamicCacheKey, result, cacheTtl);
          })
        );
      })
    );
  }

  /**
   * 🔑 生成动态缓存键
   * 
   * @param template 缓存键模板 (例如: 'user-courses:{userId}')
   * @param args 方法参数
   * @param request HTTP 请求对象
   * @returns 实际缓存键
   */
  private buildCacheKey(template: string, args: any[], request: any): string {
    let cacheKey = template;

    // 从 URL 参数中提取值
    const params = request.params || {};
    const query = request.query || {};
    const user = request.user || {};

    // 参数替换
    cacheKey = cacheKey.replace(/\{(\w+)\}/g, (match, key) => {
      // 从方法参数中查找(第一个参数通常是 ID)
      if (args.length > 0 && key === 'userId' && typeof args[0] === 'string') {
        return args[0];
      }
      if (args.length > 1 && key === 'courseId' && typeof args[1] === 'string') {
        return args[1];
      }
      
      // 从 URL 参数中查找
      if (params[key]) {
        return params[key];
      }
      
      // 从查询参数中查找
      if (query[key]) {
        return query[key];
      }
      
      // 从用户信息中查找
      if (user[key]) {
        return user[key];
      }
      
      // 返回默认值
      return key;
    });

    return cacheKey;
  }

  /**
   * 📦 从缓存中查询数据
   */
  private async getFromCache(key: string): Promise<any> {
    try {
      if (!this.redisService) {
        return null;
      }

      const cached = await this.redisService.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`缓存查询失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 💾 将数据存入缓存
   */
  private async saveToCache(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      if (!this.redisService) {
        return;
      }

      await this.redisService.setex(key, ttl, JSON.stringify(data));
      this.logger.debug(`缓存保存: ${key} (TTL: ${ttl}秒)`);
    } catch (error) {
      this.logger.warn(`缓存保存失败: ${key}`, error);
    }
  }
}

/**
 * 🗑️ 缓存失效拦截器
 */
@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheEvictInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: any
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const evictKeys = this.reflector.get<string[]>('cache:evict', context.getHandler());

    if (!evictKeys || evictKeys.length === 0) {
      return next.handle();
    }

    // 方法执行后使缓存失效
    return next.handle().pipe(
      tap(() => {
        this.evictCache(evictKeys, context);
      })
    );
  }

  /**
   * 🗑️ 执行缓存失效
   */
  private async evictCache(keyPatterns: string[], context: ExecutionContext): Promise<void> {
    try {
      if (!this.redisService) {
        return;
      }

      const request = context.switchToHttp().getRequest();
      const methodArgs = context.getArgs();

      for (const pattern of keyPatterns) {
        // 生成动态键(与 CacheInterceptor 相同的逻辑)
        const cacheKey = this.buildCacheKey(pattern, methodArgs, request);
        
        // 通过模式匹配删除多个键
        if (cacheKey.includes('*')) {
          const keys = await this.redisService.keys(cacheKey);
          if (keys.length > 0) {
            await this.redisService.del(...keys);
            this.logger.debug(`缓存失效(模式): ${cacheKey} (${keys.length}个键)`);
          }
        } else {
          await this.redisService.del(cacheKey);
          this.logger.debug(`缓存失效: ${cacheKey}`);
        }
      }
    } catch (error) {
      this.logger.warn('缓存失效失败', error);
    }
  }

  /**
   * 🔑 生成动态缓存键(与 CacheInterceptor 相同)
   */
  private buildCacheKey(template: string, args: any[], request: any): string {
    let cacheKey = template;

    const params = request.params || {};
    const query = request.query || {};
    const user = request.user || {};

    cacheKey = cacheKey.replace(/\{(\w+)\}/g, (match, key) => {
      if (args.length > 0 && key === 'userId' && typeof args[0] === 'string') {
        return args[0];
      }
      if (args.length > 1 && key === 'courseId' && typeof args[1] === 'string') {
        return args[1];
      }
      if (params[key]) return params[key];
      if (query[key]) return query[key];
      if (user[key]) return user[key];
      return key;
    });

    return cacheKey;
  }
}