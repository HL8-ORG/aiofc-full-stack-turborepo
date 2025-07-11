import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import Stripe from 'stripe';

import { PrismaService } from '@repo/database';
// import { CreateStripePaymentIntentDto, CreateTransactionDto } from './dto/transaction.dto';
// 暂时禁用: 所有 DTO 类型

import type { User } from '@repo/common';

/**
 * 💳 支付和交易管理服务
 *
 * 主要功能:
 * - Stripe 支付处理
 * - 交易创建和查询
 * - 课程注册和学习进度初始化
 * - 支付后数据一致性保证 (事务)
 */
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly stripe: Stripe;

  constructor(private readonly prismaService: PrismaService) {
    // Stripe 初始化
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      this.logger.error('STRIPE_SECRET_KEY 环境变量未设置');
      throw new Error(
        'STRIPE_SECRET_KEY is required but was not found in env variables'
      );
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  /**
   * 📋 查询交易列表 (按用户, 分页)
   */
  async findAllTransactions(query: any, user: User) {
    try {
      this.logger.log(
        `开始查询交易列表 - 请求者: ${user.id}, 目标: ${query.userId || '全部'}`
      );

      // 权限验证: 普通用户只能查询自己的交易
      const isAdmin = user.role === 'admin' || user.role === 'teacher';

      // 普通用户尝试查询其他用户的交易时
      if (!isAdmin && query.userId && query.userId !== user.id) {
        this.logger.warn(
          `无权限 - 请求者: ${user.id}, 目标: ${query.userId}`
        );
        throw new ForbiddenException('只能查询自己的交易');
      }

      const targetUserId = isAdmin ? query.userId : user.id;
      const whereClause = targetUserId ? { userId: targetUserId } : {};

      // 分页计算
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        this.prismaService.transaction.findMany({
          where: whereClause,
          include: {
            course: {
              select: {
                courseId: true,
                title: true,
                teacherName: true,
                category: true,
                price: true,
              },
            },
          },
          orderBy: {
            dateTime: query.sortOrder === 'asc' ? 'asc' : 'desc',
          },
          take: limit,
          skip: offset,
        }),
        this.prismaService.transaction.count({
          where: whereClause,
        }),
      ]);

      this.logger.log(
        `交易列表查询完成 - 返回 ${transactions.length} 条交易 (总计: ${totalCount} 条)`
      );

      return {
        message: '交易列表查询成功',
        data: transactions,
        pagination: {
          total: totalCount,
          page,
          limit,
          offset,
          hasNext: offset + limit < totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      this.logger.error('查询交易列表时发生错误', error);
      throw new BadRequestException(
        '查询交易列表时发生错误'
      );
    }
  }

  /**
   * 💳 创建 Stripe 支付意向
   *
   * 注意: KRW(韩元)没有分位，直接使用原值
   * USD, EUR 等货币需要转换为分位
   */
  async createStripePaymentIntent(createPaymentIntentDto: any) {
    try {
      this.logger.log(
        `开始创建 Stripe 支付意向 - 金额: ${createPaymentIntentDto.amount}`
      );

      let { amount } = createPaymentIntentDto;

      // 最小金额验证
      if (!amount || amount <= 0) {
        this.logger.warn('支付金额无效，使用默认值');
        amount = 50; // 默认 50 元
      }

      // 韩元(KRW)没有分位，直接使用原值
      // 其他货币(USD, EUR 等)需要转换为分位
      const amountForStripe = amount; // KRW 直接使用原值

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountForStripe, // KRW 直接使用原值
        currency: 'krw', // 韩元
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          originalAmount: amount.toString(),
          currency: 'KRW',
        },
      });

      this.logger.log(
        `Stripe 支付意向创建完成 - ID: ${paymentIntent.id}, 金额: ${amount}元 (KRW 原值)`
      );

      return {
        message: 'Stripe 支付意向创建成功',
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount,
          currency: 'KRW',
        },
      };
    } catch (error) {
      this.logger.error('创建 Stripe 支付意向时发生错误', error);

      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe 错误: ${error.message}`);
      }

      throw new BadRequestException(
        '创建支付意向时发生错误'
      );
    }
  }

  /**
   * 📝 创建新交易 (支付完成后，优化 N+1 问题)
   * 原子操作处理交易、注册、学习进度初始化
   *
   * 🚀 性能优化:
   * - 仅查询所需数据
   * - 使用 findUniqueOrThrow 简化错误处理
   * - 在事务中原子执行所有操作
   */
  async createTransaction(createTransactionDto: any) {
    try {
      this.logger.log(
        `开始创建交易 - 用户: ${createTransactionDto.userId}, 课程: ${createTransactionDto.courseId}`
      );

      const { userId, courseId, transactionId, amount, paymentProvider } =
        createTransactionDto;

      // 🚀 N+1 优化: 原子事务处理
      const result = await this.prismaService.$transaction(async (tx) => {
        // 🚀 仅查询所需数据
        const course = await tx.course.findUniqueOrThrow({
          where: { courseId },
          select: {
            courseId: true,
            title: true,
            teacherName: true,
            category: true,
            price: true,
            sections: {
              select: {
                sectionId: true,
                sectionTitle: true,
                chapters: {
                  select: {
                    chapterId: true,
                    title: true,
                  },
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });

        // 检查用户是否已注册
        const existingEnrollment = await tx.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
        });

        if (existingEnrollment) {
          this.logger.warn(
            `课程已注册 - 用户: ${userId}, 课程: ${courseId}`
          );
          throw new BadRequestException('该课程已注册');
        }

        // 1️⃣ 创建交易记录
        const newTransaction = await tx.transaction.create({
          data: {
            transactionId,
            userId,
            courseId,
            amount,
            paymentProvider,
            dateTime: new Date(),
          },
          select: {
            transactionId: true,
            userId: true,
            courseId: true,
            amount: true,
            paymentProvider: true,
            dateTime: true,
          },
        });

        // 2️⃣ 创建课程注册
        const newEnrollment = await tx.enrollment.create({
          data: {
            userId,
            courseId,
            enrolledAt: new Date(),
          },
        });

        // 3️⃣ 初始化学习进度 (优化数据结构)
        const sectionsProgress = course.sections.map((section) => ({
          sectionId: section.sectionId,
          sectionTitle: section.sectionTitle,
          completed: false,
          chapters: section.chapters.map((chapter) => ({
            chapterId: chapter.chapterId,
            title: chapter.title,
            completed: false,
            watchedDuration: 0,
          })),
        }));

        const newProgress = await tx.userCourseProgress.create({
          data: {
            userId,
            courseId,
            enrollmentDate: new Date(),
            overallProgress: 0,
            lastAccessedTimestamp: new Date(),
            sections: JSON.stringify(sectionsProgress),
          },
        });

        // 📊 构建完整结果数据
        return {
          transaction: {
            ...newTransaction,
            course: {
              courseId: course.courseId,
              title: course.title,
              teacherName: course.teacherName,
              category: course.category,
            },
          },
          enrollment: newEnrollment,
          progress: {
            ...newProgress,
            sections: sectionsProgress, // 已解析的数据
          },
          courseInfo: {
            title: course.title,
            sectionsCount: course.sections.length,
            chaptersCount: course.sections.reduce(
              (acc, section) => acc + section.chapters.length,
              0
            ),
          },
        };
      });

      this.logger.log(
        `交易创建完成 - ID: ${transactionId}, 课程: ${result.courseInfo.title}`
      );

      return {
        message: '课程购买和注册成功',
        data: result,
        optimized: true, // 标记已优化
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Prisma P2025 错误: 未找到课程
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `未找到课程 - ID: ${createTransactionDto.courseId}`
        );
        throw new NotFoundException('未找到课程');
      }

      this.logger.error('创建交易时发生错误', error);
      throw new BadRequestException(
        '创建交易时发生错误'
      );
    }
  }
}
