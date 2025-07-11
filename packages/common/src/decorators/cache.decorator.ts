import { SetMetadata } from '@nestjs/common';

/**
 * 🚀 缓存元数据常量
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * 📦 缓存键和 TTL 设置装饰器
 * 
 * @param key 缓存键 (支持动态参数: {userId}, {courseId} 等)
 * @param ttl TTL(Time To Live) - 以秒为单位
 * 
 * @example
 * ```typescript
 * @Cacheable('user-courses:{userId}', 300) // 缓存5分钟
 * async getUserCourses(userId: string) {
 *   return await this.findCourses(userId);
 * }
 * ```
 */
export const Cacheable = (key: string, ttl: number = 300) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyName, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyName, descriptor);
  };
};

/**
 * 🗑️ 缓存失效装饰器
 * 
 * @param keys 要失效的缓存键模式数组
 * 
 * @example
 * ```typescript
 * @CacheEvict(['user-courses:{userId}', 'course-stats:{courseId}'])
 * async updateCourseProgress(userId: string, courseId: string) {
 *   // 更新逻辑
 * }
 * ```
 */
export const CacheEvict = (keys: string[]) => {
  return SetMetadata('cache:evict', keys);
};

/**
 * 🔄 缓存更新装饰器
 * 方法执行后将结果存入缓存
 * 
 * @param key 缓存键
 * @param ttl TTL(Time To Live) - 以秒为单位
 */
export const CachePut = (key: string, ttl: number = 300) => {
  return SetMetadata('cache:put', { key, ttl });
};