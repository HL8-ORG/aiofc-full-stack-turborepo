// ==============================
// 💳 交易(支付)相关统一模式
// API服务和Web客户端共同使用
// ==============================

import { z } from 'zod';
import {
  paginationSchema,
  sortOrderSchema,
  idSchema,
  dateRangeSchema,
} from '../base';

// ===================================
// 💰 支付相关枚举定义
// ===================================

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  KAKAO_PAY = 'kakao_pay',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  KAKAO_PAY = 'kakao_pay',
  PAYPAL = 'paypal',
}

// ===================================
// 🔍 基本交易模式
// ===================================

// Stripe支付意向创建模式
export const createStripePaymentIntentSchema = z
  .object({
    courseId: idSchema,
    amount: z
      .number()
      .int()
      .min(100, '最小支付金额为100元')
      .max(10000000, '最大支付金额为1000万元'),
    currency: z.string().default('krw'),
    paymentMethodId: z.string().optional(),
    savePaymentMethod: z.boolean().default(false),
  })
  .strict();

// 交易创建模式
export const createTransactionSchema = z
  .object({
    userId: idSchema,
    courseId: idSchema,
    amount: z
      .number()
      .int()
      .min(100, '最小支付金额为100元')
      .max(10000000, '最大支付金额为1000万元'),
    currency: z.string().default('krw'),
    paymentProvider: z.nativeEnum(PaymentProvider),
    paymentMethodId: z.string().optional(),
    paymentIntentId: z.string().optional(), // 用于Stripe
    status: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING),
    metadata: z.record(z.string()).optional(), // 额外元数据
  })
  .strict();

// 交易更新模式
export const updateTransactionSchema = z
  .object({
    status: z.nativeEnum(PaymentStatus).optional(),
    paymentMethodId: z.string().optional(),
    completedAt: z.string().datetime().optional(),
    failureReason: z
      .string()
      .max(500, '失败原因不能超过500字')
      .optional(),
    metadata: z.record(z.string()).optional(),
  })
  .strict();

// 交易查询模式
export const transactionQuerySchema = paginationSchema
  .extend({
    userId: idSchema.optional(),
    courseId: idSchema.optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    paymentProvider: z.nativeEnum(PaymentProvider).optional(),
    minAmount: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z.number().int().min(0, '最小金额必须大于等于0').optional()
      ),
    maxAmount: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(
        z.number().int().min(0, '最大金额必须大于等于0').optional()
      ),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'amount', 'status'])
      .default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// 退款请求模式
export const refundRequestSchema = z
  .object({
    transactionId: idSchema,
    reason: z
      .string()
      .min(1, '退款原因为必填项')
      .max(500, '退款原因不能超过500字'),
    amount: z
      .number()
      .int()
      .min(100, '退款金额必须大于等于100元')
      .optional(), // 用于部分退款
  })
  .strict();

// 保存支付方式模式
export const savePaymentMethodSchema = z
  .object({
    userId: idSchema,
    paymentMethodId: z.string().min(1, '支付方式ID为必填项'),
    type: z.nativeEnum(PaymentMethod),
    isDefault: z.boolean().default(false),
    metadata: z
      .object({
        lastFour: z.string().optional(), // 卡片后四位
        brand: z.string().optional(), // 卡片品牌(visa, mastercard等)
        expiry: z.string().optional(), // 过期日期(MM/YY)
      })
      .optional(),
  })
  .strict();

// Webhook验证模式
export const webhookEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    provider: z.nativeEnum(PaymentProvider),
    data: z.record(z.any()),
    created: z.number(),
  })
  .strict();

// ===================================
// 📝 TypeScript类型提取
// ===================================

export type CreateStripePaymentIntentDto = z.infer<
  typeof createStripePaymentIntentSchema
>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>;
export type RefundRequestDto = z.infer<typeof refundRequestSchema>;
export type SavePaymentMethodDto = z.infer<typeof savePaymentMethodSchema>;
export type WebhookEventDto = z.infer<typeof webhookEventSchema>;

// ===================================
// 🏗️ 接口定义
// ===================================

// 完整交易信息接口
export interface Transaction {
  transactionId: string;
  userId: string;
  courseId: string;
  amount: number; // 以元为单位
  currency: string;
  paymentProvider: PaymentProvider;
  paymentMethodId?: string;
  paymentIntentId?: string;
  status: PaymentStatus;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;

  // 关联数据
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  course?: {
    courseId: string;
    title: string;
    price?: number;
    teacherId: string;
  };
  refunds?: Refund[];
}

