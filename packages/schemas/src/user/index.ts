// ==============================
// 👤 用户相关统一模式
// Auth服务和API服务共同使用
// ==============================

import { z } from 'zod';
import {
  paginationSchema,
  sortOrderSchema,
  idSchema,
  emailSchema,
  usernameSchema,
  nameSchema,
  phoneSchema,
  passwordSchema,
} from '../base';

// ===================================
// 🔍 基本用户模式
// ===================================

// 创建用户模式(管理员用)
export const createUserSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    role: z.enum(['USER', 'INSTRUCTOR']).default('USER'),
    isActive: z.boolean().default(true),
    isVerified: z.boolean().default(false),
  })
  .strict();

// 更新用户模式(管理员/用户通用)
export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    avatar: z.string().url('URL格式不正确').optional(),
    password: passwordSchema.optional(),
    role: z.enum(['USER', 'INSTRUCTOR']).optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  })
  .strict();

// 用户资料扩展信息模式
export const userProfileSchema = z
  .object({
    bio: z
      .string()
      .max(500, '个人简介不能超过500字')
      .optional(),
    location: z
      .string()
      .max(100, '位置不能超过100字')
      .optional(),
    website: z.string().url('URL格式不正确').optional(),
    dateOfBirth: z
      .string()
      .date('日期格式不正确 (YYYY-MM-DD)')
      .optional(),
    phone: phoneSchema.optional(),
  })
  .strict();

// 用户设置模式
export const userSettingsSchema = z
  .object({
    theme: z
      .enum(['light', 'dark', 'system'], {
        errorMap: () => ({
          message: '主题必须是 light、dark 或 system 之一',
        }),
      })
      .optional(),
    language: z
      .enum(['ko', 'en'], {
        errorMap: () => ({ message: '语言必须是 ko 或 en 之一' }),
      })
      .optional(),
    timezone: z.string().min(1, '请输入时区').optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional(),
  })
  .strict();

// 用户搜索查询模式
export const userSearchQuerySchema = paginationSchema
  .extend({
    search: z
      .string()
      .max(100, '搜索词不能超过100字')
      .optional(),
    email: emailSchema.optional(),
    username: usernameSchema.optional(),
    role: z.enum(['USER', 'INSTRUCTOR']).optional(),
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val ? val === 'true' : undefined)),
    isVerified: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val ? val === 'true' : undefined)),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    lastLoginAfter: z.string().datetime().optional(),
    lastLoginBefore: z.string().datetime().optional(),
    sortBy: z
      .enum(['createdAt', 'lastLoginAt', 'email', 'username', 'role'])
      .default('createdAt'),
    sortOrder: sortOrderSchema,
  })
  .strict();

// 账号删除模式
export const deleteAccountSchema = z
  .object({
    password: passwordSchema,
    confirmText: z.string().refine((val) => val === 'DELETE', {
      message: '请准确输入DELETE',
    }),
    reason: z
      .string()
      .max(500, '删除原因不能超过500字')
      .optional(),
  })
  .strict();

// 用户角色变更模式(仅管理员)
export const changeUserRoleSchema = z
  .object({
    userId: idSchema,
    newRole: z.enum(['USER', 'INSTRUCTOR'], {
      errorMap: () => ({ message: '角色必须是 USER 或 INSTRUCTOR' }),
    }),
    reason: z
      .string()
      .min(1, '角色变更原因为必填项')
      .max(500, '原因不能超过500字'),
  })
  .strict();

// 用户启用/禁用模式(仅管理员)
export const toggleUserStatusSchema = z
  .object({
    userId: idSchema,
    isActive: z.boolean(),
    reason: z
      .string()
      .min(1, '状态变更原因为必填项')
      .max(500, '原因不能超过500字'),
  })
  .strict();

// 重发邮箱验证模式
export const resendVerificationSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// 用户批量操作模式(仅管理员)
export const bulkUserActionSchema = z
  .object({
    userIds: z
      .array(idSchema)
      .min(1, '至少选择1名用户')
      .max(100, '一次最多处理100名用户'),
    action: z.enum(['activate', 'deactivate', 'verify', 'delete'], {
      errorMap: () => ({
        message:
          '操作必须是 activate、deactivate、verify 或 delete 之一',
      }),
    }),
    reason: z
      .string()
      .min(1, '操作原因为必填项')
      .max(500, '原因不能超过500字'),
  })
  .strict();

