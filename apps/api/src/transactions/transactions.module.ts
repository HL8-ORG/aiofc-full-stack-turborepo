import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaModule } from '@repo/database';
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';

/**
 * 💳 支付和交易管理模块
 * 
 * 功能:
 * - Stripe 支付处理
 * - 交易创建和查询
 * - 课程注册和学习进度初始化
 * - Zod 数据验证
 * - JWT 认证保护
 */
@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    ApiJwtAuthGuard, // 本地 JWT 守卫提供
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
