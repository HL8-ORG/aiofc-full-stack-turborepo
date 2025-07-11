import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';

/**
 * 🔄 令牌自动刷新拦截器
 * 
 * 分析 JWT 令牌的过期时间，为客户端提供适当的头部信息。
 * 客户端可以根据这些头部信息自动刷新令牌。
 */

/** 令牌头部设置选项 */
export interface TokenHeaderOptions {
  /** 刷新建议阈值（分钟） */
  refreshThresholdMinutes?: number;
  /** 过期警告阈值（分钟） */
  expiryWarningMinutes?: number;
  /** 启用调试日志 */
  enableDebugLogging?: boolean;
}

/** 默认选项类型 */
interface DefaultTokenHeaderOptions {
  refreshThresholdMinutes: number;
  expiryWarningMinutes: number;
  enableDebugLogging: boolean;
}

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  public readonly logger = new Logger(TokenRefreshInterceptor.name);
  
  public readonly defaultOptions: DefaultTokenHeaderOptions = {
    refreshThresholdMinutes: 5, // 建议在过期前 5 分钟刷新
    expiryWarningMinutes: 10,   // 在过期前 10 分钟发出警告
    enableDebugLogging: process.env.NODE_ENV === 'development',
  };

  constructor(
    public readonly jwtService: JwtService,
    public readonly options: TokenHeaderOptions = {}
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    return next.handle().pipe(
      tap(() => {
        this.setTokenHeaders(request, response);
      })
    );
  }

  /**
   * 设置令牌相关头部
   */
  public setTokenHeaders(request: Request, response: Response): void {
    try {
      const token = this.extractTokenFromRequest(request);
      if (!token) {
        return; // 如果没有令牌，不设置头部
      }

      const tokenPayload = this.validateAndDecodeToken(token);
      if (!tokenPayload) {
        this.setExpiredTokenHeaders(response);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = tokenPayload.exp;
      
      if (!expiresAt) {
        this.logger.warn('令牌中没有过期时间(exp)');
        return;
      }

      const timeUntilExpiry = expiresAt - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
      
      // 如果令牌已过期
      if (timeUntilExpiry <= 0) {
        this.setExpiredTokenHeaders(response);
        return;
      }

      // 根据令牌状态设置头部
      this.setTokenStatusHeaders(response, timeUntilExpiry, minutesUntilExpiry);
      
      // 设置 CORS 头部（使客户端能够读取自定义头部）
      this.setCorsHeaders(response);
      
    } catch (error: unknown) {
      this.logger.error('设置令牌头部时发生错误:', error);
      // 即使发生错误也设置基本的 CORS 头部
      this.setCorsHeaders(response);
    }
  }

  /**
   * 从请求中提取 JWT 令牌
   */
  public extractTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // 检查 Bearer 令牌格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 验证并解码令牌
   */
  public validateAndDecodeToken(token: string): any | null {
    try {
      // 仅解码 JWT，不进行验证（用于检查过期时间）
      const decoded = this.jwtService.decode(token);
      
      if (!decoded || typeof decoded === 'string') {
        return null;
      }

      return decoded;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.debug('令牌解码失败:', errorMessage);
      return null;
    }
  }

  /**
   * 为过期令牌设置头部
   */
  public setExpiredTokenHeaders(response: Response): void {
    response.setHeader('X-Token-Expired', 'true');
    response.setHeader('X-Refresh-Required', 'true');
    response.setHeader('X-Token-Expires-In', '0');
    
    if (this.getDebugLoggingOption()) {
      this.logger.warn('检测到过期令牌 - 需要刷新');
    }
  }

  /**
   * 根据令牌状态设置头部
   */
  public setTokenStatusHeaders(
    response: Response, 
    timeUntilExpiry: number, 
    minutesUntilExpiry: number
  ): void {
    const refreshThreshold = this.getRefreshThresholdOption();
    const expiryWarning = this.getExpiryWarningOption();
    
    // 设置过期前剩余时间（秒）
    response.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
    
    // 设置刷新建议头部
    if (minutesUntilExpiry <= refreshThreshold) {
      response.setHeader('X-Token-Refresh-Recommended', 'true');
      response.setHeader('X-Refresh-Priority', 'high');
      
      if (this.getDebugLoggingOption()) {
        this.logger.debug(`建议刷新令牌 - ${minutesUntilExpiry}分钟后过期`);
      }
    } else if (minutesUntilExpiry <= expiryWarning) {
      response.setHeader('X-Token-Refresh-Recommended', 'true');
      response.setHeader('X-Refresh-Priority', 'normal');
      
      if (this.getDebugLoggingOption()) {
        this.logger.debug(`令牌过期警告 - ${minutesUntilExpiry}分钟后过期`);
      }
    }

    // 提供额外的令牌信息
    response.setHeader('X-Token-Minutes-Until-Expiry', minutesUntilExpiry.toString());
    
    // 令牌状态信息
    if (minutesUntilExpiry <= 1) {
      response.setHeader('X-Token-Status', 'critical');
    } else if (minutesUntilExpiry <= refreshThreshold) {
      response.setHeader('X-Token-Status', 'refresh-recommended');
    } else if (minutesUntilExpiry <= expiryWarning) {
      response.setHeader('X-Token-Status', 'warning');
    } else {
      response.setHeader('X-Token-Status', 'valid');
    }
  }

  /**
   * 设置 CORS 头部（使客户端能够访问自定义头部）
   */
  public setCorsHeaders(response: Response): void {
    const exposedHeaders = [
      'X-Token-Refresh-Recommended',
      'X-Token-Expires-In',
      'X-Token-Expired',
      'X-Refresh-Required',
      'X-Refresh-Priority',
      'X-Token-Minutes-Until-Expiry',
      'X-Token-Status'
    ].join(', ');

    response.setHeader('Access-Control-Expose-Headers', exposedHeaders);
  }

  /**
   * 获取刷新阈值选项
   */
  public getRefreshThresholdOption(): number {
    return this.options.refreshThresholdMinutes ?? this.defaultOptions.refreshThresholdMinutes;
  }

  /**
   * 获取过期警告阈值选项
   */
  public getExpiryWarningOption(): number {
    return this.options.expiryWarningMinutes ?? this.defaultOptions.expiryWarningMinutes;
  }

  /**
   * 获取调试日志选项
   */
  public getDebugLoggingOption(): boolean {
    return this.options.enableDebugLogging ?? this.defaultOptions.enableDebugLogging;
  }
}

/**
 * 配置好的令牌刷新拦截器类
 */
@Injectable()
export class ConfiguredTokenRefreshInterceptor extends TokenRefreshInterceptor {
  constructor(
    jwtService: JwtService,
    options: TokenHeaderOptions = {}
  ) {
    super(jwtService, options);
  }
}

/**
 * 令牌刷新拦截器工厂函数
 * 
 * @param options 令牌头部设置选项
 * @returns 应用配置的拦截器类
 */
export function createTokenRefreshInterceptor(options: TokenHeaderOptions = {}) {
  return class extends TokenRefreshInterceptor {
    constructor(jwtService: JwtService) {
      super(jwtService, options);
    }
  };
}

/**
 * 用于全局令牌刷新拦截器设置的提供者
 */
export const TokenRefreshInterceptorProvider = {
  provide: 'APP_INTERCEPTOR',
  useClass: TokenRefreshInterceptor,
  inject: [JwtService],
};
