import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    try {
      // 注册事件监听器
      this.$on(`query` as never, (e: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });

      this.$on(`error` as never, (e: Prisma.LogEvent) => {
        this.logger.error('Prisma Error:', e);
      });

      this.$on(`info` as never, (e: Prisma.LogEvent) => {
        this.logger.log('Prisma Info:', e);
      });

      this.$on(`warn` as never, (e: Prisma.LogEvent) => {
        this.logger.warn('Prisma Warning:', e);
      });

      await this.$connect();
      this.logger.log('已连接到 Prisma 数据库');
    } catch (error) {
      this.logger.error('Prisma 连接失败:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma 数据库连接已断开');
  }

  /**
   * 检查数据库状态
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 事务助手
   */
  async executeTransaction<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return await this.$transaction(async (prisma) => {
      return fn(prisma);
    });
  }
}
