import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload, JwtUser } from '@repo/common';
import { RedisService } from '@repo/database';

/**
 * 🔑 增强的 JWT 认证策略
 * 
 * 主要功能:
 * - JWT 令牌验证和用户认证
 * - 令牌黑名单检查
 * - 用户账户状态验证
 * - 安全日志和监控
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    const secret = configService.get<string>('jwt.accessToken.secret') || 
                   process.env.JWT_ACCESS_SECRET || 
                   'default-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });

    this.logger.log(`🔗 JWT 策略初始化完成 - 密钥: ${secret.substring(0, 8)}...`);
  }

  /**
   * JWT 令牌验证和用户认证
   * @param req HTTP 请求对象
   * @param payload JWT 载荷
   * @returns 认证后的用户信息
   */
  async validate(req: any, payload: JwtPayload): Promise<JwtUser> {
    try {
      const startTime = Date.now();
      
      // 开发环境下的调试日志
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`JWT 验证开始 - 用户 ID: ${payload.sub}`);
        this.logger.debug(`载荷: ${JSON.stringify(payload)}`);
      }
      
      // 检查令牌是否在黑名单中
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (token && await this.redisService.isBlacklisted(token)) {
        this.logger.warn(`尝试使用黑名单令牌 - 用户: ${payload.sub}`);
        throw new UnauthorizedException('令牌已失效');
      }

      // 查询用户（为优化性能只选择必要字段）
      const user = await this.usersService.findById(payload.sub, {
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          isActive: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        this.logger.warn(`未找到用户 - ID: ${payload.sub}`);
        throw new UnauthorizedException('未找到用户');
      }

      if (!user.isActive) {
        this.logger.warn(`尝试访问已停用账户 - 用户: ${user.email}`);
        throw new UnauthorizedException('账户已停用');
      }

      const validationTime = Date.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`认证成功 - 用户: ${user.email}, 耗时: ${validationTime}ms`);
      }

      // 返回认证后的用户信息（将被设置到 request.user）
      const jwtUser: JwtUser = {
        userId: user.id, // 统一 Guard 中使用的字段名
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };

      return jwtUser;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : '令牌验证失败';
      this.logger.error(`JWT 验证失败 - 用户: ${payload?.sub || '未知'}:`, error);
      
      throw new UnauthorizedException(errorMessage);
    }
  }
}