// 退款信息接口
export interface Refund {
  refundId: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 已保存支付方式接口
export interface SavedPaymentMethod {
  id: string;
  userId: string;
  paymentMethodId: string;
  type: PaymentMethod;
  isDefault: boolean;
  metadata?: {
    lastFour?: string;
    brand?: string;
    expiry?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 交易统计接口
export interface TransactionStats {
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number; // 以元为单位
  averageTransactionAmount: number;
  refundRate: number; // 百分比
  popularPaymentMethods: Array<{
    method: PaymentProvider;
    count: number;
    percentage: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    transactionCount: number;
  }>;
}

// 日期范围接口
export interface DateRange {
  from: string | undefined;
  to: string | undefined;
}

// ===================================
// 🔧 工具函数
// ===================================

// 创建交易过滤器函数
export function createTransactionFilter(query: TransactionQueryDto) {
  const filter: any = {};

  // 用户ID过滤
  if (query.userId) {
    filter.userId = query.userId;
  }

  // 课程ID过滤
  if (query.courseId) {
    filter.courseId = query.courseId;
  }

  // 状态过滤
  if (query.status) {
    filter.status = query.status;
  }

  // 支付提供商过滤
  if (query.paymentProvider) {
    filter.paymentProvider = query.paymentProvider;
  }

  // 金额范围过滤
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) {
      filter.amount.gte = query.minAmount;
    }
    if (query.maxAmount !== undefined) {
      filter.amount.lte = query.maxAmount;
    }
  }

  // 日期范围过滤
  if (query.createdAfter || query.createdBefore) {
    filter.createdAt = {};
    if (query.createdAfter) {
      filter.createdAt.gte = new Date(query.createdAfter);
    }
    if (query.createdBefore) {
      filter.createdAt.lte = new Date(query.createdBefore);
    }
  }

  return filter;
}

// 创建排序选项函数
export function createTransactionOrderBy(query: TransactionQueryDto) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 计算交易统计函数
export function calculateTransactionStats(
  transactions: Transaction[]
): TransactionStats {
  const total = transactions.length;
  const completed = transactions.filter(
    (t) => t.status === PaymentStatus.COMPLETED
  );
  const refunded = transactions.filter(
    (t) => t.status === PaymentStatus.REFUNDED
  );

  const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount =
    completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
  const refundRate =
    total > 0 ? Math.round((refunded.length / total) * 100) : 0;

  // 支付方式统计
  const providerCount: Record<PaymentProvider, number> = {
    [PaymentProvider.STRIPE]: 0,
    [PaymentProvider.PAYPAL]: 0,
    [PaymentProvider.KAKAO_PAY]: 0,
  };

  transactions.forEach((t) => {
    providerCount[t.paymentProvider]++;
  });

  const popularPaymentMethods = Object.entries(providerCount)
    .map(([method, count]) => ({
      method: method as PaymentProvider,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 月度收入(最近12个月)
  const monthlyData: Record<string, { revenue: number; count: number }> = {};
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = { revenue: 0, count: 0 };
  }

  completed.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (monthlyData[monthKey]) {
      monthlyData[monthKey].revenue += transaction.amount;
      monthlyData[monthKey].count++;
    }
  });

  const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    transactionCount: data.count,
  }));

  return {
    totalTransactions: total,
    completedTransactions: completed.length,
    totalRevenue,
    averageTransactionAmount: averageAmount,
    refundRate,
    popularPaymentMethods,
    monthlyRevenue,
  };
}

// 验证交易查询函数
export function validateTransactionQuery(query: any): TransactionQueryDto {
  const result = transactionQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `无效的交易查询: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}

// 交易金额格式化函数
export function formatTransactionAmount(
  amount: number,
  currency: string = 'KRW'
): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

// 支付状态中文转换函数
export function getPaymentStatusText(status: PaymentStatus): string {
  const statusMap = {
    [PaymentStatus.PENDING]: '等待中',
    [PaymentStatus.COMPLETED]: '已完成',
    [PaymentStatus.FAILED]: '失败',
    [PaymentStatus.CANCELLED]: '已取消',
    [PaymentStatus.REFUNDED]: '已退款',
  };

  return statusMap[status];
}

// 支付提供商中文转换函数
export function getPaymentProviderText(provider: PaymentProvider): string {
  const providerMap = {
    [PaymentProvider.STRIPE]: '信用卡',
    [PaymentProvider.PAYPAL]: 'PayPal',
    [PaymentProvider.KAKAO_PAY]: '卡卡오支付',
  };

  return providerMap[provider];
}

// 支付方式类型中文转换函数
export function getPaymentMethodText(method: PaymentMethod): string {
  const methodMap = {
    [PaymentMethod.CARD]: '信用卡',
    [PaymentMethod.BANK_TRANSFER]: '银行转账',
    [PaymentMethod.KAKAO_PAY]: '卡卡오支付',
    [PaymentMethod.PAYPAL]: 'PayPal',
  };

  return methodMap[method];
}

// 检查是否可退款函数
export function canRefundTransaction(transaction: Transaction): boolean {
  // 仅已完成的交易可退款
  if (transaction.status !== PaymentStatus.COMPLETED) {
    return false;
  }

  // 仅30天内的交易可退款(可根据政策调整)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactionDate = new Date(transaction.createdAt);
  return transactionDate >= thirtyDaysAgo;
}

// 交易验证函数
export function validateTransaction(transaction: any): boolean {
  try {
    createTransactionSchema.parse(transaction);
    return true;
  } catch {
    return false;
  }
}
