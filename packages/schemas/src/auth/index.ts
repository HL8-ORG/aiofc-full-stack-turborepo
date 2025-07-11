import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  nameSchema,
  phoneSchema,
} from '../base';

// ==============================
// 🔐 统一认证模式 (单一来源)
// 所有认证相关的模式和类型都在这里管理
// ==============================

// 注册模式
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
  })
  .strict();

// 登录模式
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, '请输入密码'),
  })
  .strict();

// 刷新令牌模式
export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, '请输入刷新令牌'),
  })
  .strict();

// 修改密码模式
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, '请输入确认密码'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '新密码和确认密码不匹配',
    path: ['confirmPassword'],
  });

// 找回密码模式
export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// 重置密码模式
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, '请输入重置令牌'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, '请输入确认密码'),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '新密码和确认密码不匹配',
    path: ['confirmPassword'],
  });

// 邮箱验证模式
export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, '请输入验证令牌'),
  })
  .strict();

// 社交认证回调模式
export const socialAuthCallbackSchema = z
  .object({
    code: z.string().min(1, '请输入认证码'),
    state: z.string().optional(),
  })
  .strict();

// 更新个人资料模式
export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
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
    avatar: z.string().url('URL格式不正确').optional(),
  })
  .strict();

// 用户设置模式
export const updateSettingsSchema = z
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

// 删除账户模式
// export const deleteAccountSchema = z.object({
//   password: z.string().min(1, '请输入密码'),
//   confirmText: z.string().refine((val) => val === 'DELETE', {
//     message: '请准确输入 DELETE',
//   }),
// }).strict();

// 密码强度检查模式
export const passwordStrengthSchema = z
  .object({
    password: z.string().min(1, '请输入密码'),
  })
  .transform((data) => {
    const { password } = data;
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[@$!%*?&]/.test(password),
    };

    // 计算分数
    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.symbols) score += 1;

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

    return {
      password,
      score,
      strength,
      checks,
      suggestions: [
        !checks.length && '请输入至少8个字符',
        !checks.lowercase && '请包含小写字母',
        !checks.uppercase && '请包含大写字母',
        !checks.numbers && '请包含数字',
        !checks.symbols && '请包含特殊字符(@$!%*?&)',
      ].filter(Boolean),
    };
  });

// TypeScript 类型提取
export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type SocialAuthCallbackDto = z.infer<typeof socialAuthCallbackSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
// export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
export type PasswordStrengthResult = z.infer<typeof passwordStrengthSchema>;

// 认证响应类型 (客户端用)
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthUser {
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
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: AuthUser;
  message: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    tokens: AuthTokens;
  };
}

// 错误类型
export interface AuthError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
    received?: string;
  }>;
}

// 令牌载荷类型
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'INSTRUCTOR';
  tokenId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// 会话信息类型
export interface SessionInfo {
  tokenId: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  lastUsed: string;
  createdAt: string;
}

// ==============================
// 🔧 工具函数
// ==============================

// 用户响应净化函数
export function sanitizeUserResponse(user: any): Omit<AuthUser, 'password'> {
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lastLoginAt: user.lastLoginAt?.toISOString?.() || user.lastLoginAt,
  };
}

// 密码验证函数
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.errors.map((err) => err.message),
  };
}

// 邮箱验证函数
export function validateEmail(email: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = emailSchema.safeParse(email);
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.errors.map((err) => err.message),
  };
}
