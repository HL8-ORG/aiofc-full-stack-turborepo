/**
 * 📄 用户接口定义
 * 
 * 系统中使用的标准用户对象结构
 * 使用 CUID2 ID 系统，完全移除临时 ID
 */

/** 用户角色类型 */
export type UserRole = 
  | 'user' | 'USER' | 'student' | 'STUDENT'          // 学生
  | 'teacher' | 'TEACHER' | 'instructor' | 'INSTRUCTOR'  // 教师
  | 'admin' | 'ADMIN';                               // 管理员

export interface User {
  /** 🆔 用户唯一 ID (CUID2, 24位) */
  id: string;
  
  /** 📧 邮箱地址 (唯一值) */
  email: string;
  
  /** 👤 用户名 (唯一值) */
  username: string;
  
  /** 👨 名字 */
  firstName?: string;
  
  /** 👨 姓氏 */
  lastName?: string;
  
  /** 🖼️ 头像 URL */
  avatar?: string;
  
  /** 🔑 用户角色 */
  role?: UserRole;
  
  /** ✅ 邮箱验证状态 */
  isVerified?: boolean;
  
  /** 🟢 账号激活状态 */
  isActive?: boolean;
  
  /** 🕐 最后登录时间 */
  lastLoginAt?: Date;
  
  /** 📅 创建时间 */
  createdAt?: Date;
  
  /** 📅 更新时间 */
  updatedAt?: Date;
}

/**
 * 🔑 JWT 访问令牌载荷
 * 
 * 包含标准 JWT 声明和自定义字段
 * 为了安全只包含最小必要信息
 */
export interface JwtPayload {
  /** 🆔 用户 ID (标准 JWT 'sub' 声明) */
  sub: string;
  
  /** 📧 邮箱地址 */
  email: string;
  
  /** 👤 用户名 */
  username: string;
  
  /** 🔑 用户角色 */
  role?: UserRole;
  
  /** 🕐 令牌签发时间 (Unix 时间戳) */
  iat?: number;
  
  /** ⏰ 令牌过期时间 (Unix 时间戳) */
  exp?: number;
  
  /** 🏢 令牌签发者 */
  iss?: string;
  
  /** 👥 令牌受众 */
  aud?: string;
}

/**
 * 🔄 JWT 刷新令牌载荷
 * 
 * 刷新令牌只包含最小信息以加强安全性
 */
export interface JwtRefreshPayload {
  /** 🆔 用户 ID */
  sub: string;
  
  /** 🎲 令牌唯一 ID (用于会话追踪) */
  tokenId: string;
  
  /** 🕐 令牌签发时间 */
  iat?: number;
  
  /** ⏰ 令牌过期时间 */
  exp?: number;
}

/**
 * 🌐 已认证的请求对象
 * 
 * 扩展 Express Request，添加用户信息
 */
export interface AuthenticatedRequest extends Request {
  /** 👤 已认证的用户信息 */
  user: User;
  
  /** 🔑 原始 JWT 令牌 (可选) */
  token?: string;
  
  /** 📍 客户端 IP 地址 */
  clientIp?: string;
  
  /** 🌐 用户代理 */
  userAgent?: string;
}

/**
 * 🔐 令牌对接口
 * 
 * 登录和令牌刷新时返回的令牌结构
 */
export interface TokenPair {
  /** 🔑 访问令牌 (短期过期) */
  accessToken: string;
  
  /** 🔄 刷新令牌 (长期过期) */
  refreshToken: string;
  
  /** ⏰ 访问令牌过期时间 (秒) */
  expiresIn?: number;
  
  /** 🏷️ 令牌类型 (始终为 'Bearer') */
  tokenType?: 'Bearer';
}

/**
 * 👤 JWT Strategy 使用的用户信息
 * 
 * Passport JWT Strategy 验证后设置到 request.user 的对象
 */
export interface JwtUser {
  /** 🆔 用户 ID (用于 CurrentUser 装饰器) */
  userId: string;
  
  /** 🆔 用户 ID */
  id: string;
  
  /** 📧 邮箱地址 */
  email: string;
  
  /** 👤 用户名 */
  username: string;
  
  /** 👨 名字 */
  firstName?: string;
  
  /** 👨 姓氏 */
  lastName?: string;
  
  /** 🔑 用户角色 */
  role?: UserRole;
  
  /** ✅ 邮箱验证状态 */
  isVerified?: boolean;
  
  /** 🟢 账号激活状态 */
  isActive?: boolean;
}

/**
 * 角色检查辅助函数
 */
export const RoleUtils = {
  /** 检查是否为教师角色 */
  isInstructor: (role?: UserRole): boolean => {
    return ['teacher', 'TEACHER', 'instructor', 'INSTRUCTOR'].includes(role || '');
  },
  
  /** 检查是否为管理员角色 */
  isAdmin: (role?: UserRole): boolean => {
    return ['admin', 'ADMIN'].includes(role || '');
  },
  
  /** 检查是否为学生角色 */
  isStudent: (role?: UserRole): boolean => {
    return ['user', 'USER', 'student', 'STUDENT'].includes(role || '');
  },
  
  /** 检查是否为教师或管理员 */
  canManageCourses: (role?: UserRole): boolean => {
    return RoleUtils.isInstructor(role) || RoleUtils.isAdmin(role);
  }
};
