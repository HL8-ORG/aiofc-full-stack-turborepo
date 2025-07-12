import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@repo/common';

/**
 * 🔐 JWT 认证策略
 * 
 * 验证 JWT 令牌并返回用户信息。
 * API 服务仅执行令牌验证，用户数据从令牌载荷中获取。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('jwt.secret');
    
    if (!jwtSecret) {
      throw new Error('未设置 JWT_SECRET 环境变量');
    }

    super({
      // 从请求头中提取 JWT 令牌
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间, 如果过期则抛出异常
      // 为了明确起见，我们选择默认的 false 设置，
      // 它将确保 JWT 没有过期的责任委托给 Passport 模块。
      // 这意味着，如果我们的路由提供了一个过期的 JWT ，请求将被拒绝，并发送 401 未经授权的响应。Passport 会自动为我们办理
      ignoreExpiration: false,
      // 使用配置的 JWT 密钥
      secretOrKey: jwtSecret,
      // 不传递请求对象到回调函数
      passReqToCallback: false,
    });

    this.logger.log('🔑 JWT 策略初始化完成');
  }

  /**
   * JWT 载荷验证并返回用户信息
   * 
   * @param payload JWT 载荷
   * @returns 验证后的用户信息
   */
  async validate(payload: JwtPayload) {
    try {
      this.logger.debug('开始验证 JWT 载荷:', { 
        sub: payload.sub,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat 
      });

      // 验证载荷基本结构
      if (!payload || typeof payload !== 'object') {
        this.logger.warn('无效的令牌结构');
        throw new UnauthorizedException('无效的令牌结构');
      }

      const { sub: userId, email, username, role } = payload;

      // 验证必填字段
      if (!userId) {
        this.logger.warn('令牌中缺少用户 ID');
        throw new UnauthorizedException('令牌中缺少用户 ID');
      }

      if (!email) {
        this.logger.warn('令牌中缺少邮箱');
        throw new UnauthorizedException('令牌中缺少邮箱信息');
      }

      // 验证令牌时间（额外安全）
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp <= now) {
        this.logger.warn('令牌已过期:', { exp: payload.exp, now });
        throw new UnauthorizedException('令牌已过期');
      }

      // 检查令牌签发时间（防止未来令牌）
      if (payload.iat && payload.iat > now + 60) { // 1分钟容差
        this.logger.warn('无效的令牌签发时间:', { iat: payload.iat, now });
        throw new UnauthorizedException('无效的令牌签发时间');
      }

      // 构建用户对象（兼容 JwtUser 接口）
      const user = {
        id: userId,
        email,
        username: username || email.split('@')[0], // 如果没有用户名则从邮箱生成
        role: role || 'user', // 默认值为 user (student 改为 user)
        
        // 额外元数据
        tokenIssuedAt: payload.iat,
        tokenExpiresAt: payload.exp,
        
        // 默认值设置
        isVerified: true, // API 只接受已验证的令牌，所以为 true
        isActive: true,   // API 只允许活跃用户访问，所以为 true
      };

      this.logger.debug(`✅ JWT 令牌验证成功 - 用户: ${userId} (${email})`);
      
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error('JWT 令牌验证过程中发生异常:', error);
      throw new UnauthorizedException('令牌验证过程中发生错误');
    }
  }
}
