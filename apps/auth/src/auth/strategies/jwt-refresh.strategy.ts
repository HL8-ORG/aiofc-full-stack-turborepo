import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtRefreshPayload } from '../interfaces/auth.interface';
import { RedisService } from '@repo/database';

/**
 * JWT 刷新令牌认证策略
 * 
 * @description
 * 实现 JWT 刷新令牌的验证策略。继承自 PassportStrategy 并使用 passport-jwt 包提供的 Strategy。
 * 
 * @mechanism
 * 1. 从请求头的 Authorization Bearer 中提取刷新令牌
 * 2. 验证令牌的有效性和过期状态
 * 3. 检查令牌是否存在于 Redis 中(防止重放攻击)
 * 4. 验证用户状态
 * 5. 返回用户信息用于生成新的访问令牌
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  /**
   * 构造函数 - 初始化 JWT 刷新令牌策略配置
   * 
   * @param configService - NestJS 配置服务
   * @param usersService - 用户服务
   * @param redisService - Redis 服务
   */
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Authorization Bearer 头提取令牌
      ignoreExpiration: false, // 不忽略令牌过期
      secretOrKey: configService.get<string>('jwt.refreshToken.secret'), // 使用刷新令牌密钥
    });
  }

  /**
   * 验证刷新令牌并返回用户信息
   * 
   * @param payload - JWT 刷新令牌的载荷数据
   * @returns 用于生成新访问令牌的用户信息
   * @throws UnauthorizedException 当令牌无效或用户状态异常时
   * 
   * @description
   * 1. 验证刷新令牌是否存在于 Redis 中
   * 2. 检查用户是否存在且处于活动状态
   * 3. 返回用于生成新访问令牌的用户信息
   */
  async validate(payload: JwtRefreshPayload) {
    try {
      // 检查刷新令牌是否存储在Redis中
      const isValid = await this.redisService.isRefreshTokenValid(payload.sub, payload.tokenId);
      if (!isValid) {
        throw new UnauthorizedException('刷新令牌无效');
      }

      // 查询用户
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('找不到用户');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('账户已停用');
      }

      return {
        userId: user.id,
        email: user.email,
        username: user.username,
        tokenId: payload.tokenId,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : '刷新令牌验证失败';
      throw new UnauthorizedException(errorMessage);
    }
  }
}
