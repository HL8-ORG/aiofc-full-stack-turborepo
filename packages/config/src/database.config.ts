import { registerAs } from '@nestjs/config';

/**
 * 数据库配置模块
 * 
 * @description
 * 该模块提供了数据库连接及连接池的配置选项。
 * 支持通过环境变量动态配置数据库连接信息。
 * 
 * @mechanism
 * 1. 数据库连接:
 *    - url: 数据库连接字符串,包含认证信息和连接参数
 * 
 * 2. 连接池机制:
 *    - min: 连接池保持的最小连接数
 *    - max: 连接池允许的最大连接数
 *    - acquireTimeoutMillis: 获取连接的超时时间
 *    - idleTimeoutMillis: 空闲连接的超时时间
 * 
 * @optimization
 * - 通过连接池复用数据库连接,减少连接开销
 * - 自动管理连接生命周期,提高系统性能
 * - 支持连接超时控制,增强系统稳定性
 */
export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  // 连接池配置
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
}));
