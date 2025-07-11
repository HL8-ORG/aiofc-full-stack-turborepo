import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  BadRequestException, // 新增
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { TransactionsService } from './transactions.service';
import { ZodValidationPipe } from '@repo/common';

// 本地守卫和装饰器使用
import { ApiJwtAuthGuard } from '../auth/guards/api-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// import type {} from // CreateStripePaymentIntentDto, // 暂时禁用
// CreateTransactionDto, // 暂时禁用
// TransactionQueryDto, // 暂时禁用
// './dto/transaction.dto.ts.backup';

// import {} from // CreateStripePaymentIntentSchema, // 暂时禁用
// CreateTransactionSchema, // 暂时禁用
// TransactionQuerySchema, // 暂时禁用
// './dto/transaction.dto.ts.backup';

import type { User } from '@repo/common';

/**
 * 💳 支付和交易管理控制器
 *
 * 端点:
 * - GET /transactions - 查询交易列表 (需要认证)
 * - POST /transactions - 创建新交易 (需要认证)
 * - POST /transactions/stripe/payment-intent - 创建 Stripe 支付意向 (需要认证)
 */
@ApiTags('支付和交易')
@Controller('transactions')
@UseGuards(ApiJwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * 📋 查询交易列表 (需要认证)
   * 支持按用户和分页查询
   */
  @Get()
  @ApiOperation({
    summary: '查询交易列表',
    description:
      '查询用户的支付记录。管理员可以查询所有交易。',
  })
  @ApiResponse({ status: 200, description: '交易列表查询成功' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 每分钟限制20次
  async listTransactions(@Query() query: any, @CurrentUser() user: User) {
    // 手动提取和验证查询参数
    const queryParams = {
      userId: query?.userId || undefined,
      courseId: query?.courseId || undefined,
      paymentProvider: query?.paymentProvider || undefined,
      page: query?.page ? parseInt(query.page) : 1,
      limit: query?.limit ? parseInt(query.limit) : 10,
      sortBy: query?.sortBy || 'dateTime',
      sortOrder: query?.sortOrder || 'desc',
    };

    this.logger.log(
      `交易列表查询请求 - 用户: ${user.id}, 查询目标: ${queryParams.userId || '全部'}`
    );

    const result = await this.transactionsService.findAllTransactions(
      queryParams,
      user
    );

    this.logger.log(
      `交易列表查询完成 - 返回${result.data.length}条交易记录`
    );
    return result;
  }

  /**
   * 💳 创建 Stripe 支付意向 (需要认证)
   * 返回 client_secret 供客户端进行支付
   */
  @Post('stripe/payment-intent')
  @ApiOperation({
    summary: '创建 Stripe 支付意向',
    description:
      '创建 Stripe Payment Intent 并返回 client_secret。',
  })
  @ApiResponse({ status: 201, description: '支付意向创建成功' })
  @ApiResponse({ status: 400, description: '请求数据无效' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 每分钟限制10次
  async createStripePaymentIntent(
    @Body() createPaymentIntentDto: any, // 暂时直接处理
    @CurrentUser() user: User
  ) {
    // 手动数据验证
    const processedData = {
      amount: createPaymentIntentDto?.amount
        ? Number(createPaymentIntentDto.amount)
        : 0,
      courseId: createPaymentIntentDto?.courseId || '',
      currency: createPaymentIntentDto?.currency || 'krw',
      metadata: createPaymentIntentDto?.metadata || {},
    };

    if (!processedData.amount || processedData.amount <= 0) {
      throw new BadRequestException('支付金额无效');
    }

    this.logger.log(
      `创建 Stripe 支付意向请求 - 用户: ${user.id}, 金额: ${processedData.amount}`
    );

    const result =
      await this.transactionsService.createStripePaymentIntent(processedData);

    this.logger.log(`Stripe 支付意向创建完成 - 用户: ${user.id}`);
    return result;
  }

  /**
   * 📝 创建新交易 (需要认证)
   * 支付成功后记录交易、注册课程、初始化学习进度
   */
  @Post()
  @ApiOperation({
    summary: '创建交易',
    description: '支付完成后记录交易并注册课程。',
  })
  @ApiResponse({ status: 201, description: '交易创建成功' })
  @ApiResponse({ status: 400, description: '请求数据无效' })
  @ApiResponse({ status: 401, description: '需要认证' })
  @ApiResponse({ status: 404, description: '未找到课程' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 每分钟限制5次 (支付次数有限)
  async createTransaction(
    @Body() createTransactionDto: any, // 暂时直接处理
    @CurrentUser() user: User
  ) {
    // 手动数据验证
    const processedData = {
      userId: createTransactionDto?.userId || '',
      courseId: createTransactionDto?.courseId || '',
      transactionId: createTransactionDto?.transactionId || '',
      amount: createTransactionDto?.amount
        ? Number(createTransactionDto.amount)
        : 0,
      paymentProvider: createTransactionDto?.paymentProvider || 'stripe',
      paymentMethodId: createTransactionDto?.paymentMethodId || undefined,
      description: createTransactionDto?.description || undefined,
    };

    if (
      !processedData.userId ||
      !processedData.courseId ||
      !processedData.transactionId
    ) {
      throw new BadRequestException('缺少必填字段');
    }

    this.logger.log(
      `创建交易请求 - 用户: ${processedData.userId}, 课程: ${processedData.courseId}, 请求者: ${user.id}`
    );

    const result =
      await this.transactionsService.createTransaction(processedData);

    this.logger.log(`交易创建完成 - ID: ${processedData.transactionId}`);
    return result;
  }
}
