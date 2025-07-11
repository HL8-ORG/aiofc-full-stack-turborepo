/**
 * 🛡️ 全局异常过滤器
 * 
 * 功能:
 * - 统一处理所有未捕获的异常
 * - 将异常转换为标准的 HTTP 响应格式
 * - 根据异常类型提供不同的错误处理逻辑
 * - 支持开发和生产环境的不同错误详情展示
 * - 集成日志记录功能
 * 
 * 支持的异常类型:
 * - HTTP 异常 (HttpException)
 * - 认证异常 (UnauthorizedException) 
 * - 数据验证异常 (ZodError)
 * - 数据库异常 (PrismaClientKnownRequestError)
 * - 其他未知异常
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/binary';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * @class AllExceptionsFilter
 * @implements {ExceptionFilter}
 * 
 * @description
 * 全局异常过滤器实现类。通过 @Catch() 装饰器捕获所有类型的异常。
 * 根据不同异常类型进行分类处理,并返回统一的错误响应格式。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * 异常处理主方法
   * 
   * @param exception - 捕获到的异常对象
   * @param host - 提供请求/响应上下文的参数主机
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    let error: string;
    let details: string | undefined;

    // 处理 HTTP 异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
        details = responseObj.details;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }

      // 特殊处理认证异常
      if (exception instanceof UnauthorizedException) {
        const responseObj = exceptionResponse as any;
        
        if (responseObj && typeof responseObj === 'object' && responseObj.details) {
          message = responseObj.message;
          error = responseObj.error;
          details = responseObj.details;
        } else {
          message = message || '需要认证';
          error = error || 'Unauthorized';
          details = '请提供有效的认证令牌';
        }
      }
    } 
    // 处理 Zod 数据验证异常
    else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';

      const zodErrors = exception.errors.map((err) => {
        const path = err.path.length > 0 ? err.path.join('.') : 'root';
        return `${path}: ${err.message}`;
      });

      message = {
        message: '输入数据验证失败',
        errors: zodErrors,
        details: exception.errors,
      };
    } 
    // 处理 Prisma 数据库异常
    else if (exception instanceof PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;

      switch (exception.code) {
        case 'P2002':
          message = '数据已存在';
          error = 'Duplicate Entry';
          details = '检测到重复值，请使用其他值';
          break;
        case 'P2025':
          message = '未找到请求的数据';
          error = 'Record Not Found';
          status = HttpStatus.NOT_FOUND;
          details = '相关数据不存在';
          break;
        case 'P2003':
          message = '由于存在关联数据，无法删除';
          error = 'Foreign Key Constraint';
          details = '存在引用的其他数据，无法删除';
          break;
        default:
          message = '发生数据库错误';
          error = 'Database Error';
          details = process.env.NODE_ENV === 'development' 
            ? `Prisma Error Code: ${exception.code}` 
            : '数据库处理过程中出现问题';
      }
    } 
    // 处理其他未知异常
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '发生服务器内部错误';
      error = 'Internal Server Error';
      details = process.env.NODE_ENV === 'development' 
        ? (exception as Error)?.message || '未知错误'
        : '服务器发生意外错误，请稍后重试';
    }

    // 错误日志记录,包含请求信息和错误上下文
    const logMessage = `${request.method} ${request.url}`;
    const logContext = {
      statusCode: status,
      error,
      message,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.userId || 'anonymous',
    };

    // 根据错误状态码选择不同的日志级别
    if (status >= 500) {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : exception, logContext);
    } else if (status === 401 || status === 403) {
      this.logger.warn(logMessage, logContext);
    } else {
      this.logger.debug(logMessage, logContext);
    }

    // 构建标准的错误响应格式
    const errorResponse: any = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // 添加错误详情(如果存在)
    if (details) {
      errorResponse.details = details;
    }

    // 仅在开发环境中包含堆栈信息
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // 设置 CORS 响应头
    response.header('Access-Control-Allow-Origin', request.get('Origin') || '*');
    response.header('Access-Control-Allow-Credentials', 'true');

    // 发送错误响应
    response.status(status).json(errorResponse);
  }
}
