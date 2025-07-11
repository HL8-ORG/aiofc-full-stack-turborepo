import { registerAs } from '@nestjs/config';

/**
 * 🔐 安全相关配置
 * 定义防止暴力破解攻击、会话管理等安全策略
 */
export default registerAs('security', () => ({
  // 🛡️ 防暴力破解攻击设置
  bruteForce: {
    // 最大登录尝试次数
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    
    // 账户锁定时长(分钟)
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
    
    // 每个IP的最大尝试次数
    maxIpAttempts: parseInt(process.env.MAX_IP_ATTEMPTS || '10', 10),
  },

  // ⏱️ 会话管理设置
  session: {
    // 会话过期检查间隔(分钟)
    cleanupIntervalMinutes: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '60', 10),
    
    // 非活动会话过期时间(小时)
    inactiveTimeoutHours: parseInt(process.env.INACTIVE_TIMEOUT_HOURS || '24', 10),
  },

  // 🔑 令牌管理设置
  token: {
    // 令牌黑名单清理间隔(分钟)
    blacklistCleanupMinutes: parseInt(process.env.TOKEN_BLACKLIST_CLEANUP || '30', 10),
    
    // 启用刷新令牌轮换
    enableRefreshRotation: process.env.ENABLE_REFRESH_ROTATION === 'true',
  },

  // 🌐 CORS设置
  cors: {
    // 允许的源列表
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ],
    
    // 允许携带凭证
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // 📝 日志设置
  logging: {
    // 是否记录敏感信息(仅在开发环境)
    logSensitiveData: process.env.NODE_ENV === 'development' && 
                     process.env.LOG_SENSITIVE_DATA === 'true',
    
    // 启用登录尝试日志记录
    logAuthAttempts: process.env.LOG_AUTH_ATTEMPTS !== 'false',
  },

  // 🔒 加密设置
  encryption: {
    // bcrypt加密轮数
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    
    // 数据加密密钥轮换(天)
    keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '30', 10),
  },

  // 🚨 安全事件通知
  alerts: {
    // 启用邮件通知
    emailAlerts: process.env.SECURITY_EMAIL_ALERTS === 'true',
    
    // Slack Webhook地址
    slackWebhook: process.env.SECURITY_SLACK_WEBHOOK,
    
    // 可疑活动阈值
    suspiciousActivityThreshold: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || '10', 10),
  },
}));