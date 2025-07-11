import { z } from 'zod';

// ==============================
// 📋 基础模式 (通用)
// ==============================

// 🆔 CUID2 专用 ID 模式 (24字符固定)
// 所有新实体必须使用 CUID2
export const idSchema = z.string().refine(
  (val) => {
    // 基本有效性检查
    if (!val || typeof val !== 'string') {
      return false;
    }
    
    // 优先检查长度 (性能优化)
    if (val.length !== 24) {
      return false;
    }
    
    // CUID2 格式验证 (24字符,首字母小写,其余小写+数字)
    const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
    return cuid2Regex.test(val);
  },
  (val) => {
    if (!val || typeof val !== 'string') {
      return { message: 'ID必须是字符串' };
    }
    
    if (val.length !== 24) {
      return { 
        message: `ID必须恰好为24字符 (当前: ${val.length}字符, 示例: yefj4way7aurp2kamr0bwr8n)`
      };
    }
    
    const cuid2Regex = /^[a-z][a-z0-9]{23}$/;
    if (!cuid2Regex.test(val)) {
      return { 
        message: '不是有效的CUID2格式 (以小写字母开头,后跟24个小写字母+数字). 示例: yefj4way7aurp2kamr0bwr8n'
      };
    }
    
    return { message: '未知的ID格式错误' };
  }
);

// 🆔 CUID2 专用模式 (推荐在新代码中使用)
export const cuid2Schema = idSchema;

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, '页码必须大于等于1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100, '每页最多显示100条记录')),
});

export const timestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const softDeleteSchema = z.object({
  deletedAt: z.date().nullable().optional(),
});

// 排序模式
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// 日期范围模式
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: '开始日期必须早于结束日期',
  path: ['startDate'],
});

// API响应模式
export const successResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional(),
  data: z.any().optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

export const paginatedResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.object({
    items: z.array(z.any()),
    pagination: z.object({
      currentPage: z.number().int(),
      totalPages: z.number().int(),
      totalItems: z.number().int(),
      itemsPerPage: z.number().int(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  }),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});

// 基本验证模式 - 在auth.ts中也使用
export const emailSchema = z
  .string()
  .min(1, '请输入邮箱')
  .email('邮箱格式不正确')
  .max(255, '邮箱不能超过255个字符')
  .transform((email) => email.toLowerCase().trim()); // 转换为小写并去除空格

export const passwordSchema = z
  .string()
  .min(8, '密码至少需要8个字符')
  .max(128, '密码不能超过128个字符')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    '密码必须包含大小写字母、数字和特殊字符(@$!%*?&)'
  );

export const usernameSchema = z
  .string()
  .min(3, '用户名至少需要3个字符')
  .max(30, '用户名不能超过30个字符')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    '用户名只能包含英文字母、数字、下划线和连字符'
  )
  .transform((username) => username.toLowerCase().trim()); // 转换为小写

// 姓名相关模式
export const nameSchema = z
  .string()
  .min(1, '请输入姓名')
  .max(50, '姓名不能超过50个字符')
  .regex(/^[가-힣a-zA-Z\s]+$/, '姓名只能包含中文、英文和空格')
  .transform((name) => name.trim());

// 电话号码模式 (韩国标准)
export const phoneSchema = z
  .string()
  .regex(
    /^(\+82|0)?(10|11|16|17|18|19)\d{8}$/,
    '不是有效的韩国手机号码格式 (例如: 010-1234-5678)'
  )
  .transform((phone) => phone.replace(/[^0-9+]/g, '')); // 删除数字和+以外的所有字符

// TypeScript 类型导出
export type PaginationDto = z.infer<typeof paginationSchema>;
export type DateRangeDto = z.infer<typeof dateRangeSchema>;
export type Cuid2 = string;

export type SuccessResponse<T = any> = {
  success: true;
  message?: string;
  data?: T;
  timestamp: string;
};

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export type PaginatedResponse<T = any> = {
  success: true;
  data: {
    items: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  timestamp: string;
};
