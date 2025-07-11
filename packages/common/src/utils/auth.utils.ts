/**
 * 🔐 认证相关工具函数
 * 收集重复的认证逻辑的工具模块。
 */

import { BadRequestException } from '@nestjs/common';

/**
 * 提取客户端 IP 地址
 * 考虑代理、负载均衡器、CDN 环境的安全 IP 提取
 * 
 * @param req Express Request 对象
 * @returns 客户端的真实 IP 地址
 */
export function extractClientIp(req: any): string {
  // 按顺序检查各种代理头
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare
  const xClientIp = req.headers['x-client-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];

  // x-forwarded-for 可能包含多个以逗号分隔的 IP (第一个是实际客户端)
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // 检查其他头
  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (xClientIp) return xClientIp;

  // 直接连接的情况
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         '未知';
}

/**
 * 从 Authorization 头中提取 Bearer 令牌
 * 
 * @param req Express Request 对象
 * @returns JWT 令牌字符串
 * @throws UnauthorizedException 当没有 Bearer 令牌时
 */
export function extractBearerToken(req: any): string {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new BadRequestException('需要 Authorization 头');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new BadRequestException('Bearer 令牌格式不正确');
  }

  const token = authHeader.substring(7); // 移除 'Bearer '
  
  if (!token || token.trim() === '') {
    throw new BadRequestException('令牌为空');
  }

  return token.trim();
}

/**
 * 解析用户代理信息
 * 
 * @param userAgent User-Agent 头值
 * @returns 解析后的浏览器/设备信息
 */
export function parseUserAgent(userAgent?: string) {
  if (!userAgent) {
    return {
      browser: '未知',
      os: '未知',
      device: '未知',
      raw: '未知'
    };
  }

  // 简单的浏览器检测
  let browser = '未知';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // 简单的操作系统检测
  let os = '未知';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // 简单的设备检测
  let device = 'Desktop';
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';

  return {
    browser,
    os,
    device,
    raw: userAgent
  };
}

/**
 * 准备安全事件日志数据
 * 排除敏感信息，只提取必要信息
 * 
 * @param req Express Request 对象
 * @param additionalData 额外的日志数据
 * @returns 用于日志记录的安全数据
 */
export function prepareSecurityLogData(req: any, additionalData: any = {}) {
  const ip = extractClientIp(req);
  const userAgent = parseUserAgent(req.get('User-Agent'));
  
  return {
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown',
    ip,
    userAgent: userAgent.raw,
    browser: userAgent.browser,
    os: userAgent.os,
    device: userAgent.device,
    method: req.method,
    url: req.url,
    referer: req.get('Referer') || null,
    ...additionalData
  };
}

/**
 * 将时间字符串转换为秒数
 * 用于 JWT 过期时间等
 * 
 * @param timeString 时间字符串 (例如: '7d', '24h', '60m', '30s')
 * @returns 秒数
 * @throws BadRequestException 格式错误
 */
export function parseTimeString(timeString: string): number {
  const regex = /^(\d+)([dhms])$/;
  const match = timeString.match(regex);

  if (!match) {
    throw new BadRequestException(`时间格式错误: ${timeString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60; // 天
    case 'h': return value * 60 * 60;      // 小时
    case 'm': return value * 60;           // 分钟
    case 's': return value;                // 秒
    default:
      throw new BadRequestException(`不支持的时间单位: ${unit}`);
  }
}

/**
 * 密码强度检查
 * 
 * @param password 要检查的密码
 * @returns 强度分数和详细信息
 */
export function checkPasswordStrength(password: string) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[@$!%*?&]/.test(password),
    noCommonPatterns: !/(123|abc|password|admin)/i.test(password),
  };

  // 每个条件 1 分
  Object.values(checks).forEach(check => {
    if (check) score += 1;
  });

  // 额外分数 (根据长度)
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  const strength = score <= 3 ? '弱' : score <= 5 ? '中' : '强';

  return {
    score,
    maxScore: 8,
    strength,
    checks,
    suggestions: [
      !checks.length && '请输入至少 8 个字符',
      !checks.lowercase && '请包含小写字母',
      !checks.uppercase && '请包含大写字母',
      !checks.numbers && '请包含数字',
      !checks.symbols && '请包含特殊字符(@$!%*?&)',
      !checks.noCommonPatterns && '请避免常见模式(123, abc, password 等)',
      password.length < 12 && '使用 12 个以上字符会更安全',
    ].filter(Boolean),
  };
}

/**
 * 邮箱掩码处理
 * 为保护个人信息对邮箱部分进行掩码
 * 
 * @param email 要掩码的邮箱
 * @returns 掩码后的邮箱
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***@***.***';
  }

  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length <= 2 
    ? localPart 
    : localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length >= 2
    ? '*'.repeat(domainParts[0].length) + '.' + domainParts.slice(1).join('.')
    : '*'.repeat(domain.length);

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * 电话号码掩码处理
 * 
 * @param phone 要掩码的电话号码
 * @returns 掩码后的电话号码
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***-****-****';
  
  // 只提取数字
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11 && numbers.startsWith('01')) {
    // 韩国手机号码: 010-1234-5678 -> 010-****-5678
    return `${numbers.slice(0, 3)}-****-${numbers.slice(-4)}`;
  }
  
  // 其他号码只显示后 4 位
  return '*'.repeat(Math.max(0, numbers.length - 4)) + numbers.slice(-4);
}

/**
 * 返回安全的用户数据
 * 创建去除敏感信息的用户对象
 * 
 * @param user 原始用户对象
 * @returns 安全的用户对象
 */
export function sanitizeUser(user: any) {
  if (!user) return null;

  const {
    password,
    refreshTokens,
    resetToken,
    verificationToken,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    email: user.email, // 不掩码邮箱 (需要时单独处理)
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || user.lastLoginAt,
  };
}

/**
 * 请求大小限制检查
 * 
 * @param req Express Request 对象
 * @param maxSizeBytes 最大允许大小 (字节)
 * @throws BadRequestException 超出大小时
 */
export function validateRequestSize(req: any, maxSizeBytes: number = 1024 * 1024) { // 默认 1MB
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  
  if (contentLength > maxSizeBytes) {
    throw new BadRequestException(
      `请求大小过大。最大允许 ${Math.round(maxSizeBytes / 1024)}KB。`
    );
  }
}

/**
 * 创建速率限制键
 * 
 * @param identifier 标识符 (邮箱、IP 等)
 * @param action 动作类型
 * @returns Redis 键
 */
export function createRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${action}:${identifier}`;
}

/**
 * 生成设备指纹
 * 用于基本设备识别的哈希生成
 * 
 * @param req Express Request 对象
 * @returns 设备指纹字符串
 */
export function generateDeviceFingerprint(req: any): string {
  const ip = extractClientIp(req);
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  // 简单的哈希生成 (生产环境建议使用 crypto 模块)
  const fingerprint = Buffer.from(`${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`)
    .toString('base64')
    .slice(0, 16);
    
  return fingerprint;
}
