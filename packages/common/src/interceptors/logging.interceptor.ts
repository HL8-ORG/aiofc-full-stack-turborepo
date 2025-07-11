import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 📝 日志拦截器
 * 
 * 功能:
 * - 记录请求和响应日志
 * - 包含请求方法、URL、IP、用户代理等信息
 * - 记录响应状态码和处理时间
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const expressRequest = request as Request & {
      ip?: string;
      get?: (header: string) => string | undefined;
    };

    const method = request.method || 'UNKNOWN';
    const url = request.url || 'unknown';
    const ip = expressRequest.ip || '';
    const userAgent = expressRequest.get?.('User-Agent') || '';
    const startTime = Date.now();

    this.logger.log(`--> ${method} ${url} ${ip} ${userAgent}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        this.logger.log(
          `<-- ${method} ${url} ${statusCode} ${duration}ms`,
        );
      }),
    );
  }
}