// ===================================
// 📝 TypeScript 类型提取
// ===================================

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserProfileDto = z.infer<typeof userProfileSchema>;
export type UserSettingsDto = z.infer<typeof userSettingsSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
export type ChangeUserRoleDto = z.infer<typeof changeUserRoleSchema>;
export type ToggleUserStatusDto = z.infer<typeof toggleUserStatusSchema>;
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
export type BulkUserActionDto = z.infer<typeof bulkUserActionSchema>;

// ===================================
// 🏗️ 接口定义
// ===================================

// 完整用户信息接口
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: 'USER' | 'INSTRUCTOR';
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;

  // 关联数据
  profile?: UserProfile;
  settings?: UserSettings;
  socialAccounts?: SocialAccount[];
}

// 用户资料接口
export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  location?: string;
  website?: string;
  dateOfBirth?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

// 用户设置接口
export interface UserSettings {
  id: string;
  userId: string;
  theme?: 'light' | 'dark' | 'system';
  language?: 'ko' | 'en';
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 社交账号接口
export interface SocialAccount {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  providerData?: any;
  createdAt: string;
  updatedAt: string;
}

// 用户统计接口
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  verified: number;
  unverified: number;
  instructors: number;
  regularUsers: number;
  activeRate: number;
  verificationRate: number;
}

// ===================================
// 🔧 工具函数
// ===================================

// 用户响应转换函数(移除密码)
export function transformUserResponse(user: any): Omit<User, 'password'> {
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || user.lastLoginAt,
  };
}

// 用户过滤器创建函数
export function createUserFilter(query: UserSearchQuery) {
  const filter: any = {};

  // 搜索词处理(OR条件)
  if (query.search) {
    filter.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { username: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // 单个字段过滤
  if (query.email) {
    filter.email = { contains: query.email, mode: 'insensitive' };
  }

  if (query.username) {
    filter.username = { contains: query.username, mode: 'insensitive' };
  }

  if (query.role) {
    filter.role = query.role;
  }

  // 布尔字段
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  if (query.isVerified !== undefined) {
    filter.isVerified = query.isVerified;
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

  if (query.lastLoginAfter || query.lastLoginBefore) {
    filter.lastLoginAt = {};
    if (query.lastLoginAfter) {
      filter.lastLoginAt.gte = new Date(query.lastLoginAfter);
    }
    if (query.lastLoginBefore) {
      filter.lastLoginAt.lte = new Date(query.lastLoginBefore);
    }
  }

  return filter;
}

// 排序选项创建函数
export function createUserOrderBy(query: UserSearchQuery) {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

// 用户统计计算函数
export function calculateUserStats(users: User[]): UserStats {
  const total = users.length;
  const active = users.filter((user) => user.isActive).length;
  const verified = users.filter((user) => user.isVerified).length;
  const instructors = users.filter((user) => user.role === 'INSTRUCTOR').length;
  const regularUsers = users.filter((user) => user.role === 'USER').length;

  return {
    total,
    active,
    inactive: total - active,
    verified,
    unverified: total - verified,
    instructors,
    regularUsers,
    activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
    verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
}

// 用户权限检查函数
export function canManageUser(
  currentUserRole: string,
  targetUserRole: string
): boolean {
  // 管理员可以管理所有用户
  if (currentUserRole === 'ADMIN') {
    return true;
  }

  // 讲师只能管理普通用户
  if (currentUserRole === 'INSTRUCTOR' && targetUserRole === 'USER') {
    return true;
  }

  return false;
}

// 安全的用户更新字段过滤
export function filterSafeUpdateFields(
  data: UpdateUserDto,
  currentUserRole: string,
  isOwnProfile: boolean
): Partial<UpdateUserDto> {
  const safeFields: Partial<UpdateUserDto> = {};

  // 如果是自己的资料
  if (isOwnProfile) {
    safeFields.username = data.username;
    safeFields.firstName = data.firstName;
    safeFields.lastName = data.lastName;
    safeFields.avatar = data.avatar;
    safeFields.password = data.password;
  }

  // 如果是管理员则可以更新所有字段
  if (currentUserRole === 'ADMIN') {
    return data;
  }

  // 如果是讲师则只能更新部分字段
  if (currentUserRole === 'INSTRUCTOR' && !isOwnProfile) {
    safeFields.isActive = data.isActive;
    safeFields.isVerified = data.isVerified;
  }

  return safeFields;
}

// 用户搜索查询验证函数
export function validateUserQuery(query: any): UserSearchQuery {
  const result = userSearchQuerySchema.safeParse(query);
  if (!result.success) {
    throw new Error(
      `无效的用户搜索查询: ${result.error.errors.map((e) => e.message).join(', ')}`
    );
  }
  return result.data;
}
