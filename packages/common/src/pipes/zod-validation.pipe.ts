import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * 🔍 Zod 数据验证管道
 * 
 * 使用 Zod Schema 验证和转换请求数据的管道。
 * 
 * 工作机制:
 * 1. 在请求处理前拦截数据
 * 2. 使用 Zod Schema 进行验证和类型转换
 * 3. 验证失败时提供友好的中文错误信息
 * 4. 支持 GET 查询参数和 POST/PUT 请求体验证
 * 5. 提供详细的错误日志记录
 * 
 * 主要功能:
 * - 自动类型转换和验证
 * - 空值和特殊情况处理
 * - 友好的中文错误提示
 * - 详细的错误日志
 * - 支持自定义验证规则
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  /**
   * 转换和验证输入数据
   * 
   * @param value - 需要验证的数据
   * @param metadata - 请求元数据(包含请求类型等信息)
   * @returns 验证并转换后的数据
   * @throws BadRequestException 当验证失败时抛出
   */
  transform(value: any, metadata: ArgumentMetadata) {
    try {
      // 如果没有定义 schema,返回原始值(开发阶段的安全措施)
      if (!this.schema) {
        this.logger.warn(`⚠️ Schema 未定义 - ${metadata.type}:${metadata.metatype?.name}`);
        return value;
      }

      // GET 请求时允许空查询对象
      if (metadata.type === 'query' && (!value || Object.keys(value).length === 0)) {
        const parsedValue = this.schema.parse({});
        return parsedValue;
      }

      // 处理空对象或 null 值(用于 POST/PUT 请求)
      if (metadata.type === 'body' && (!value || typeof value !== 'object')) {
        throw new BadRequestException('请求体不能为空');
      }

      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(`数据验证失败 - ${metadata.type}:`);
        this.logger.error('接收到的数据:', JSON.stringify(value, null, 2));
        this.logger.error('验证错误详情:');
        error.errors.forEach((err, index) => {
          this.logger.error(`  ${index + 1}. 字段: ${err.path.join('.') || 'root'}`);
          this.logger.error(`     代码: ${err.code}`);
          this.logger.error(`     消息: ${err.message}`);
          if (err.code === 'invalid_type') {
            this.logger.error(`     预期: ${err.expected}, 实际: ${err.received}`);
          }
        });

        const errorMessages = error.errors.map((err) => {
          const field = err.path.join('.') || 'root';
          let message = err.message;

          // 改进中文错误消息
          if (err.code === 'invalid_type') {
            if (err.expected === 'string' && err.received === 'undefined') {
              message = '此项为必填项';
            } else {
              message = `需要 ${err.expected} 类型，但收到了 ${err.received} 类型`;
            }
          } else if (err.code === 'too_small') {
            if (err.type === 'string') {
              message = `请至少输入 ${err.minimum} 个字符`;
            }
          } else if (err.code === 'too_big') {
            if (err.type === 'string') {
              message = `最多只能输入 ${err.maximum} 个字符`;
            }
          } else if (err.code === 'invalid_string') {
            if (err.validation === 'email') {
              message = '邮箱格式不正确';
            } else if (err.validation === 'uuid') {
              message = 'UUID 格式不正确';
            }
          } else if (err.code === 'custom') {
            // CUID2 验证失败等自定义验证错误
            if (err.message.includes('CUID2')) {
              message = 'ID 格式不正确 (CUID2 26位, 例如: cm1a2b3c4d5e6f7g8h9i0j1k2l)';
            } else if (err.message.includes('ID 格式')) {
              message = err.message;
            }
          }

          return {
            field,
            message,
            code: err.code,
            received: err.code === 'invalid_type' ? err.received : undefined,
          };
        });

        // 单个错误时使用简单消息
        if (errorMessages.length === 1) {
          throw new BadRequestException(errorMessages[0].message);
        }

        // 多个错误时提供详细信息
        const errorResponse = {
          message: '输入数据验证失败',
          errors: errorMessages,
          timestamp: new Date().toISOString(),
        };

        throw new BadRequestException(errorResponse);
      }

      this.logger.error('意外的验证错误:');
      this.logger.error('错误详情:', {
        name: error?.constructor.name,
        // message: error.message,
        // stack: error.stack,
        metadata,
        receivedValue: value
      });
      throw new BadRequestException('数据验证过程中发生错误');
    }
  }
}
