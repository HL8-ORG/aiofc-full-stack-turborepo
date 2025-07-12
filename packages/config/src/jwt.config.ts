import { registerAs } from '@nestjs/config';

/**
 * JWT (JSON Web Token) 配置模块
 * 
 * @description
 * 该模块提供了JWT相关的配置选项,包括访问令牌和刷新令牌的配置。
 * JWT是一种基于JSON的开放标准(RFC 7519),用于在各方之间安全地传输信息。
 * 
 * @mechanism
 * 1. 基本配置:
 *    - secret: 用于签名token的密钥
 *    - expiresIn: token的有效期
 * 
 * 2. 双令牌机制:
 *    - accessToken: 短期访问令牌,用于API访问认证
 *    - refreshToken: 长期刷新令牌,用于获取新的accessToken
 * 
 * @security
 * - 使用环境变量配置敏感信息
 * - 提供默认值作为降级方案
 * - 支持向下兼容的配置结构
 */
export default registerAs('jwt', () => ({
  // 基础JWT配置(向下兼容旧版本)
  secret:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'jwt-access-secret',
  expiresIn:
    process.env.JWT_EXPIRESIN || 
    process.env.JWT_ACCESS_EXPIRES_IN || 
    '24h',

  // 访问令牌(Access Token)配置
  accessToken: {
    secret:
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      'jwt-access-secret',
    expiresIn:
      process.env.JWT_EXPIRESIN || 
      process.env.JWT_ACCESS_EXPIRES_IN || 
      '24h',
  },

  // 刷新令牌(Refresh Token)配置
  refreshToken: {
    secret:
      process.env.REFRESH_TOKEN_SECRET ||
      process.env.JWT_REFRESH_SECRET ||
      'jwt-refresh-secret',
    expiresIn: 
      process.env.JWT_REFRESH_EXPIRES_IN || 
      '7d',
  },
}));
