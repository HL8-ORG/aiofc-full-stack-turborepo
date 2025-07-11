import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // 基本 JWT 配置 (向下兼容)
  secret:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'jwt-access-secret',
  expiresIn:
    process.env.JWT_EXPIRESIN || 
    process.env.JWT_ACCESS_EXPIRES_IN || 
    '24h',

  // JWT 访问令牌配置 (详细配置)
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

  // JWT 刷新令牌配置
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
