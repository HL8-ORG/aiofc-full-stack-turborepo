import { registerAs } from '@nestjs/config';

/**
 * Redis 配置模块
 * 
 * @description
 * 该模块提供了 Redis 数据库的连接配置选项。
 * Redis 是一个开源的内存数据结构存储系统,可用作数据库、缓存、消息代理等。
 * 
 * @mechanism
 * 1. 基础连接配置:
 *    - host: Redis 服务器主机地址
 *    - port: Redis 服务器端口
 *    - password: 认证密码
 *    - db: 数据库索引号(0-15)
 * 
 * 2. 连接优化设置:
 *    - maxRetriesPerRequest: 每个请求的最大重试次数,提高可靠性
 *    - lazyConnect: 延迟连接模式,仅在首次使用时建立连接
 * 
 * @security
 * - 使用环境变量配置敏感信息
 * - 提供默认值作为降级方案
 * - 支持密码认证
 */
export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0'),
  // 连接优化设置
  maxRetriesPerRequest: 3, // 提高连接可靠性
  lazyConnect: true, // 优化启动性能
}));
