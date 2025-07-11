import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 🔒 增强型 JWT 认证守卫
 *
 * 主要功能:
 * - JWT 令牌验证和用户认证
 * - 支持 @Public() 装饰器以允许公开端点
 * - 令牌过期时提供清晰的错误消息
 * - 安全日志记录和监控
 * - 为自动令牌更新设置响应头
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
    
    // 检查 Reflector 依赖注入
    if (!this.reflector) {
      this.logger.error('Reflector 依赖注入失败!');
      throw new Error('Reflector 未被注入。请检查模块配置。');
    }
  }

  /**
   * 检查是否需要认证
   * 如果有 @Public() 装饰器则跳过认证
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // 检查 @Public() 装饰器 (安全访问)
      const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

      if (isPublic) {
        this.logger.debug('访问公开端点 - 跳过认证');
        return true;
      }

      // 调用父类的 canActivate
      const result = super.canActivate(context);
      
      // 如果是 Promise 则等待处理
      if (result instanceof Promise) {
        return await result;
      }
      
      return result as boolean;
    } catch (error) {
      this.logger.error('执行 canActivate 时出错:', error);
      return false;
    }
  }

  /**
   * 处理认证结果
   * 令牌过期时向客户端添加更新提示头
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const response = context.switchToHttp().getResponse();
      const token = this.extractTokenFromRequest(request);
      const userAgent = request.get('User-Agent') || '未知';
      const clientIp = this.getClientIp(request);

      // 如果有错误或用户不存在则抛出异常
      if (err || !user) {
        if (!token) {
          this.logger.warn(`无令牌 - IP: ${clientIp}, UA: ${userAgent}`);
          throw new UnauthorizedException({
            code: 'NO_TOKEN',
            message: '需要访问令牌',
            action: 'LOGIN_REQUIRED'
          });
        }

        // 处理令牌过期
        if (info?.name === 'TokenExpiredError') {
          this.logger.warn(`令牌过期 - IP: ${clientIp}, UA: ${userAgent}`);
          
          // 通知客户端需要更新令牌
          this.setTokenExpiredHeaders(response);
          
          throw new UnauthorizedException({
            code: 'TOKEN_EXPIRED',
            message: '访问令牌已过期',
            action: 'REFRESH_TOKEN',
            refreshEndpoint: '/api/auth/refresh'
          });
        }

        // 处理无效令牌
        if (info?.name === 'JsonWebTokenError') {
          this.logger.warn(`无效令牌 - IP: ${clientIp}, UA: ${userAgent}`);
          throw new UnauthorizedException({
            code: 'INVALID_TOKEN',
            message: '令牌无效',
            action: 'LOGIN_REQUIRED'
          });
        }

        // 令牌尚未激活
        if (info?.name === 'NotBeforeError') {
          this.logger.warn(`令牌尚未激活 - IP: ${clientIp}`);
          throw new UnauthorizedException({
            code: 'TOKEN_NOT_ACTIVE',
            message: '令牌尚未激活',
            action: 'LOGIN_REQUIRED'
          });
        }

        // 其他认证错误
        this.logger.error(`认证失败 - IP: ${clientIp}, 错误:`, err);
        throw err || new UnauthorizedException({
          code: 'AUTH_FAILED',
          message: '认证失败',
          action: 'LOGIN_REQUIRED'
        });
      }

      // 认证成功日志
      this.logger.debug(`认证成功 - 用户: ${user.userId || user.email}, IP: ${clientIp}`);
      
      // 检查令牌更新建议时间点
      this.checkTokenRefreshRecommendation(token, response);

      return user;
    } catch (error) {
      this.logger.error('执行 handleRequest 时出错:', error);
      throw error instanceof UnauthorizedException 
        ? error 
        : new UnauthorizedException('处理认证时发生错误');
    }
  }

  /**
   * 从请求中提取 JWT 令牌
   */
  private extractTokenFromRequest(request: any): string | null {
    const authHeader = request.headers?.authorization;
    
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 提取客户端 IP 地址
   */
  private getClientIp(request: any): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const realIp = request.headers?.['x-real-ip'];
    
    return (
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]) ||
      realIp ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '未知'
    );
  }

  /**
   * 设置令牌过期头
   */
  private setTokenExpiredHeaders(response: any): void {
    try {
      response.setHeader('X-Token-Expired', 'true');
      response.setHeader('X-Refresh-Required', 'true');
      response.setHeader('X-Token-Expires-In', '0');
      
      // 设置 CORS 头
      const existingHeaders = response.getHeader('Access-Control-Expose-Headers') || '';
      const newHeaders = 'X-Token-Expired, X-Refresh-Required, X-Token-Expires-In';
      const combinedHeaders = existingHeaders 
        ? `${existingHeaders}, ${newHeaders}`
        : newHeaders;
        
      response.setHeader('Access-Control-Expose-Headers', combinedHeaders);
    } catch (error) {
      this.logger.warn('设置令牌过期头失败:', error);
    }
  }

  /**
   * 检查令牌更新建议时间点
   * 如果距离过期还有30分钟则向客户端发送更新建议头
   */
  private checkTokenRefreshRecommendation(token: string | null, response: any): void {
    if (!token) return;

    try {
      // 解码 JWT 载荷
      const parts = token.split('.');
      if (parts.length !== 3) return;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      
      if (!exp || typeof exp !== 'number') return;

      const timeUntilExpiry = exp - now;
      
      // 如果剩余时间少于30分钟(1800秒)则建议更新
      if (timeUntilExpiry > 0 && timeUntilExpiry < 1800) {
        response.setHeader('X-Token-Refresh-Recommended', 'true');
        response.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
        
        // 如果少于5分钟则设为高优先级
        if (timeUntilExpiry < 300) {
          response.setHeader('X-Refresh-Priority', 'high');
        } else {
          response.setHeader('X-Refresh-Priority', 'normal');
        }
        
        this.logger.debug(`建议更新令牌 - 距离过期还有 ${timeUntilExpiry} 秒`);
        
        // 更新 CORS 头
        const existingHeaders = response.getHeader('Access-Control-Expose-Headers') || '';
        const newHeaders = 'X-Token-Refresh-Recommended, X-Token-Expires-In, X-Refresh-Priority';
        const combinedHeaders = existingHeaders 
          ? `${existingHeaders}, ${newHeaders}`
          : newHeaders;
          
        response.setHeader('Access-Control-Expose-Headers', combinedHeaders);
      }
    } catch (error) {
      // 令牌解码失败时忽略 (出于安全考虑降低日志级别)
      this.logger.debug('检查令牌过期时间失败:', error);
    }
  }
}
